export type AttachmentKind = "image" | "video" | "pdf" | "spreadsheet" | "file" | "link";

export interface Attachment {
  id: string;
  taskId: string;
  name: string;
  kind: AttachmentKind;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string | null;
  linkUrl: string | null;
  uploadedBy: string;
  createdAt: string;
}
