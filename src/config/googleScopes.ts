// Client-safe — no server-only imports — so UI can check "does this Google
// connection have the Sheets scope?" without pulling src/lib/googleAuth.ts's
// Prisma/pg dependency into the client bundle (same reasoning as
// src/config/metaAds.ts).
export const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
