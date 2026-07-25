import { generateId } from "@/lib/id";
import type { Attachment, AttachmentKind } from "@/types/attachment";

const STORAGE_KEY = "evotasks.attachments.v1";
const NETWORK_DELAY_MS = 300;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;

export class ApiError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readAll(): Attachment[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Attachment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: Attachment[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function inferAttachmentKind(mimeType: string): AttachmentKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  ) {
    return "spreadsheet";
  }
  return "file";
}

export async function fetchAttachmentCountsByTask(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const attachment of readAll()) {
    counts[attachment.taskId] = (counts[attachment.taskId] ?? 0) + 1;
  }
  return counts;
}

export async function fetchAttachments(taskId: string): Promise<Attachment[]> {
  await delay(150);
  return readAll()
    .filter((a) => a.taskId === taskId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

interface AddFileInput {
  taskId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  uploadedBy: string;
}

export async function addFileAttachment(input: AddFileInput): Promise<Attachment> {
  await delay(NETWORK_DELAY_MS);
  if (input.sizeBytes > MAX_FILE_BYTES) {
    throw new ApiError(`File is too large (max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB per file in this demo).`);
  }
  const existing = readAll();
  const currentTotal = existing.reduce((sum, a) => sum + a.sizeBytes, 0);
  if (currentTotal + input.sizeBytes > MAX_TOTAL_BYTES) {
    throw new ApiError("Storage limit reached for this demo. Delete some attachments first.");
  }
  const attachment: Attachment = {
    id: generateId("attachment"),
    taskId: input.taskId,
    name: input.name,
    kind: inferAttachmentKind(input.mimeType),
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    dataUrl: input.dataUrl,
    linkUrl: null,
    uploadedBy: input.uploadedBy,
    createdAt: new Date().toISOString(),
  };
  writeAll([...existing, attachment]);
  return attachment;
}

interface AddLinkInput {
  taskId: string;
  name: string;
  linkUrl: string;
  uploadedBy: string;
}

export async function addLinkAttachment(input: AddLinkInput): Promise<Attachment> {
  await delay(200);
  let normalizedUrl = input.linkUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;
  const attachment: Attachment = {
    id: generateId("attachment"),
    taskId: input.taskId,
    name: input.name.trim() || normalizedUrl,
    kind: "link",
    mimeType: "text/uri-list",
    sizeBytes: 0,
    dataUrl: null,
    linkUrl: normalizedUrl,
    uploadedBy: input.uploadedBy,
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), attachment]);
  return attachment;
}

export async function deleteAttachment(id: string): Promise<void> {
  await delay(200);
  writeAll(readAll().filter((a) => a.id !== id));
}

export async function deleteAttachmentsForTask(taskId: string): Promise<void> {
  writeAll(readAll().filter((a) => a.taskId !== taskId));
}
