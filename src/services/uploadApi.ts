export class ApiError extends Error {}

export type UploadFolder = "avatars" | "logos" | "chat" | "custom-fields" | "purchases" | "attachments";

/** Uploads a file to Supabase Storage via the server (the service key never
 * reaches the client) and returns its public URL. Shared by every upload flow
 * in the app — user/agent photos, project logos, group avatars, chat
 * attachments, custom-field and purchase-column images/videos, and task
 * attachments. */
export async function uploadFile(file: File, folder: UploadFolder): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  const response = await fetch("/api/uploads", { method: "POST", body: formData });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error ?? "Upload failed.");
  }
  const { url } = await response.json();
  return url;
}
