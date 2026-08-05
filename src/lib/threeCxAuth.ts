import { db } from "@/lib/db";

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

async function requestToken(pbxUrl: string, username: string, password: string): Promise<TokenResponse> {
  const response = await fetch(`${pbxUrl}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: username, client_secret: password }),
  });
  if (!response.ok) throw new Error(`3CX authentication failed (${response.status}): ${await response.text()}`);
  return response.json();
}

/** Saves the connection, but only after confirming the credentials
 * actually work — a bad password fails immediately here instead of
 * silently saving something that'll only break on the next sync. */
export async function setThreeCxConnection(pbxUrl: string, username: string, password: string, connectedBy: string): Promise<void> {
  const normalizedUrl = pbxUrl.replace(/\/+$/, "");
  const tokens = await requestToken(normalizedUrl, username, password);

  const data = {
    pbxUrl: normalizedUrl,
    username,
    password,
    accessToken: tokens.access_token,
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
 * token, re-authenticating first if it's expired or about to be. Unlike
 * Google/Meta's refresh-token model, 3CX's client_credentials grant just
 * re-uses the same username/password each time (no separate refresh step). */
export async function getValidAccessToken(): Promise<{ pbxUrl: string; accessToken: string }> {
  const connection = await db.threeCxConnection.findFirst();
  if (!connection) throw new Error("3CX isn't connected — connect it from the Calls page first.");
  const expiresSoon = !connection.tokenExpiresAt || connection.tokenExpiresAt.getTime() - Date.now() < 60_000;
  if (!expiresSoon && connection.accessToken) return { pbxUrl: connection.pbxUrl, accessToken: connection.accessToken };

  const tokens = await requestToken(connection.pbxUrl, connection.username, connection.password);
  await db.threeCxConnection.update({
    where: { id: connection.id },
    data: { accessToken: tokens.access_token, tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000) },
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
