import { NextRequest, NextResponse } from "next/server";
import { getOpenAIKey } from "@/lib/apiKeyStore";

// Speech-to-text for the AI Assistant's voice input. Forwards the recorded
// clip to OpenAI Whisper server-side, so the API key never reaches the browser.
export async function POST(request: NextRequest) {
  try {
    const apiKey = await getOpenAIKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "No OpenAI API key configured. Add one in Admin → Integrations, or set OPENAI_API_KEY on the server." },
        { status: 501 }
      );
    }

    const incomingForm = await request.formData().catch(() => null);
    const audio = incomingForm?.get("audio");
    if (!(audio instanceof Blob) || audio.size === 0) {
      return NextResponse.json({ error: "Missing audio clip." }, { status: 400 });
    }
    if (audio.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Recording is too long (max 20MB)." }, { status: 413 });
    }

    const upstreamForm = new FormData();
    upstreamForm.set("file", audio, "recording.webm");
    upstreamForm.set("model", "whisper-1");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json({ error: `Transcription failed (${response.status}): ${errorBody.slice(0, 300)}` }, { status: 502 });
    }

    const data = await response.json();
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
