import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicAttachment } from "@/lib/publicAttachment";
import type { AttachmentKind } from "@/types/attachment";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;
  const attachments = await db.attachment.findMany({ where: { taskId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(attachments.map(toPublicAttachment));
}

interface CreateAttachmentBody {
  name: string;
  kind: AttachmentKind;
  mimeType: string;
  sizeBytes: number;
  url?: string | null;
  linkUrl?: string | null;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;
  let body: CreateAttachmentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const attachment = await db.attachment.create({
    data: {
      taskId,
      name,
      kind: body.kind,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes ?? 0,
      url: body.url ?? null,
      linkUrl: body.linkUrl ?? null,
      uploadedBy: sessionUser.id,
    },
  });
  return NextResponse.json(toPublicAttachment(attachment), { status: 201 });
}
