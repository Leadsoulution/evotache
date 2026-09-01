import { sendPushToUser } from "@/lib/push";

export interface NotifyPayload {
  title: string;
  body: string;
  url?: string;
  /** Stickier push (vibrate pattern, stays until dismissed instead of
   * auto-clearing) — for the rare notification meant to actually grab
   * someone's attention like an alarm, not blend in with routine ones
   * (task assignment, chat, ...). See sw.js for how this is applied. */
  alarm?: boolean;
}

/** Sends a push notification to every device this user has subscribed from.
 * Called from server routes whenever a task/purchase/message assigns or
 * notifies a user. */
export async function notifyUser(userId: string, payload: NotifyPayload): Promise<void> {
  await sendPushToUser(userId, payload);
}
