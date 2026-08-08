// Meta WhatsApp Cloud API (Graph API) — official, free-tier-friendly,
// unlike Twilio's paid reseller layer on top of the same underlying API.
const GRAPH_VERSION = "v21.0";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function phoneNumberId(): string {
  return requireEnv("WHATSAPP_PHONE_NUMBER_ID");
}

function accessToken(): string {
  return requireEnv("WHATSAPP_ACCESS_TOKEN");
}

async function graphFetch(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken()}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`WhatsApp API ${path} failed: ${data?.error?.message ?? response.statusText}`);
  return data;
}

// WhatsApp's own markdown-lite is even more limited than Telegram's —
// *bold*, _italic_, ~strikethrough~, ```monospace``` only, no links syntax
// (raw URLs auto-link), no headings/tables/real lists — parse_mode isn't a
// concept here, it just always interprets these markers.
export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  await graphFetch(`${phoneNumberId()}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
}

/** Two-step download per Meta's API: resolve the media id to a short-lived
 * signed URL, then fetch the actual bytes from that URL (still needs the
 * same bearer token). */
export async function downloadWhatsAppMedia(mediaId: string): Promise<Blob> {
  const meta = (await graphFetch(mediaId)) as { url?: string };
  if (!meta.url) throw new Error("WhatsApp media lookup returned no url.");
  const response = await fetch(meta.url, { headers: { Authorization: `Bearer ${accessToken()}` } });
  if (!response.ok) throw new Error(`Failed to download WhatsApp media (${response.status}).`);
  return response.blob();
}

export interface WhatsAppStatus {
  configured: boolean;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  error: string | null;
}

/** For the admin status card — confirms the configured token/number
 * actually resolve to a real WhatsApp Business phone number, the same
 * "does this actually work" check getBotInfo() does for Telegram. Unlike
 * Telegram, the webhook itself can't be registered via API — Meta only
 * accepts that through the App dashboard UI, so there's no equivalent of
 * registerWebhook() here. */
export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return { configured: false, displayPhoneNumber: null, verifiedName: null, error: null };
  }
  try {
    const data = (await graphFetch(`${phoneNumberId()}?fields=display_phone_number,verified_name`)) as {
      display_phone_number?: string;
      verified_name?: string;
    };
    return { configured: true, displayPhoneNumber: data.display_phone_number ?? null, verifiedName: data.verified_name ?? null, error: null };
  } catch (err) {
    return { configured: true, displayPhoneNumber: null, verifiedName: null, error: err instanceof Error ? err.message : "Failed to reach WhatsApp." };
  }
}
