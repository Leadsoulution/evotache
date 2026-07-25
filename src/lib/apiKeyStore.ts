import { promises as fs } from "fs";
import path from "path";

// Server-only. Lets an admin configure the OpenAI key from the app UI instead
// of only through a process env var, by persisting it to a local, gitignored
// JSON file. Never imported from client code, and the raw key is never sent
// back to the browser — only a masked preview and a "configured" flag.
const STORE_PATH = path.join(process.cwd(), ".data", "settings.json");

interface StoredSettings {
  openaiApiKey?: string;
}

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
