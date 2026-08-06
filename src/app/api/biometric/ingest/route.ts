import { NextResponse } from "next/server";
import { ingestBiometricEvents } from "@/lib/biometricSync";
import type { RawTransaction } from "@/lib/biometricApi";

// Called by an unattended script running on a machine inside the biometric
// device's own local network (Hostinger can't reach that network directly)
// — so this is authenticated with a static bearer token instead of a user
// session, same pattern as the Telegram webhook's secret-token check.
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.replace(/^Bearer\s+/i, "").trim();
  if (!token || !process.env.BIOMETRIC_INGEST_TOKEN || token !== process.env.BIOMETRIC_INGEST_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const transactions = Array.isArray(body?.transactions) ? (body.transactions as RawTransaction[]) : null;
  if (!transactions) return NextResponse.json({ error: "Invalid payload: expected { transactions: [...] }" }, { status: 400 });

  try {
    const result = await ingestBiometricEvents(transactions);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Biometric ingest failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Ingest failed." }, { status: 500 });
  }
}
