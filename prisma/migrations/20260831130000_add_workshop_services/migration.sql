-- CreateEnum
CREATE TYPE "workshop_service_status" AS ENUM ('waiting', 'in_progress', 'done');

-- CreateTable
CREATE TABLE "workshop_services" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "status" "workshop_service_status" NOT NULL DEFAULT 'waiting',
    "completedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_services_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "workshop_services" ADD CONSTRAINT "workshop_services_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "workshop_repairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: each repair's existing free-text workDescription becomes
-- its first service, so the two test repairs created before this change
-- don't just lose that text.
INSERT INTO "workshop_services" ("id", "repairId", "description", "status", "order", "createdAt", "updatedAt")
SELECT
    'wsvc_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20),
    "id",
    "workDescription",
    CASE WHEN "status" = 'in_progress' THEN 'in_progress'::"workshop_service_status" ELSE 'waiting'::"workshop_service_status" END,
    0,
    "createdAt",
    "updatedAt"
FROM "workshop_repairs"
WHERE "workDescription" IS NOT NULL AND "workDescription" <> '';

-- AlterTable
ALTER TABLE "workshop_repairs" DROP COLUMN "workDescription";

-- AlterTable: a repair's chrono is now tracked per-service, not per-repair.
-- No existing rows reference workshop_sessions.repairId (0 rows at the time
-- of this migration), so a straight rename + new FK is safe.
ALTER TABLE "workshop_sessions" DROP CONSTRAINT "workshop_sessions_repairId_fkey";
ALTER TABLE "workshop_sessions" RENAME COLUMN "repairId" TO "serviceId";
ALTER TABLE "workshop_sessions" ADD CONSTRAINT "workshop_sessions_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "workshop_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
