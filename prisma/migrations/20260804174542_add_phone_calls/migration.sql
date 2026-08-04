-- CreateTable
CREATE TABLE "phone_calls" (
    "id" SERIAL NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "agentExtension" TEXT NOT NULL,
    "callType" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_calls_pkey" PRIMARY KEY ("id")
);
