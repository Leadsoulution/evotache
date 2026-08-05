-- Add the new array column, backfill it from the existing single chat id
-- (so an already-linked Telegram chat isn't lost), then drop the old column.
ALTER TABLE "agent_configs" ADD COLUMN "telegramChatIds" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "agent_configs"
SET "telegramChatIds" = ARRAY["telegramChatId"]
WHERE "telegramChatId" IS NOT NULL;

ALTER TABLE "agent_configs" DROP COLUMN "telegramChatId";
