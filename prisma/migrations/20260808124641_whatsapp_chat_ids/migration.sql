/*
  Warnings:

  - You are about to drop the column `whatsappNumber` on the `agent_configs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "agent_configs" DROP COLUMN "whatsappNumber",
ADD COLUMN     "whatsappChatIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "whatsappLinkCode" TEXT;
