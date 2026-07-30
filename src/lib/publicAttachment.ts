import type { Attachment as DbAttachment } from "@/generated/prisma/client";
import type { Attachment, AttachmentKind } from "@/types/attachment";

export function toPublicAttachment(attachment: DbAttachment): Attachment {
  return {
    id: attachment.id,
    taskId: attachment.taskId,
    name: attachment.name,
    kind: attachment.kind as AttachmentKind,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    dataUrl: attachment.url,
    linkUrl: attachment.linkUrl,
    uploadedBy: attachment.uploadedBy,
    createdAt: attachment.createdAt.toISOString(),
  };
}
