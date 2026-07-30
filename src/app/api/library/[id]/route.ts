import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicLibraryDoc } from "@/lib/publicLibrary";
import { canManageWorkflow } from "@/config/roleMeta";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: { title?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.libraryDoc.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const doc = await db.libraryDoc.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
    },
  });
  return NextResponse.json(toPublicLibraryDoc(doc));
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.libraryDoc.delete({ where: { id } }).catch(() => {});
  const remaining = await db.libraryDoc.findMany({ orderBy: { order: "asc" } });
  await Promise.all(remaining.map((doc, index) => db.libraryDoc.update({ where: { id: doc.id }, data: { order: index } })));
  return NextResponse.json({ ok: true });
}
