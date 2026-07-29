import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicAgent } from "@/lib/publicAgent";
import { canManageUsers } from "@/config/roleMeta";
import type { AgentKind, AgentTool } from "@/types/agent";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const agents = await db.user.findMany({ where: { isAgent: true }, include: { agentConfig: true }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(agents.filter((a) => a.agentConfig).map((a) => toPublicAgent(a, a.agentConfig!)));
}

interface CreateAgentBody {
  name: string;
  email: string;
  color: string;
  photoDataUrl?: string | null;
  kind: AgentKind;
  systemPrompt: string;
  enabledTools: AgentTool[];
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: CreateAgentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const normalizedEmail = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  if (!normalizedEmail || !name) return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  if (body.kind !== "internal" && body.kind !== "external") return NextResponse.json({ error: "A valid kind is required." }, { status: 400 });

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });

  // Agents never authenticate with a password (blocked in the login route) —
  // this hash is unusable, it just satisfies the non-null column.
  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);

  const user = await db.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role: "member",
      color: body.color,
      photoDataUrl: body.photoDataUrl ?? null,
      status: "active",
      isAgent: true,
      agentConfig: {
        create: {
          kind: body.kind,
          systemPrompt: (body.systemPrompt ?? "").trim(),
          enabledTools: body.enabledTools ?? [],
        },
      },
    },
    include: { agentConfig: true },
  });

  return NextResponse.json(toPublicAgent(user, user.agentConfig!), { status: 201 });
}
