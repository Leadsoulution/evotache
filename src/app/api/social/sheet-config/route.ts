import { NextRequest, NextResponse } from "next/server";
import { clearGoogleSheetConnection, getGoogleSheetStatus, setGoogleSheetConnection, setGoogleSheetMapping } from "@/lib/apiKeyStore";
import type { ColumnMapping } from "@/types/googleSheet";

export async function GET() {
  return NextResponse.json(await getGoogleSheetStatus());
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (body && typeof body.webAppUrl === "string") {
    const webAppUrl = body.webAppUrl.trim();
    if (!webAppUrl) return NextResponse.json({ error: "Missing Web App URL." }, { status: 400 });
    const token = typeof body.token === "string" ? body.token.trim() : "";
    await setGoogleSheetConnection(webAppUrl, token || null);
    return NextResponse.json(await getGoogleSheetStatus());
  }

  if (body && body.columnMapping && typeof body.columnMapping === "object") {
    const columnMapping = body.columnMapping as ColumnMapping;
    const productsPerDay = Number(body.productsPerDay);
    await setGoogleSheetMapping(columnMapping, Number.isFinite(productsPerDay) && productsPerDay > 0 ? productsPerDay : 20);
    return NextResponse.json(await getGoogleSheetStatus());
  }

  return NextResponse.json({ error: "Invalid request." }, { status: 400 });
}

export async function DELETE() {
  await clearGoogleSheetConnection();
  return NextResponse.json(await getGoogleSheetStatus());
}
