import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageWorkflow } from "@/config/roleMeta";
import type { Prisma } from "@/generated/prisma/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateReminderRuleBody {
  name?: string;
  enabled?: boolean;
  timesOfDay?: string[];
  notifyAssignee?: boolean;
  notifyManager?: boolean;
  meetingAt?: string | null;
  minutesBefore?: number | null;
  wholeTeam?: boolean;
  audienceUserIds?: string[];
  audienceTeamIds?: string[];
  viaPush?: boolean;
  viaAgentChat?: boolean;
  agentId?: string | null;
  /** Editing a meeting rule's trigger fields means it hasn't "happened" yet — clears the one-shot lock. */
  resetLastRun?: boolean;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: UpdateReminderRuleBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.reminderRule.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Reminder rule not found." }, { status: 404 });

  const data: Prisma.ReminderRuleUpdateInput = {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.enabled !== undefined && { enabled: body.enabled }),
    ...(body.timesOfDay !== undefined && { timesOfDay: body.timesOfDay }),
    ...(body.notifyAssignee !== undefined && { notifyAssignee: body.notifyAssignee }),
    ...(body.notifyManager !== undefined && { notifyManager: body.notifyManager }),
    ...(body.meetingAt !== undefined && { meetingAt: body.meetingAt ? new Date(body.meetingAt) : null }),
    ...(body.minutesBefore !== undefined && { minutesBefore: body.minutesBefore }),
    ...(body.wholeTeam !== undefined && { wholeTeam: body.wholeTeam }),
    ...(body.audienceUserIds !== undefined && { audienceUserIds: body.audienceUserIds }),
    ...(body.audienceTeamIds !== undefined && { audienceTeamIds: body.audienceTeamIds }),
    ...(body.viaPush !== undefined && { viaPush: body.viaPush }),
    ...(body.viaAgentChat !== undefined && { viaAgentChat: body.viaAgentChat }),
    ...(body.agentId !== undefined && { agentId: body.agentId }),
    ...(body.resetLastRun && { lastRunAt: null }),
  };

  const rule = await db.reminderRule.update({ where: { id }, data });
  return NextResponse.json(rule);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.reminderRule.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
