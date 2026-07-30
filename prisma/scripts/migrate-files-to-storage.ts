// One-time backfill: uploads every base64 data-URL still embedded in Postgres
// (from before the app switched to Supabase Storage uploads) to Storage, and
// rewrites the row to hold the short URL instead. Safe to re-run — rows that
// no longer hold a "data:" value are skipped.
//
// Usage: npx tsx prisma/scripts/migrate-files-to-storage.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import { Prisma, PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { uploadFile } from "../../src/lib/storage";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function extensionForMime(mime: string): string {
  const subtype = mime.split("/").pop() ?? "";
  return /^[a-zA-Z0-9]+$/.test(subtype) ? subtype.toLowerCase() : "";
}

async function migrateDataUrl(dataUrl: string, folder: string): Promise<string | null> {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, mime, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  return uploadFile(buffer, folder, mime, extensionForMime(mime));
}

async function migrateUsers() {
  const rows = await prisma.user.findMany({ where: { photoDataUrl: { startsWith: "data:" } } });
  for (const row of rows) {
    const url = await migrateDataUrl(row.photoDataUrl!, "avatars");
    if (url) await prisma.user.update({ where: { id: row.id }, data: { photoDataUrl: url } });
  }
  console.log(`Users: migrated ${rows.length}`);
}

async function migrateProjects() {
  const rows = await prisma.project.findMany({ where: { logoDataUrl: { startsWith: "data:" } } });
  for (const row of rows) {
    const url = await migrateDataUrl(row.logoDataUrl!, "logos");
    if (url) await prisma.project.update({ where: { id: row.id }, data: { logoDataUrl: url } });
  }
  console.log(`Projects: migrated ${rows.length}`);
}

async function migrateConversations() {
  const rows = await prisma.conversation.findMany({ where: { avatarDataUrl: { startsWith: "data:" } } });
  for (const row of rows) {
    const url = await migrateDataUrl(row.avatarDataUrl!, "avatars");
    if (url) await prisma.conversation.update({ where: { id: row.id }, data: { avatarDataUrl: url } });
  }
  console.log(`Conversations: migrated ${rows.length}`);
}

async function migrateTaskCustomValues() {
  const tasks = await prisma.task.findMany();
  let migrated = 0;
  for (const task of tasks) {
    const values = task.customValues as Record<string, unknown>;
    let changed = false;
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === "string" && value.startsWith("data:")) {
        const url = await migrateDataUrl(value, "custom-fields");
        if (url) {
          values[key] = url;
          changed = true;
        }
      }
    }
    if (changed) {
      await prisma.task.update({ where: { id: task.id }, data: { customValues: values as Prisma.InputJsonValue } });
      migrated += 1;
    }
  }
  console.log(`Task custom values: migrated ${migrated} task(s)`);
}

async function migratePurchaseItemValues() {
  const items = await prisma.purchaseItem.findMany();
  let migrated = 0;
  for (const item of items) {
    const values = item.values as Record<string, unknown>;
    let changed = false;
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === "string" && value.startsWith("data:")) {
        const url = await migrateDataUrl(value, "purchases");
        if (url) {
          values[key] = url;
          changed = true;
        }
      }
    }
    if (changed) {
      await prisma.purchaseItem.update({ where: { id: item.id }, data: { values: values as Prisma.InputJsonValue } });
      migrated += 1;
    }
  }
  console.log(`Purchase item values: migrated ${migrated} item(s)`);
}

async function migrateMessageAttachments() {
  const messages = await prisma.message.findMany();
  let migrated = 0;
  for (const message of messages) {
    const attachments = message.attachments as Array<Record<string, unknown>>;
    let changed = false;
    for (const attachment of attachments) {
      const dataUrl = attachment.dataUrl;
      if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
        const url = await migrateDataUrl(dataUrl, "chat");
        if (url) {
          attachment.dataUrl = url;
          changed = true;
        }
      }
    }
    if (changed) {
      await prisma.message.update({ where: { id: message.id }, data: { attachments: attachments as unknown as Prisma.InputJsonValue } });
      migrated += 1;
    }
  }
  console.log(`Message attachments: migrated ${migrated} message(s)`);
}

async function main() {
  await migrateUsers();
  await migrateProjects();
  await migrateConversations();
  await migrateTaskCustomValues();
  await migratePurchaseItemValues();
  await migrateMessageAttachments();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
