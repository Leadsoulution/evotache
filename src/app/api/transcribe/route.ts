import { NextRequest, NextResponse } from "next/server";
import { getOpenAIKey } from "@/lib/apiKeyStore";
import { transcribeAudio } from "@/lib/transcribe";

// Speech-to-text for the AI Assistant's voice input. Forwards the recorded
// clip to OpenAI Whisper server-side, so the API key never reaches the browser.
export async function POST(request: NextRequest) {
  try {
    if (!(await getOpenAIKey())) {
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

    const text = await transcribeAudio(audio, "recording.webm");
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected server error." }, { status: 502 });
  }
}
