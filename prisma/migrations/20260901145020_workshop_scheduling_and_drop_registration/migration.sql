/*
  Warnings:

  - You are about to drop the column `registration` on the `workshop_repairs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "workshop_repairs" DROP COLUMN "registration";

-- AlterTable
ALTER TABLE "workshop_services" ADD COLUMN     "durationMinutes" INTEGER;
