import { db } from "@/lib/db";

/** ZKBio Time (the biometric fingerprint clock's software) throws a bare
 * "TypeError: fetch failed" for any network-level failure — same issue
 * fixed for 3CX in threeCxAuth.ts's fetchThreeCx. Same fix here: surface
 * the host and the real cause (err.cause) instead of the generic message. */
async function fetchBiometric(url: string, init?: RequestInit): Promise<Response> {
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
    throw new Error(`Impossible de joindre le serveur biométrique (${host}) : ${cause}`);
  }
}

async function login(baseUrl: string, username: string, password: string): Promise<string> {
  const response = await fetchBiometric(`${baseUrl}/api-token-auth/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error(`Authentification biométrique échouée (${response.status}): ${await response.text()}`);
  const data = (await response.json()) as { token?: string };
  if (!data.token) throw new Error("Authentification biométrique échouée : aucun token reçu.");
  return data.token;
}

/** Saves the connection, but only after confirming the credentials
 * actually work — a bad password fails immediately here instead of
 * silently saving something that'll only break on the next sync. */
export async function setBiometricConnection(baseUrl: string, username: string, password: string, connectedBy: string): Promise<void> {
  const normalizedUrl = baseUrl.replace(/\/+$/, "");
  const token = await login(normalizedUrl, username, password);

  const data = { baseUrl: normalizedUrl, username, password, token };
  const existing = await db.biometricConnection.findFirst();
  if (existing) await db.biometricConnection.update({ where: { id: existing.id }, data });
  else await db.biometricConnection.create({ data: { ...data, connectedBy } });
}

/** No documented refresh/expiry for this API's token, so authorizedFetch
 * just uses the cached token and, on a 401, re-logs-in once and retries —
 * rather than tracking an expiry that isn't actually documented anywhere. */
export async function authorizedFetch(path: string, init?: RequestInit): Promise<Response> {
  const connection = await db.biometricConnection.findFirst();
  if (!connection) throw new Error("Le système biométrique n'est pas connecté — connecte-le depuis cette page d'abord.");

  async function callWith(token: string): Promise<Response> {
    return fetchBiometric(`${connection!.baseUrl}${path}`, {
      ...init,
      headers: { ...(init?.headers ?? {}), Authorization: `JWT ${token}`, "Content-Type": "application/json" },
    });
  }

  let token = connection.token;
  if (!token) {
    token = await login(connection.baseUrl, connection.username, connection.password);
    await db.biometricConnection.update({ where: { id: connection.id }, data: { token } });
  }

  let response = await callWith(token);
  if (response.status === 401) {
    token = await login(connection.baseUrl, connection.username, connection.password);
    await db.biometricConnection.update({ where: { id: connection.id }, data: { token } });
    response = await callWith(token);
  }
  return response;
}

export interface BiometricStatus {
  connected: boolean;
  baseUrl: string | null;
  username: string | null;
}

export async function getBiometricStatus(): Promise<BiometricStatus> {
  const connection = await db.biometricConnection.findFirst();
  if (!connection) return { connected: false, baseUrl: null, username: null };
  return { connected: true, baseUrl: connection.baseUrl, username: connection.username };
}

export async function disconnectBiometric(): Promise<void> {
  await db.biometricConnection.deleteMany();
}
