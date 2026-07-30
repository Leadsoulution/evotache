import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicLibraryDoc } from "@/lib/publicLibrary";
import { canManageWorkflow } from "@/config/roleMeta";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const docs = await db.libraryDoc.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(docs.map(toPublicLibraryDoc));
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { title?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

  const count = await db.libraryDoc.count();
  const doc = await db.libraryDoc.create({ data: { title, content: body.content ?? "", order: count } });
  return NextResponse.json(toPublicLibraryDoc(doc), { status: 201 });
}
