import { NextRequest, NextResponse } from "next/server";
import { getOpenAIKeyStatus, setOpenAIKey } from "@/lib/apiKeyStore";

export async function GET() {
  const status = await getOpenAIKeyStatus();
  return NextResponse.json(status);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key." }, { status: 400 });
  }
  await setOpenAIKey(apiKey);
  return NextResponse.json(await getOpenAIKeyStatus());
}

export async function DELETE() {
  await setOpenAIKey(null);
  return NextResponse.json(await getOpenAIKeyStatus());
}
