import { uploadFile as uploadToStorage } from "@/services/uploadApi";
import type { Attachment, AttachmentKind } from "@/types/attachment";

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

export function inferAttachmentKind(mimeType: string): AttachmentKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv") return "spreadsheet";
  return "file";
}

export async function fetchAttachmentCountsByTask(): Promise<Record<string, number>> {
  const response = await fetch("/api/attachments/counts");
  if (!response.ok) return {};
  return response.json();
}

export async function fetchAttachments(taskId: string): Promise<Attachment[]> {
  const response = await fetch(`/api/tasks/${taskId}/attachments`);
  if (!response.ok) return [];
  return response.json();
}

interface AddFileInput {
  taskId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  file: File;
  uploadedBy: string;
}

export async function addFileAttachment(input: AddFileInput): Promise<Attachment> {
  const url = await uploadToStorage(input.file, "attachments");
  const response = await fetch(`/api/tasks/${input.taskId}/attachments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      kind: inferAttachmentKind(input.mimeType),
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      url,
    }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

interface AddLinkInput {
  taskId: string;
  name: string;
  linkUrl: string;
  uploadedBy: string;
}

export async function addLinkAttachment(input: AddLinkInput): Promise<Attachment> {
  let normalizedUrl = input.linkUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;
  const response = await fetch(`/api/tasks/${input.taskId}/attachments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name.trim() || normalizedUrl,
      kind: "link",
      mimeType: "text/uri-list",
      sizeBytes: 0,
      linkUrl: normalizedUrl,
    }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteAttachment(taskId: string, id: string): Promise<void> {
  const response = await fetch(`/api/tasks/${taskId}/attachments/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}
