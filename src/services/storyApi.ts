import { generateId } from "@/lib/id";
import type { AdPlatform, ContentStageStatus, Story } from "@/types/socialMedia";

const STORAGE_KEY = "evotasks.stories.v1";
const NETWORK_DELAY_MS = 300;

export class ApiError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function daysFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString();
}

function createSeedStories(): Story[] {
  const now = new Date().toISOString();
  const rows: Omit<Story, "createdAt">[] = [
    {
      id: "story-1",
      title: "Coulisses tournage Hawk 200R",
      client: "LPR Maroc",
      platform: "instagram",
      dueDate: daysFromToday(1),
      status: "scheduled",
      assigneeId: "u4",
      notes: "",
      link: null,
      order: 0,
    },
    {
      id: "story-2",
      title: "Sondage : quel modèle préférez-vous ?",
      client: "LPR Maroc",
      platform: "instagram",
      dueDate: daysFromToday(-1),
      status: "published",
      assigneeId: "u3",
      notes: "Sticker sondage avec 2 options.",
      link: "https://instagram.com/stories/lprmaroc/example",
      order: 0,
    },
    {
      id: "story-3",
      title: "Compte à rebours promo",
      client: "Atlas Distribution",
      platform: "facebook",
      dueDate: daysFromToday(4),
      status: "draft",
      assigneeId: "u5",
      notes: "",
      link: null,
      order: 0,
    },
  ];
  return rows.map((row) => ({ ...row, createdAt: now }));
}

function readStore(): Story[] {
  if (typeof window === "undefined") return createSeedStories();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedStories();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Story[];
    if (!Array.isArray(parsed)) throw new Error("invalid shape");
    return parsed;
  } catch {
    const seeded = createSeedStories();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeStore(stories: Story[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
}

export async function fetchStories(): Promise<Story[]> {
  await delay(NETWORK_DELAY_MS);
  return readStore();
}

interface CreateStoryInput {
  title: string;
  client: string;
  platform: AdPlatform;
  dueDate: string | null;
  status: ContentStageStatus;
  assigneeId: string | null;
  notes: string;
  link: string | null;
}

export async function createStory(input: CreateStoryInput): Promise<Story> {
  await delay(NETWORK_DELAY_MS);
  if (!input.title.trim()) throw new ApiError("Title is required.");
  const stories = readStore();
  const maxOrder = stories.filter((s) => s.status === input.status).reduce((max, s) => Math.max(max, s.order), -1);
  const story: Story = { ...input, id: generateId("story"), title: input.title.trim(), order: maxOrder + 1, createdAt: new Date().toISOString() };
  writeStore([...stories, story]);
  return story;
}

export async function updateStory(id: string, patch: Partial<Omit<Story, "id" | "createdAt">>): Promise<Story> {
  await delay(NETWORK_DELAY_MS);
  const stories = readStore();
  const index = stories.findIndex((s) => s.id === id);
  if (index === -1) throw new ApiError("Story not found.");
  const updated = { ...stories[index], ...patch };
  const next = [...stories];
  next[index] = updated;
  writeStore(next);
  return updated;
}

export async function deleteStory(id: string): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  writeStore(readStore().filter((s) => s.id !== id));
}
