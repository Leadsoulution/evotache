-- AlterTable
ALTER TABLE "phone_calls" ADD COLUMN     "destDn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sourceDn" TEXT NOT NULL DEFAULT '';
