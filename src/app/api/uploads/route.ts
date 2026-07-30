import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

const MAX_BYTES_BY_FOLDER: Record<string, number> = {
  avatars: 2 * 1024 * 1024,
  logos: 2 * 1024 * 1024,
  chat: 6 * 1024 * 1024,
  "custom-fields": 2 * 1024 * 1024,
  purchases: 2 * 1024 * 1024,
  attachments: 2 * 1024 * 1024,
};

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5 && /^[a-zA-Z0-9]+$/.test(fromName)) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return fromType && /^[a-zA-Z0-9]+$/.test(fromType) ? fromType.toLowerCase() : "";
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  const folder = formData.get("folder");
  if (!(file instanceof File) || typeof folder !== "string") {
    return NextResponse.json({ error: "A file and folder are required." }, { status: 400 });
  }
  const maxBytes = MAX_BYTES_BY_FOLDER[folder];
  if (!maxBytes) return NextResponse.json({ error: "Unknown upload folder." }, { status: 400 });
  if (file.size > maxBytes) {
    return NextResponse.json({ error: `File is too large (max ${Math.round(maxBytes / 1024 / 1024)}MB).` }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadFile(buffer, folder, file.type || "application/octet-stream", extensionFor(file));
    return NextResponse.json({ url }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed." }, { status: 502 });
  }
}
