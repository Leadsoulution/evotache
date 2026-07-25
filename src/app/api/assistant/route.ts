import { NextRequest, NextResponse } from "next/server";

const OPENAI_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are a project management assistant. Given a user's description of work to be done, break it down into a list of concrete, actionable tasks.
Return ONLY a JSON object of the shape: { "tasks": [ { "title": string, "description": string, "priority": "urgent" | "high" | "normal" | "low", "dueInDays": number | null } ] }.
- "title" is short and action-oriented (max ~80 characters).
- "description" adds 1-2 sentences of useful detail, or an empty string if nothing to add.
- "priority" reflects urgency; default to "normal" if unclear.
- "dueInDays" is a rough number of days from today this task should be done by, or null if there is no clear deadline.
Return between 1 and 12 tasks. Do not include any text other than the JSON object.`;

interface RawSuggestedTask {
  title?: unknown;
  description?: unknown;
  priority?: unknown;
  dueInDays?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured on the server. Add it to your environment variables to enable the AI assistant." },
        { status: 501 }
      );
    }

    const body = await request.json().catch(() => null);
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt." }, { status: 400 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json({ error: `OpenAI request failed (${response.status}): ${errorBody.slice(0, 300)}` }, { status: 502 });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return NextResponse.json({ error: "Unexpected response from OpenAI." }, { status: 502 });
    }

    let parsed: { tasks?: RawSuggestedTask[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Could not parse the assistant's response." }, { status: 502 });
    }

    const tasks = Array.isArray(parsed.tasks)
      ? parsed.tasks
          .filter((t): t is RawSuggestedTask & { title: string } => typeof t?.title === "string" && t.title.trim().length > 0)
          .map((t) => ({
            title: t.title.trim(),
            description: typeof t.description === "string" ? t.description : "",
            priority: typeof t.priority === "string" ? t.priority : "normal",
            dueInDays: typeof t.dueInDays === "number" ? t.dueInDays : null,
          }))
      : [];

    return NextResponse.json({ tasks });
  } catch {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
