import { getOpenAIKey } from "@/lib/apiKeyStore";

/** Speech-to-text via OpenAI Whisper — shared by the AI Assistant's voice
 * input (POST /api/transcribe, browser mic recording) and the WhatsApp
 * webhook (voice notes), so both go through the exact same upstream call. */
export async function transcribeAudio(audio: Blob, filename: string): Promise<string> {
  const apiKey = await getOpenAIKey();
  if (!apiKey) throw new Error("No OpenAI API key configured.");

  const form = new FormData();
  form.set("file", audio, filename);
  form.set("model", "whisper-1");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Transcription failed (${response.status}): ${errorBody.slice(0, 300)}`);
  }
  const data = await response.json();
  return typeof data?.text === "string" ? data.text.trim() : "";
}
