import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Standard Next.js singleton pattern — reuse one PrismaClient (and its
// connection pool) across hot reloads in dev instead of creating a new one
// per module reload, which would otherwise exhaust Supabase's connection limit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  // Runtime queries use the pooled connection (pgbouncer); prisma.config.ts
  // uses the direct connection separately for migrations/studio.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
