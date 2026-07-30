import { createClient } from "@supabase/supabase-js";

const BUCKET = "evotasks-files";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase Storage is not configured (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY missing).");
  return createClient(url, key);
}

/** Uploads a file to the shared public bucket under `folder/` with a random,
 * unguessable filename, and returns its public URL. Public + unguessable
 * paths match the app's existing security posture (these values were already
 * returned in full to any authenticated user via the JSON API) without the
 * extra complexity of signed URLs. */
export async function uploadFile(buffer: Buffer, folder: string, contentType: string, extension: string): Promise<string> {
  const path = `${folder}/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;
  const supabase = getClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Deletes a file given its public URL (or a bare storage path). No-ops on
 * URLs that aren't from our bucket (e.g. legacy base64 data URLs still
 * present until the backfill script runs). */
export async function deleteFile(urlOrPath: string): Promise<void> {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = urlOrPath.indexOf(marker);
  const path = index === -1 ? urlOrPath : urlOrPath.slice(index + marker.length);
  if (!path || path.startsWith("data:")) return;
  const supabase = getClient();
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}
