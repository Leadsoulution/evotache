-- CreateTable
CREATE TABLE "call_filter_views" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "search" TEXT NOT NULL DEFAULT '',
    "statusFilter" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "directionFilter" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dateFrom" TEXT NOT NULL DEFAULT '',
    "dateTo" TEXT NOT NULL DEFAULT '',
    "dateRangeLabel" TEXT NOT NULL DEFAULT 'Toutes les dates',
    "timeFrom" TEXT NOT NULL DEFAULT '',
    "timeTo" TEXT NOT NULL DEFAULT '',
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT false,
    "timeRangeLabel" TEXT NOT NULL DEFAULT 'Toute la journée',
    "selectedUserDn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_filter_views_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "call_filter_views" ADD CONSTRAINT "call_filter_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
