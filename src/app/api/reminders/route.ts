import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageWorkflow } from "@/config/roleMeta";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await db.reminderRule.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(rules);
}

interface CreateReminderRuleBody {
  name: string;
  kind: "overdue_escalation" | "meeting";
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
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: CreateReminderRuleBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (body.kind !== "overdue_escalation" && body.kind !== "meeting") {
    return NextResponse.json({ error: "Invalid kind." }, { status: 400 });
  }

  const rule = await db.reminderRule.create({
    data: {
      name,
      kind: body.kind,
      enabled: body.enabled ?? true,
      timesOfDay: body.timesOfDay ?? [],
      notifyAssignee: body.notifyAssignee ?? true,
      notifyManager: body.notifyManager ?? true,
      meetingAt: body.meetingAt ? new Date(body.meetingAt) : null,
      minutesBefore: body.minutesBefore ?? null,
      wholeTeam: body.wholeTeam ?? false,
      audienceUserIds: body.audienceUserIds ?? [],
      audienceTeamIds: body.audienceTeamIds ?? [],
      viaPush: body.viaPush ?? true,
      viaAgentChat: body.viaAgentChat ?? true,
      agentId: body.agentId ?? null,
      createdBy: sessionUser.id,
    },
  });
  return NextResponse.json(rule, { status: 201 });
}
