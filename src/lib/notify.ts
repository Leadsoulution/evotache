import { sendPushToUser } from "@/lib/push";

export interface NotifyPayload {
  title: string;
  body: string;
  url?: string;
}

/** Sends a push notification to every device this user has subscribed from.
 * Called from server routes whenever a task/purchase/message assigns or
 * notifies a user. */
export async function notifyUser(userId: string, payload: NotifyPayload): Promise<void> {
  await sendPushToUser(userId, payload);
}
