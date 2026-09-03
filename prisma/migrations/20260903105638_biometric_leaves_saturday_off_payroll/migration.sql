-- AlterTable
ALTER TABLE "biometric_employee_overrides" ADD COLUMN     "monthlySalary" DOUBLE PRECISION,
ADD COLUMN     "saturdayOff" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "biometric_leaves" (
    "id" TEXT NOT NULL,
    "empCode" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometric_leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_payroll_config" (
    "id" TEXT NOT NULL,
    "absenceDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biometric_payroll_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_late_penalty_rules" (
    "id" TEXT NOT NULL,
    "fromMinutes" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometric_late_penalty_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "biometric_leaves_empCode_idx" ON "biometric_leaves"("empCode");
