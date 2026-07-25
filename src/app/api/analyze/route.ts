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
            "You are an expert AI art prompt engineer. Analyze this image and write a detailed generation prompt that could recreate it in Midjourney, Stable Diffusion, or DALL-E. Include: subject description, art style, color palette, mood, lighting, composition, level of detail, and relevant quality tags. Return ONLY the prompt, no intro, no explanatio.",
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
