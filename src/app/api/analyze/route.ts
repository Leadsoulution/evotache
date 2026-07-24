import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        { error: "Missing Cloudflare account ID or API token" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing required 'image' field" },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const imageArray = [...new Uint8Array(arrayBuffer)];

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/llava-hf/llava-1.5-7b-hf`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageArray,
          prompt:
            "You are a world-class Senior Software Architect, UI/UX Designer, and Full-Stack Engineer. Analyze ClickUp in depth and build a modern, production-ready project management application that matches or exceeds its functionality for Desktop (Windows/macOS/Linux), Web, Android, and iOS. Generate the complete architecture, database schema, backend APIs, frontend, authentication, real-time collaboration, notifications, offline sync, file management, dashboards, automations, AI assistant, role permissions, and responsive UI with clean, scalable, secure, and maintainable code following enterprise best practices.\n\nThink like the original ClickUp engineering team. Before writing code, analyze every feature, workflow, screen, interaction, performance optimization, and UX pattern. Recreate and improve them with a modern design system, modular architecture, reusable components, TypeScript, real-time WebSockets, drag-and-drop, calendar, Gantt, Kanban, documents, chat, time tracking, custom fields, reporting, integrations, and advanced search while ensuring excellent speed, accessibility, and scalability.\n\nWork as an autonomous software engineering team. Break the project into milestones, create the complete folder structure, generate production-ready code file by file, explain every important decision, test each module before continuing, automatically fix detected issues, and never use placeholders or simplified examples. Continue until the application is fully functional, deployable, and ready for production.",
          max_tokens: 512,
        }),
      }
    );

    const data = await cfResponse.json();

    if (!data.success) {
      return NextResponse.json(
        { error: data.errors ?? "Cloudflare AI request failed" },
        { status: 502 }
      );
    }

    const description = data.result.description;

    return NextResponse.json({ prompt: description });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
