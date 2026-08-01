import { db } from "@/lib/db";
import { isOverdue } from "@/lib/date";
import { notifyUser } from "@/lib/notify";
import { sendMessageAsUser } from "@/lib/chatSend";
import type { Conversation, ReminderRule } from "@/generated/prisma/client";

// Reminder times are entered by an admin expecting the org's own wall clock,
// not whatever timezone the host happens to run in — a fixed IANA zone
// (via Intl, which also handles Morocco's own DST changes) avoids both
// depending on the server's local timezone and reimplementing DST rules.
const REMINDER_TIMEZONE = "Africa/Casablanca";
// Rules are considered "already fired for this slot" for this long after
// lastRunAt — must exceed the cron interval (recommended: 5min) so a rule
// can't double-fire from two nearby cron ticks landing in the same window.
const REFIRE_COOLDOWN_MS = 15 * 60 * 1000;
const TIME_MATCH_TOLERANCE_MIN = 5;

function currentOrgMinutesSinceMidnight(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: REMINDER_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function parseTimeOfDay(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

async function findOrCreateDirectConversation(userAId: string, userBId: string): Promise<Conversation> {
  const existing = await db.conversation.findFirst({ where: { type: "direct", participantIds: { hasEvery: [userAId, userBId] } } });
  if (existing && existing.participantIds.length === 2) return existing;
  const now = new Date();
  return db.conversation.create({
    data: {
      type: "direct",
      name: null,
      participantIds: [userAId, userBId],
      avatarDataUrl: null,
      createdBy: userAId,
      lastMessageAt: now,
      lastMessagePreview: null,
      lastReadAt: { [userAId]: now.toISOString() },
    },
  });
}

async function resolveSenderAgent(rule: ReminderRule): Promise<{ id: string; name: string } | null> {
  if (rule.agentId) {
    const agent = await db.user.findUnique({ where: { id: rule.agentId } });
    if (agent?.isAgent) return { id: agent.id, name: agent.name };
  }
  const fallback = await db.user.findFirst({ where: { isAgent: true }, orderBy: { createdAt: "asc" } });
  return fallback ? { id: fallback.id, name: fallback.name } : null;
}

async function deliver(rule: ReminderRule, recipientId: string, title: string, body: string, url: string): Promise<void> {
  if (rule.viaPush) {
    void notifyUser(recipientId, { title, body, url });
  }
  if (rule.viaAgentChat) {
    const agent = await resolveSenderAgent(rule);
    if (agent && agent.id !== recipientId) {
      const conversation = await findOrCreateDirectConversation(agent.id, recipientId);
      void sendMessageAsUser({ conversation, senderId: agent.id, senderName: agent.name, text: body });
    }
  }
}

async function fireOverdueEscalation(rule: ReminderRule): Promise<boolean> {
  const nowMinutes = currentOrgMinutesSinceMidnight(new Date());
  const matchesSlot = rule.timesOfDay.some((time) => {
    const slot = parseTimeOfDay(time);
    return slot !== null && Math.abs(slot - nowMinutes) <= TIME_MATCH_TOLERANCE_MIN;
  });
  if (!matchesSlot) return false;
  if (rule.lastRunAt && Date.now() - rule.lastRunAt.getTime() < REFIRE_COOLDOWN_MS) return false;

  const doneStatuses = await db.statusDef.findMany({ orderBy: { order: "asc" } });
  const doneId = doneStatuses[doneStatuses.length - 1]?.id;
  const items = await db.task.findMany({ where: { dueDate: { not: null }, ...(doneId && { status: { not: doneId } }) } });
  const overdue = items.filter((t) => isOverdue(t.dueDate!.toISOString()));

  const byAssignee = new Map<string, string[]>();
  for (const task of overdue) {
    for (const assigneeId of task.assigneeIds) {
      const list = byAssignee.get(assigneeId) ?? [];
      list.push(task.title);
      byAssignee.set(assigneeId, list);
    }
  }

  for (const [assigneeId, titles] of byAssignee) {
    const summary = titles.length <= 5 ? titles.join(", ") : `${titles.slice(0, 5).join(", ")}, and ${titles.length - 5} more`;
    const body = `You have ${titles.length} overdue task${titles.length > 1 ? "s" : ""}: ${summary}`;
    const recipientIds = new Set<string>();
    if (rule.notifyAssignee) recipientIds.add(assigneeId);
    if (rule.notifyManager) {
      const assignee = await db.user.findUnique({ where: { id: assigneeId } });
      for (const managerId of assignee?.managerIds ?? []) recipientIds.add(managerId);
    }
    for (const recipientId of recipientIds) {
      const isSelf = recipientId === assigneeId;
      const title = isSelf ? "Overdue tasks" : "Overdue tasks (team member)";
      const text = isSelf ? body : `A team member has ${titles.length} overdue task${titles.length > 1 ? "s" : ""}: ${summary}`;
      await deliver(rule, recipientId, title, text, "/overdue");
    }
  }

  await db.reminderRule.update({ where: { id: rule.id }, data: { lastRunAt: new Date() } });
  return true;
}

async function fireMeeting(rule: ReminderRule): Promise<boolean> {
  if (!rule.meetingAt || rule.minutesBefore === null || rule.lastRunAt) return false;
  const triggerAt = new Date(rule.meetingAt.getTime() - rule.minutesBefore * 60 * 1000);
  const now = new Date();
  if (now < triggerAt || now >= rule.meetingAt) return false;

  const audienceIds = new Set<string>();
  if (rule.wholeTeam) {
    const users = await db.user.findMany({ where: { status: "active", isAgent: false }, select: { id: true } });
    for (const u of users) audienceIds.add(u.id);
  } else {
    for (const id of rule.audienceUserIds) audienceIds.add(id);
    if (rule.audienceTeamIds.length > 0) {
      const teams = await db.team.findMany({ where: { id: { in: rule.audienceTeamIds } } });
      for (const team of teams) for (const memberId of team.memberIds) audienceIds.add(memberId);
    }
  }

  const title = `Meeting reminder: ${rule.name}`;
  const body = `"${rule.name}" starts in ${rule.minutesBefore} minutes.`;
  for (const recipientId of audienceIds) {
    await deliver(rule, recipientId, title, body, "/");
  }

  await db.reminderRule.update({ where: { id: rule.id }, data: { lastRunAt: new Date() } });
  return true;
}

/** Single entry point, meant to be called only from the cron route — checks
 * every enabled rule and fires whichever are due. Safe to call repeatedly;
 * each rule debounces itself via `lastRunAt`. */
export async function runDueReminders(): Promise<{ fired: number; checked: number }> {
  const rules = await db.reminderRule.findMany({ where: { enabled: true } });
  let fired = 0;
  for (const rule of rules) {
    try {
      const didFire = rule.kind === "overdue_escalation" ? await fireOverdueEscalation(rule) : rule.kind === "meeting" ? await fireMeeting(rule) : false;
      if (didFire) fired++;
    } catch (err) {
      // One bad rule shouldn't block the others from running.
      console.error(`Reminder rule ${rule.id} failed:`, err);
    }
  }
  return { fired, checked: rules.length };
}
