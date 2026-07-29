import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import type { CustomFieldOption, CustomFieldType } from "@/types/customField";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const fields = await db.customFieldDef.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(fields);
}

interface CreateFieldBody {
  name: string;
  type: CustomFieldType;
  options: CustomFieldOption[];
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: CreateFieldBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Field name is required." }, { status: 400 });

  const count = await db.customFieldDef.count();
  const field = await db.customFieldDef.create({
    data: {
      name,
      type: body.type,
      options: (body.type === "select" ? (body.options ?? []).filter((o) => o.label.trim()) : []) as unknown as Prisma.InputJsonValue,
      order: count,
    },
  });
  return NextResponse.json(field, { status: 201 });
}
