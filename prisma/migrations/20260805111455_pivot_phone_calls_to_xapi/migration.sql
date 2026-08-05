-- AlterTable: phone_calls is currently empty (Call Journaling never
-- wrote to it), so this drops the old Call-Journaling-shaped columns and
-- adds the new XAPI-shaped ones.
ALTER TABLE "phone_calls" DROP COLUMN "contactnumber",
DROP COLUMN "agentextension",
DROP COLUMN "calltype",
DROP COLUMN "starttime",
DROP COLUMN "duration",
DROP COLUMN "createdat",
ADD COLUMN     "externalId" TEXT NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "sourceNumber" TEXT NOT NULL,
ADD COLUMN     "sourceName" TEXT,
ADD COLUMN     "destNumber" TEXT NOT NULL,
ADD COLUMN     "destName" TEXT,
ADD COLUMN     "direction" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "answered" BOOLEAN NOT NULL,
ADD COLUMN     "ringSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "talkSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "phone_calls_externalId_key" ON "phone_calls"("externalId");

-- CreateTable
CREATE TABLE "threecx_connections" (
    "id" TEXT NOT NULL,
    "pbxUrl" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "accessToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "connectedBy" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threecx_connections_pkey" PRIMARY KEY ("id")
);
