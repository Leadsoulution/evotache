import { db } from "@/lib/db";
import { sendMessageAsUser } from "@/lib/chatSend";
import { toPublicPhoneCall } from "@/lib/publicPhoneCall";
import { computeHandledMissedCalls } from "@/lib/callStats";
import { toPublicBiometricEvent } from "@/lib/publicBiometricEvent";
import { computeDailyAttendance, deriveEmployees, formatLateDuration, getAbsentEmployees, getPresentEmployees } from "@/lib/biometricStats";
import { casablancaDateKey, casablancaTimeString } from "@/lib/casablancaTime";
import type { AgentReportSchedule, Conversation } from "@/generated/prisma/client";

const DEFAULT_BIOMETRIC_SCHEDULE = { startTime: "09:30", endTime: "19:00", fridayBreakStart: "13:00", fridayBreakEnd: "15:00" };
// Must exceed the cron interval so a schedule can't double-fire from two
// nearby cron ticks landing in the same window — same reasoning/values as
// reminders.ts's REFIRE_COOLDOWN_MS/TIME_MATCH_TOLERANCE_MIN, since two
// fixed times a day (e.g. 10:30 & 20:30) need the same debounce shape.
const REFIRE_COOLDOWN_MS = 15 * 60 * 1000;
const TIME_MATCH_TOLERANCE_MIN = 5;

function currentCasablancaMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Casablanca", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
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

async function buildCallsUnhandledReport(): Promise<string> {
  const todayKey = casablancaDateKey(new Date());
  const rows = await db.phoneCall.findMany({ orderBy: { startTime: "desc" }, take: 5000 });
  const calls = rows.map(toPublicPhoneCall);
  // Full history, not just today's calls — a callback just past midnight
  // still needs to be seen to correctly mark yesterday's tail-end missed
  // calls as handled (same reasoning as computeHandledMissedCalls's own doc).
  const handled = computeHandledMissedCalls(calls);
  const todays = calls.filter((c) => casablancaDateKey(c.startTime) === todayKey);
  const unhandled = todays.filter((c) => c.direction === "Inbound" && c.status === "Unanswered" && !handled.has(c.id));

  if (unhandled.length === 0) return `📵 **Appels manqués non traités — ${todayKey}**\nAucun.`;
  const lines = unhandled.map((c) => `- ${c.sourceName || c.sourceNumber} à ${casablancaTimeString(c.startTime)}`);
  return `📵 **Appels manqués non traités — ${todayKey}** (${unhandled.length})\n${lines.join("\n")}`;
}

async function buildBiometricReport(): Promise<string> {
  const todayKey = casablancaDateKey(new Date());
  const [rows, overrides, scheduleRow] = await Promise.all([
    db.biometricEvent.findMany({ orderBy: { punchTime: "desc" }, take: 5000 }),
    db.biometricEmployeeOverride.findMany(),
    db.biometricSchedule.findFirst(),
  ]);
  const events = rows.map(toPublicBiometricEvent);
  const schedule = scheduleRow ?? DEFAULT_BIOMETRIC_SCHEDULE;
  const employees = deriveEmployees(events, overrides);
  const dayEvents = events.filter((e) => casablancaDateKey(e.punchTime) === todayKey);

  const present = getPresentEmployees(dayEvents, employees);
  const absent = getAbsentEmployees(employees, dayEvents);
  const lateRows = computeDailyAttendance(dayEvents, employees, schedule).filter((r) => r.isLate);

  const lines = [
    `🖐️ **Rapport biométrique — ${todayKey}**`,
    `Présents (${present.length}) : ${present.map((p) => p.name).join(", ") || "—"}`,
    `Absents (${absent.length}) : ${absent.map((a) => a.name).join(", ") || "—"}`,
    `En retard (${lateRows.length})${lateRows.length ? " :" : ""}`,
  ];
  for (const row of lateRows) lines.push(`- ${row.name} : ${formatLateDuration(row.lateSeconds)}`);
  return lines.join("\n");
}

async function fireSchedule(schedule: AgentReportSchedule): Promise<boolean> {
  const nowMinutes = currentCasablancaMinutes(new Date());
  const matchesSlot = schedule.timesOfDay.some((time) => {
    const slot = parseTimeOfDay(time);
    return slot !== null && Math.abs(slot - nowMinutes) <= TIME_MATCH_TOLERANCE_MIN;
  });
  if (!matchesSlot) return false;
  if (schedule.lastRunAt && Date.now() - schedule.lastRunAt.getTime() < REFIRE_COOLDOWN_MS) return false;

  const agent = await db.user.findUnique({ where: { id: schedule.agentId } });
  if (!agent?.isAgent) return false;

  const sections: string[] = [];
  if (schedule.reportTypes.includes("calls_unhandled")) sections.push(await buildCallsUnhandledReport());
  if (schedule.reportTypes.includes("biometric_today")) sections.push(await buildBiometricReport());
  if (sections.length === 0) return false;

  const conversation = await findOrCreateDirectConversation(agent.id, schedule.recipientId);
  await sendMessageAsUser({ conversation, senderId: agent.id, senderName: agent.name, text: sections.join("\n\n") });

  await db.agentReportSchedule.update({ where: { id: schedule.id }, data: { lastRunAt: new Date() } });
  return true;
}

/** Single entry point, meant to be called only from the cron route — checks
 * every enabled schedule and fires whichever are due. Safe to call
 * repeatedly; each schedule debounces itself via lastRunAt, same pattern
 * as runDueReminders(). */
export async function runDueAgentReportSchedules(): Promise<{ fired: number; checked: number }> {
  const schedules = await db.agentReportSchedule.findMany({ where: { enabled: true } });
  let fired = 0;
  for (const schedule of schedules) {
    try {
      if (await fireSchedule(schedule)) fired++;
    } catch (err) {
      console.error(`Agent report schedule ${schedule.id} failed:`, err);
    }
  }
  return { fired, checked: schedules.length };
}
