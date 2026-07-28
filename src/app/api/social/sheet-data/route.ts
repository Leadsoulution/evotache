import { NextResponse } from "next/server";
import { getGoogleSheetConnection } from "@/lib/apiKeyStore";

// Proxies the configured Google Apps Script Web App server-side, so the URL
// (and optional token) never has to be exposed to the browser, and so we
// sidestep any CORS restrictions the Web App might have.
export async function GET() {
  const connection = await getGoogleSheetConnection();
  if (!connection) {
    return NextResponse.json({ error: "Google Sheet is not connected yet." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(connection.webAppUrl);
  } catch {
    return NextResponse.json({ error: "The saved Web App URL is not valid." }, { status: 400 });
  }
  if (connection.token) target.searchParams.set("token", connection.token);

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    response = await fetch(target.toString(), { signal: controller.signal, cache: "no-store" });
    clearTimeout(timeout);
  } catch {
    return NextResponse.json(
      { error: "Could not reach the Google Apps Script Web App. Check the URL and that it's deployed with 'Anyone' access." },
      { status: 502 }
    );
  }

  if (!response.ok) {
    return NextResponse.json({ error: `The Web App responded with an error (${response.status}).` }, { status: 502 });
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return NextResponse.json({ error: "The Web App did not return valid JSON. Check the Apps Script code." }, { status: 502 });
  }

  if (!Array.isArray(data)) {
    return NextResponse.json({ error: "Expected a JSON array of product rows from the Web App." }, { status: 502 });
  }

  const rows = data as Record<string, string>[];
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return NextResponse.json({ headers, rows });
}
