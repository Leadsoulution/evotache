-- CreateTable
CREATE TABLE "threecx_users" (
    "dn" TEXT NOT NULL,
    "name" TEXT,
    "color" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threecx_users_pkey" PRIMARY KEY ("dn")
);
