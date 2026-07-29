import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicAgent } from "@/lib/publicAgent";
import { canManageUsers } from "@/config/roleMeta";
import type { AgentKind, AgentTool } from "@/types/agent";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateAgentBody {
  name?: string;
  email?: string;
  color?: string;
  photoDataUrl?: string | null;
  kind?: AgentKind;
  systemPrompt?: string;
  enabledTools?: AgentTool[];
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: UpdateAgentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { id }, include: { agentConfig: true } });
  if (!existing || !existing.isAgent || !existing.agentConfig) return NextResponse.json({ error: "Agent not found." }, { status: 404 });

  const user = await db.user.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.email !== undefined && { email: body.email.trim().toLowerCase() }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.photoDataUrl !== undefined && { photoDataUrl: body.photoDataUrl }),
      agentConfig: {
        update: {
          ...(body.kind !== undefined && { kind: body.kind }),
          ...(body.systemPrompt !== undefined && { systemPrompt: body.systemPrompt }),
          ...(body.enabledTools !== undefined && { enabledTools: body.enabledTools }),
        },
      },
    },
    include: { agentConfig: true },
  });

  return NextResponse.json(toPublicAgent(user, user.agentConfig!));
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.agentSchedule.deleteMany({ where: { agentId: id } });
  await db.agentActionLog.deleteMany({ where: { agentId: id } });
  await db.agentIntegration.deleteMany({ where: { agentId: id } });
  // agentConfig cascades via the User relation's onDelete: Cascade.
  await db.user.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
