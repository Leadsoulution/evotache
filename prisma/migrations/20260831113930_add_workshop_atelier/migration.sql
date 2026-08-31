-- CreateEnum
CREATE TYPE "workshop_status" AS ENUM ('waiting', 'in_progress', 'waiting_part', 'waiting_client', 'ready', 'picked_up', 'cancelled');

-- CreateTable
CREATE TABLE "workshop_repairs" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "engineCc" INTEGER,
    "registration" TEXT,
    "workDescription" TEXT NOT NULL DEFAULT '',
    "mechanicId" TEXT,
    "status" "workshop_status" NOT NULL DEFAULT 'waiting',
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedCompletionDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_sessions" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "mechanicId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runningSince" TIMESTAMP(3),
    "accumulatedSeconds" INTEGER NOT NULL DEFAULT 0,
    "pausedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "totalWorkSeconds" INTEGER,

    CONSTRAINT "workshop_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_status_history" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workshop_status_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "workshop_sessions" ADD CONSTRAINT "workshop_sessions_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "workshop_repairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_status_history" ADD CONSTRAINT "workshop_status_history_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "workshop_repairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
