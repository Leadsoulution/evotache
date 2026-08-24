-- AlterTable
ALTER TABLE "biometric_employee_overrides" ADD COLUMN     "lunchBreakEnd" TEXT,
ADD COLUMN     "lunchBreakStart" TEXT;

-- AlterTable
ALTER TABLE "biometric_schedule" ADD COLUMN     "lunchBreakEnd" TEXT NOT NULL DEFAULT '14:00',
ADD COLUMN     "lunchBreakStart" TEXT NOT NULL DEFAULT '13:00';
