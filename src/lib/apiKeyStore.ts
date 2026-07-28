import { promises as fs } from "fs";
import path from "path";
import type { ColumnMapping, GoogleSheetStatus } from "@/types/googleSheet";

// Server-only. Lets an admin configure the OpenAI key from the app UI instead
// of only through a process env var, by persisting it to a local, gitignored
// JSON file. Never imported from client code, and the raw key is never sent
// back to the browser — only a masked preview and a "configured" flag.
const STORE_PATH = path.join(process.cwd(), ".data", "settings.json");

interface StoredSettings {
  openaiApiKey?: string;
  googleSheetWebAppUrl?: string;
  googleSheetToken?: string;
  googleSheetColumnMapping?: ColumnMapping;
  googleSheetProductsPerDay?: number;
}

const DEFAULT_COLUMN_MAPPING: ColumnMapping = { name: null, reference: null, lastSaleDate: null, purchaseDate: null };
const DEFAULT_PRODUCTS_PER_DAY = 20;

async function readSettings(): Promise<StoredSettings> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as StoredSettings;
  } catch {
    return {};
  }
}

async function writeSettings(settings: StoredSettings): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(settings, null, 2), "utf-8");
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 3)}${"•".repeat(6)}${key.slice(-4)}`;
}

export async function getOpenAIKey(): Promise<string | null> {
  const settings = await readSettings();
  if (settings.openaiApiKey) return settings.openaiApiKey;
  return process.env.OPENAI_API_KEY ?? null;
}

export interface KeyStatus {
  configured: boolean;
  source: "custom" | "env" | "none";
  maskedKey: string | null;
}

export async function getOpenAIKeyStatus(): Promise<KeyStatus> {
  const settings = await readSettings();
  if (settings.openaiApiKey) {
    return { configured: true, source: "custom", maskedKey: maskKey(settings.openaiApiKey) };
  }
  if (process.env.OPENAI_API_KEY) {
    return { configured: true, source: "env", maskedKey: maskKey(process.env.OPENAI_API_KEY) };
  }
  return { configured: false, source: "none", maskedKey: null };
}

export async function setOpenAIKey(key: string | null): Promise<void> {
  const settings = await readSettings();
  if (key) settings.openaiApiKey = key;
  else delete settings.openaiApiKey;
  await writeSettings(settings);
}

export async function getGoogleSheetStatus(): Promise<GoogleSheetStatus> {
  const settings = await readSettings();
  return {
    configured: Boolean(settings.googleSheetWebAppUrl),
    webAppUrl: settings.googleSheetWebAppUrl ?? null,
    maskedToken: settings.googleSheetToken ? maskKey(settings.googleSheetToken) : null,
    columnMapping: settings.googleSheetColumnMapping ?? DEFAULT_COLUMN_MAPPING,
    productsPerDay: settings.googleSheetProductsPerDay ?? DEFAULT_PRODUCTS_PER_DAY,
  };
}

/** Server-only: includes the raw URL/token, never sent to the client — only `/api/social/sheet-data` reads this to proxy the actual fetch. */
export async function getGoogleSheetConnection(): Promise<{ webAppUrl: string; token: string | null } | null> {
  const settings = await readSettings();
  if (!settings.googleSheetWebAppUrl) return null;
  return { webAppUrl: settings.googleSheetWebAppUrl, token: settings.googleSheetToken ?? null };
}

export async function setGoogleSheetConnection(webAppUrl: string, token: string | null): Promise<void> {
  const settings = await readSettings();
  settings.googleSheetWebAppUrl = webAppUrl;
  if (token) settings.googleSheetToken = token;
  else delete settings.googleSheetToken;
  await writeSettings(settings);
}

export async function setGoogleSheetMapping(columnMapping: ColumnMapping, productsPerDay: number): Promise<void> {
  const settings = await readSettings();
  settings.googleSheetColumnMapping = columnMapping;
  settings.googleSheetProductsPerDay = productsPerDay;
  await writeSettings(settings);
}

export async function clearGoogleSheetConnection(): Promise<void> {
  const settings = await readSettings();
  delete settings.googleSheetWebAppUrl;
  delete settings.googleSheetToken;
  delete settings.googleSheetColumnMapping;
  delete settings.googleSheetProductsPerDay;
  await writeSettings(settings);
}
