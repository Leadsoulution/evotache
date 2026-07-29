// Next.js conventionally uses .env.local (not .env) for local secrets, and
// the rest of this app's env vars (Cloudflare keys, etc.) already live
// there — so point dotenv at the same file instead of the plain-.env default.
import { config } from "dotenv";
config({ path: ".env.local" });
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // CLI commands (migrate/studio/db push) need the direct, non-pooled
  // connection — Supabase's pgbouncer pooler doesn't support the
  // prepared-statement/DDL traffic migrations need. The app's runtime
  // client (src/lib/db.ts) uses the pooled DATABASE_URL instead.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
