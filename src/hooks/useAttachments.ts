"use client";

import { useCallback, useEffect, useState } from "react";
import { addFileAttachment, addLinkAttachment, deleteAttachment, fetchAttachments } from "@/services/attachmentApi";
import { useToast } from "@/components/ui/Toast";
import type { Attachment } from "@/types/attachment";

// Requires a concrete taskId — callers with an optional task should key their
// subtree by task.id so this hook remounts (and starts fresh) per task instead
// of needing to branch/reset internally.
export function useAttachments(taskId: string) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    fetchAttachments(taskId).then((list) => {
      if (cancelled) return;
      setAttachments(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const uploadFile = useCallback(
    async (file: File, uploadedBy: string) => {
      try {
        const created = await addFileAttachment({
          taskId,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          file,
          uploadedBy,
        });
        setAttachments((current) => [...current, created]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to upload file.");
      }
    },
    [taskId, toast]
  );

  const addLink = useCallback(
    async (name: string, url: string, uploadedBy: string) => {
      try {
        const created = await addLinkAttachment({ taskId, name, linkUrl: url, uploadedBy });
        setAttachments((current) => [...current, created]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add link.");
      }
    },
    [taskId, toast]
  );

  const removeAttachment = useCallback(
    async (id: string) => {
      const previous = attachments;
      setAttachments((current) => current.filter((a) => a.id !== id));
      try {
        await deleteAttachment(taskId, id);
      } catch (err) {
        setAttachments(previous);
        toast.error(err instanceof Error ? err.message : "Failed to delete attachment.");
      }
    },
    [attachments, taskId, toast]
  );

  return { attachments, loading, uploadFile, addLink, removeAttachment };
}
