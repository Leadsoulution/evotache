import { db } from "@/lib/db";

// 3CX's own web client's fixed public client_id, used for the
// refresh_token grant — confirmed live by capturing its real
// /connect/token refresh request via DevTools.
const CLIENT_ID = "Webclient";

/** Node's fetch() throws a bare "TypeError: fetch failed" for any network-
 * level failure (DNS, TLS, connection refused/timeout) — the actually
 * useful detail lives in `err.cause`, which the default Error.message
 * doesn't surface. Wrapping every 3CX call in this turns that into a
 * message that names the host and the real cause, instead of a mystery
 * "fetch failed" toast. */
export async function fetchThreeCx(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : err instanceof Error ? err.message : String(err);
    let host = url;
    try {
      host = new URL(url).host;
    } catch {
      // keep the raw url if it somehow isn't a valid URL
    }
    throw new Error(`Impossible de joindre le PBX 3CX (${host}) : ${cause}`);
  }
}

interface TokenPayload {
  access_token: string;
  refresh_token: string | null;
  expires_in: number;
}

interface LoginResponse {
  Status: string;
  Token: TokenPayload | null;
}

/** Initial login goes through 3CX's own web-client login endpoint (JSON
 * body, not the standard OAuth /connect/token) — confirmed live by
 * capturing the real request the 3CX web client itself sends when
 * logging in with a username/password. */
async function login(pbxUrl: string, username: string, password: string): Promise<TokenPayload> {
  const response = await fetchThreeCx(`${pbxUrl}/webclient/api/Login/GetAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Username: username, Password: password, SecurityCode: "", ReCaptchaResponse: null }),
  });
  if (!response.ok) throw new Error(`3CX authentication failed (${response.status}): ${await response.text()}`);
  const data = (await response.json()) as LoginResponse;
  if (data.Status !== "AuthSuccess" || !data.Token) throw new Error(`3CX login failed: ${data.Status}`);
  return data.Token;
}

/** Renewing a token, once logged in, DOES use the standard OAuth
 * /connect/token endpoint with grant_type=refresh_token — confirmed live
 * the same way. */
async function refresh(pbxUrl: string, refreshToken: string): Promise<TokenPayload> {
  const response = await fetchThreeCx(`${pbxUrl}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!response.ok) throw new Error(`3CX token refresh failed (${response.status}): ${await response.text()}`);
  return response.json();
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

  let tokens: TokenPayload;
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
