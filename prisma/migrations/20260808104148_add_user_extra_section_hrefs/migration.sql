-- AlterTable
ALTER TABLE "users" ADD COLUMN     "extraSectionHrefs" TEXT[] DEFAULT ARRAY[]::TEXT[];
