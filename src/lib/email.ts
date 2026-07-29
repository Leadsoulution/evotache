import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM;
const resend = apiKey ? new Resend(apiKey) : null;

export interface EmailPayload {
  subject: string;
  heading: string;
  body: string;
  url?: string;
}

/** Emails a single user directly (task/litige assignment notifications only —
 * chat stays push-only to avoid flooding inboxes on every message). Silently
 * no-ops if Resend isn't configured, same fail-open pattern as notifyUser. */
export async function emailUser(to: string, payload: EmailPayload): Promise<void> {
  if (!resend || !from) return;

  const appUrl = payload.url ? `https://evotasks.app${payload.url}` : "https://evotasks.app";
  try {
    await resend.emails.send({
      from,
      to,
      subject: payload.subject,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #e2231a;">${payload.heading}</h2>
          <p style="color: #334155; font-size: 14px;">${payload.body}</p>
          <a href="${appUrl}" style="display: inline-block; margin-top: 12px; padding: 10px 16px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px;">Open EvoTasks</a>
        </div>
      `,
    });
  } catch {
    // Best-effort — a failed email should never block the task/litige write that triggered it.
  }
}
