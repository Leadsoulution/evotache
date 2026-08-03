import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import { db } from "@/lib/db";
import { getSpreadsheetTitle } from "@/lib/googleSheets";

export interface BackupSheetStatus {
  linked: boolean;
  spreadsheetId: string | null;
  spreadsheetTitle: string | null;
  lastBackupAt: string | null;
}

async function getStatus(): Promise<BackupSheetStatus> {
  const config = await db.backupSheetConfig.findFirst();
  if (!config) return { linked: false, spreadsheetId: null, spreadsheetTitle: null, lastBackupAt: null };
  return {
    linked: true,
    spreadsheetId: config.spreadsheetId,
    spreadsheetTitle: config.spreadsheetTitle,
    lastBackupAt: config.lastBackupAt ? config.lastBackupAt.toISOString() : null,
  };
}

// Accepts either a raw spreadsheet id or a full Google Sheets URL like
// https://docs.google.com/spreadsheets/d/<id>/edit#gid=0
function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9-_]+$/.test(trimmed)) return trimmed;
  return null;
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getStatus());
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const spreadsheetUrl = typeof body?.spreadsheetUrl === "string" ? body.spreadsheetUrl : "";
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
  if (!spreadsheetId) return NextResponse.json({ error: "Couldn't find a spreadsheet id in that link." }, { status: 400 });

  let spreadsheetTitle: string;
  try {
    spreadsheetTitle = await getSpreadsheetTitle(spreadsheetId);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't access that spreadsheet." }, { status: 400 });
  }

  const existing = await db.backupSheetConfig.findFirst();
  if (existing) {
    await db.backupSheetConfig.update({ where: { id: existing.id }, data: { spreadsheetId, spreadsheetTitle } });
  } else {
    await db.backupSheetConfig.create({ data: { spreadsheetId, spreadsheetTitle } });
  }
  return NextResponse.json(await getStatus());
}

export async function DELETE() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await db.backupSheetConfig.deleteMany();
  return NextResponse.json(await getStatus());
}
