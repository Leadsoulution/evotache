import type { LibraryDoc as DbLibraryDoc } from "@/generated/prisma/client";
import type { LibraryDoc } from "@/types/library";

export function toPublicLibraryDoc(doc: DbLibraryDoc): LibraryDoc {
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    order: doc.order,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
