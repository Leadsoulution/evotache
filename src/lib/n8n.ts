/** One shared n8n webhook for the whole app (same pattern as
 * TELEGRAM_BOT_TOKEN/TAVILY_API_KEY) — the admin points this at a single
 * n8n workflow's Webhook trigger node. N8N_WEBHOOK_SECRET is optional: if
 * set, it's sent as a header the n8n workflow can check (n8n's own "Header
 * Auth" webhook option) so the URL alone isn't enough to trigger it. */
export async function triggerN8nWorkflow(payload: Record<string, unknown>): Promise<{ status: number }> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) throw new Error("n8n isn't configured (N8N_WEBHOOK_URL is missing).");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.N8N_WEBHOOK_SECRET) headers["X-Webhook-Secret"] = process.env.N8N_WEBHOOK_SECRET;

  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`n8n webhook request failed (${response.status}): ${await response.text()}`);
  return { status: response.status };
}
