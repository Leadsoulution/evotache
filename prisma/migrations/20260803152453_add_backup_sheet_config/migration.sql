-- CreateTable
CREATE TABLE "backup_sheet_config" (
    "id" TEXT NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "spreadsheetTitle" TEXT,
    "lastBackupAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_sheet_config_pkey" PRIMARY KEY ("id")
);
