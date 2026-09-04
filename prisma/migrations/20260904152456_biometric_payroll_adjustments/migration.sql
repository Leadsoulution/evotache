-- CreateTable
CREATE TABLE "biometric_payroll_adjustments" (
    "id" TEXT NOT NULL,
    "empCode" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "advance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biometric_payroll_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "biometric_payroll_adjustments_empCode_monthKey_key" ON "biometric_payroll_adjustments"("empCode", "monthKey");
