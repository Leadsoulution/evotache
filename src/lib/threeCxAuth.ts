import { db } from "@/lib/db";

// 3CX's own web client's fixed public client_id — confirmed live by
// capturing its real /connect/token request via DevTools (it uses
// grant_type=password to log in and grant_type=refresh_token to renew,
// not client_credentials as an earlier community example suggested).
const CLIENT_ID = "Webclient";

interface TokenResponse {
  access_token: string;
  refresh_token: string | null;
  expires_in: number;
}

async function requestToken(pbxUrl: string, params: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(`${pbxUrl}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...params }),
  });
  if (!response.ok) throw new Error(`3CX authentication failed (${response.status}): ${await response.text()}`);
  return response.json();
}

function login(pbxUrl: string, username: string, password: string): Promise<TokenResponse> {
  return requestToken(pbxUrl, { grant_type: "password", username, password });
}

function refresh(pbxUrl: string, refreshToken: string): Promise<TokenResponse> {
  return requestToken(pbxUrl, { grant_type: "refresh_token", refresh_token: refreshToken });
}

/** Saves the connection, but only after confirming the credentials
 * actually work — a bad password fails immediately here instead of
 * silently saving something that'll only break on the next sync. */
export async function setThreeCxConnection(pbxUrl: string, username: string, password: string, connectedBy: string): Promise<void> {
  const normalizedUrl = pbxUrl.replace(/\/+$/, "");
  const tokens = await login(normalizedUrl, username, password);

  const data = {
    pbxUrl: normalizedUrl,
    username,
    password,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  };
  const existing = await db.threeCxConnection.findFirst();
  if (existing) {
    await db.threeCxConnection.update({ where: { id: existing.id }, data });
  } else {
    await db.threeCxConnection.create({ data: { ...data, connectedBy } });
  }
}

/** Every XAPI call goes through this — returns a guaranteed-valid access
 * token, refreshing (or re-logging in, if the refresh token itself has
 * gone stale) first if the cached one is expired or about to be. */
export async function getValidAccessToken(): Promise<{ pbxUrl: string; accessToken: string }> {
  const connection = await db.threeCxConnection.findFirst();
  if (!connection) throw new Error("3CX isn't connected — connect it from the Calls page first.");
  const expiresSoon = !connection.tokenExpiresAt || connection.tokenExpiresAt.getTime() - Date.now() < 60_000;
  if (!expiresSoon && connection.accessToken) return { pbxUrl: connection.pbxUrl, accessToken: connection.accessToken };

  let tokens: TokenResponse;
  try {
    if (!connection.refreshToken) throw new Error("no refresh token stored");
    tokens = await refresh(connection.pbxUrl, connection.refreshToken);
  } catch {
    tokens = await login(connection.pbxUrl, connection.username, connection.password);
  }
  await db.threeCxConnection.update({
    where: { id: connection.id },
    data: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000) },
  });
  return { pbxUrl: connection.pbxUrl, accessToken: tokens.access_token };
}

export interface ThreeCxStatus {
  connected: boolean;
  pbxUrl: string | null;
  username: string | null;
}

export async function getThreeCxStatus(): Promise<ThreeCxStatus> {
  const connection = await db.threeCxConnection.findFirst();
  if (!connection) return { connected: false, pbxUrl: null, username: null };
  return { connected: true, pbxUrl: connection.pbxUrl, username: connection.username };
}

export async function disconnectThreeCx(): Promise<void> {
  await db.threeCxConnection.deleteMany();
}
