-- CreateTable
CREATE TABLE "biometric_connections" (
    "id" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "token" TEXT,
    "connectedBy" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biometric_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_events" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT NOT NULL,
    "empCode" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "department" TEXT,
    "position" TEXT,
    "punchTime" TIMESTAMP(3) NOT NULL,
    "punchState" TEXT NOT NULL,
    "punchStateLabel" TEXT NOT NULL,
    "verifyType" TEXT,
    "terminalAlias" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometric_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_employee_overrides" (
    "empCode" TEXT NOT NULL,
    "name" TEXT,
    "color" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biometric_employee_overrides_pkey" PRIMARY KEY ("empCode")
);

-- CreateIndex
CREATE UNIQUE INDEX "biometric_events_externalId_key" ON "biometric_events"("externalId");
