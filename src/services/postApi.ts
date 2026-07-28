import { generateId } from "@/lib/id";
import type { ContentPriority, ContentStageStatus, Post } from "@/types/socialMedia";

const STORAGE_KEY = "evotasks.posts.v1";
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

function createSeedPosts(): Post[] {
  const now = new Date().toISOString();
  const rows: Omit<Post, "createdAt">[] = [
    {
      id: "post-1",
      title: "Carrousel — Gamme Hawk complète",
      client: "LPR MAROC",
      assigneeId: "u3",
      status: "design",
      priority: "high",
      publishingDate: daysFromToday(5),
      notes: "5 slides, une par modèle.",
      link: null,
      order: 0,
    },
    {
      id: "post-2",
      title: "Post témoignage client",
      client: "MXSHOP",
      assigneeId: "u5",
      status: "published",
      priority: "normal",
      publishingDate: daysFromToday(-2),
      notes: "",
      link: "https://facebook.com/atlasdistribution/posts/example",
      order: 0,
    },
    {
      id: "post-3",
      title: "Annonce partenariat concessionnaire",
      client: "LPR MAROC",
      assigneeId: "u3",
      status: "scheduled",
      priority: "normal",
      publishingDate: daysFromToday(3),
      notes: "Coordonner avec le service commercial.",
      link: null,
      order: 0,
    },
    {
      id: "post-4",
      title: "Récap mensuel des livraisons",
      client: "EVOBIKE",
      assigneeId: "u6",
      status: "draft",
      priority: "low",
      publishingDate: null,
      notes: "",
      link: null,
      order: 0,
    },
  ];
  return rows.map((row) => ({ ...row, createdAt: now }));
}

function readStore(): Post[] {
  if (typeof window === "undefined") return createSeedPosts();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedPosts();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Post[];
    if (!Array.isArray(parsed)) throw new Error("invalid shape");
    return parsed;
  } catch {
    const seeded = createSeedPosts();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeStore(posts: Post[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

export async function fetchPosts(): Promise<Post[]> {
  await delay(NETWORK_DELAY_MS);
  return readStore();
}

interface CreatePostInput {
  title: string;
  client: string;
  assigneeId: string | null;
  status: ContentStageStatus;
  priority: ContentPriority;
  publishingDate: string | null;
  notes: string;
  link: string | null;
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  await delay(NETWORK_DELAY_MS);
  if (!input.title.trim()) throw new ApiError("Title is required.");
  const posts = readStore();
  const maxOrder = posts.filter((p) => p.status === input.status).reduce((max, p) => Math.max(max, p.order), -1);
  const post: Post = { ...input, id: generateId("post"), title: input.title.trim(), order: maxOrder + 1, createdAt: new Date().toISOString() };
  writeStore([...posts, post]);
  return post;
}

export async function updatePost(id: string, patch: Partial<Omit<Post, "id" | "createdAt">>): Promise<Post> {
  await delay(NETWORK_DELAY_MS);
  const posts = readStore();
  const index = posts.findIndex((p) => p.id === id);
  if (index === -1) throw new ApiError("Post not found.");
  const updated = { ...posts[index], ...patch };
  const next = [...posts];
  next[index] = updated;
  writeStore(next);
  return updated;
}

export async function deletePost(id: string): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  writeStore(readStore().filter((p) => p.id !== id));
}
