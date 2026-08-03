-- AlterTable (nullable first so existing rows can be backfilled)
ALTER TABLE "archived_items" ADD COLUMN     "batchId" TEXT;

-- Backfill: each pre-existing row becomes its own singleton batch.
UPDATE "archived_items" SET "batchId" = "id" WHERE "batchId" IS NULL;

-- AlterTable
ALTER TABLE "archived_items" ALTER COLUMN "batchId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "archived_items_batchId_idx" ON "archived_items"("batchId");
