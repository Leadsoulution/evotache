import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import type { AgentReportType } from "@/types/agent";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function withRecipientName(schedules: { recipientId: string }[]) {
  const recipientIds = Array.from(new Set(schedules.map((s) => s.recipientId)));
  const recipients = await db.user.findMany({ where: { id: { in: recipientIds } }, select: { id: true, name: true } });
  const nameById = new Map(recipients.map((r) => [r.id, r.name]));
  return schedules.map((s) => ({ ...s, recipientName: nameById.get(s.recipientId) ?? "Unknown" }));
}

export async function GET(_request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const schedules = await db.agentReportSchedule.findMany({ where: { agentId: id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(await withRecipientName(schedules));
}

interface CreateReportScheduleBody {
  recipientId: string;
  timesOfDay: string[];
  reportTypes: AgentReportType[];
}

const TIME_PATTERN = /^\d{2}:\d{2}$/;
const VALID_REPORT_TYPES: AgentReportType[] = ["calls_unhandled", "biometric_today"];

export async function POST(request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: CreateReportScheduleBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const recipientId = (body.recipientId ?? "").trim();
  if (!recipientId) return NextResponse.json({ error: "recipientId is required." }, { status: 400 });
  const recipient = await db.user.findUnique({ where: { id: recipientId } });
  if (!recipient) return NextResponse.json({ error: "Recipient not found." }, { status: 404 });

  const timesOfDay = Array.isArray(body.timesOfDay) ? body.timesOfDay.filter((t) => TIME_PATTERN.test(t)) : [];
  if (timesOfDay.length === 0) return NextResponse.json({ error: "At least one valid \"HH:mm\" time is required." }, { status: 400 });

  const reportTypes = Array.isArray(body.reportTypes) ? body.reportTypes.filter((t) => VALID_REPORT_TYPES.includes(t)) : [];
  if (reportTypes.length === 0) return NextResponse.json({ error: "At least one report type is required." }, { status: 400 });

  const agentConfig = await db.agentConfig.findUnique({ where: { userId: id } });
  if (!agentConfig) return NextResponse.json({ error: "Agent not found." }, { status: 404 });

  const schedule = await db.agentReportSchedule.create({ data: { agentId: id, recipientId, timesOfDay, reportTypes } });
  const [withName] = await withRecipientName([schedule]);
  return NextResponse.json(withName, { status: 201 });
}
