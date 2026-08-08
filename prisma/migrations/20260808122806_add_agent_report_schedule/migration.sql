-- CreateTable
CREATE TABLE "agent_report_schedules" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "timesOfDay" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reportTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_report_schedules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "agent_report_schedules" ADD CONSTRAINT "agent_report_schedules_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_report_schedules" ADD CONSTRAINT "agent_report_schedules_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
