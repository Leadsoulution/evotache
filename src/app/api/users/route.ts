import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/publicUser";
import { syncTeamMembership } from "@/lib/teamSync";
import { canManageUsers } from "@/config/roleMeta";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/types/user";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(users.map(toPublicUser));
}

interface CreateUserBody {
  name: string;
  email: string;
  password: string;
  role: Role;
  color: string;
  photoDataUrl?: string | null;
  managerIds?: string[];
  teamIds?: string[];
  visibleSectionHrefs?: string[] | null;
  hiddenColumnIds?: string[];
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: CreateUserBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const normalizedEmail = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  if (!normalizedEmail || !name) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await db.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role: body.role,
      color: body.color,
      photoDataUrl: body.photoDataUrl ?? null,
      status: "active",
      managerIds: body.managerIds ?? [],
      visibleSectionHrefs: body.visibleSectionHrefs ?? Prisma.JsonNull,
      hiddenColumnIds: body.hiddenColumnIds ?? [],
    },
  });

  if (body.teamIds?.length) await syncTeamMembership(user.id, body.teamIds);

  return NextResponse.json(toPublicUser(user), { status: 201 });
}
