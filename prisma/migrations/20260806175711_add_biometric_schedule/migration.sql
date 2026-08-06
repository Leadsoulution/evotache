-- CreateTable
CREATE TABLE "biometric_schedule" (
    "id" TEXT NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '09:30',
    "endTime" TEXT NOT NULL DEFAULT '19:00',
    "fridayBreakStart" TEXT NOT NULL DEFAULT '13:00',
    "fridayBreakEnd" TEXT NOT NULL DEFAULT '15:00',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biometric_schedule_pkey" PRIMARY KEY ("id")
);
