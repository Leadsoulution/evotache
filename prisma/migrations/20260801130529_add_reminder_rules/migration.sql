-- CreateTable
CREATE TABLE "reminder_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "timesOfDay" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notifyAssignee" BOOLEAN NOT NULL DEFAULT true,
    "notifyManager" BOOLEAN NOT NULL DEFAULT true,
    "meetingAt" TIMESTAMP(3),
    "minutesBefore" INTEGER,
    "wholeTeam" BOOLEAN NOT NULL DEFAULT false,
    "audienceUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audienceTeamIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "viaPush" BOOLEAN NOT NULL DEFAULT true,
    "viaAgentChat" BOOLEAN NOT NULL DEFAULT true,
    "agentId" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_rules_pkey" PRIMARY KEY ("id")
);
