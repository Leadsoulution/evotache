/*
  Warnings:

  - You are about to drop the column `agentExtension` on the `phone_calls` table. All the data in the column will be lost.
  - You are about to drop the column `callType` on the `phone_calls` table. All the data in the column will be lost.
  - You are about to drop the column `contactNumber` on the `phone_calls` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `phone_calls` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `phone_calls` table. All the data in the column will be lost.
  - Added the required column `agentextension` to the `phone_calls` table without a default value. This is not possible if the table is not empty.
  - Added the required column `calltype` to the `phone_calls` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactnumber` to the `phone_calls` table without a default value. This is not possible if the table is not empty.
  - Added the required column `starttime` to the `phone_calls` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "phone_calls" DROP COLUMN "agentExtension",
DROP COLUMN "callType",
DROP COLUMN "contactNumber",
DROP COLUMN "createdAt",
DROP COLUMN "startTime",
ADD COLUMN     "agentextension" TEXT NOT NULL,
ADD COLUMN     "calltype" TEXT NOT NULL,
ADD COLUMN     "contactnumber" TEXT NOT NULL,
ADD COLUMN     "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "starttime" TIMESTAMP(3) NOT NULL;
