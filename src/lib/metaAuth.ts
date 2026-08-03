import { db } from "@/lib/db";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const REDIRECT_URI = "https://evotasks.app/api/integrations/meta/callback";
const SCOPES = ["ads_read"];
// Re-exchange the long-lived token for a fresh one once it's within this
// window of expiring — Meta has no separate refresh token, the long-lived
// token (~60 days) just re-exchanges itself for another ~60-day one.
const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface TokenResponse {
  access_token: string;
  expires_in?: number;
}

export function getMetaAuthUrl(): string {
  const appId = process.env.META_APP_ID;
  if (!appId) throw new Error("META_APP_ID is not configured.");
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(","),
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

async function exchangeForLongLivedToken(shortLivedToken: string): Promise<TokenResponse> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new Error("Meta OAuth isn't configured.");
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const response = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!response.ok) throw new Error(`Meta token exchange failed: ${await response.text()}`);
  return response.json();
}

/** Exchanges an OAuth code for a short-lived token, immediately upgrades it
 * to a long-lived one (~60 days), resolves the connected account's display
 * name, and upserts the single shared MetaConnection row. */
export async function exchangeCodeForToken(code: string): Promise<void> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new Error("Meta OAuth isn't configured.");

  const params = new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: REDIRECT_URI, code });
  const shortLivedResponse = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!shortLivedResponse.ok) throw new Error(`Meta code exchange failed: ${await shortLivedResponse.text()}`);
  const shortLived = (await shortLivedResponse.json()) as TokenResponse;

  const longLived = await exchangeForLongLivedToken(shortLived.access_token);

  const meResponse = await fetch(`${GRAPH_BASE}/me?fields=name&access_token=${longLived.access_token}`);
  if (!meResponse.ok) throw new Error("Failed to resolve the connected Meta account's name.");
  const me = (await meResponse.json()) as { name: string };

  const expiresAt = new Date(Date.now() + (longLived.expires_in ?? 60 * 24 * 60 * 60) * 1000);
  const existing = await db.metaConnection.findFirst();
  const data = { accountName: me.name, accessToken: longLived.access_token, expiresAt };
  if (existing) {
    await db.metaConnection.update({ where: { id: existing.id }, data });
  } else {
    await db.metaConnection.create({ data: { ...data, connectedBy: me.name } });
  }
}

/** Every Marketing API call goes through this — refreshes the long-lived
 * token if it's within REFRESH_WINDOW_MS of expiring, then returns a
 * usable token. Running this from the periodic sync job (rather than only
 * on-demand) is what keeps the connection alive indefinitely without ever
 * requiring the admin to manually reconnect. */
export async function getValidAccessToken(): Promise<string> {
  const connection = await db.metaConnection.findFirst();
  if (!connection) throw new Error("Meta isn't connected — ask an admin to connect it from the Ads page.");

  const expiresSoon = connection.expiresAt.getTime() - Date.now() < REFRESH_WINDOW_MS;
  if (!expiresSoon) return connection.accessToken;

  const refreshed = await exchangeForLongLivedToken(connection.accessToken);
  const expiresAt = new Date(Date.now() + (refreshed.expires_in ?? 60 * 24 * 60 * 60) * 1000);
  await db.metaConnection.update({ where: { id: connection.id }, data: { accessToken: refreshed.access_token, expiresAt } });
  return refreshed.access_token;
}

export interface MetaConnectionStatus {
  connected: boolean;
  accountName: string | null;
  expiresAt: string | null;
}

export async function getMetaConnectionStatus(): Promise<MetaConnectionStatus> {
  const connection = await db.metaConnection.findFirst();
  if (!connection) return { connected: false, accountName: null, expiresAt: null };
  return { connected: true, accountName: connection.accountName, expiresAt: connection.expiresAt.toISOString() };
}

export async function disconnectMeta(): Promise<void> {
  await db.metaConnection.deleteMany();
}
