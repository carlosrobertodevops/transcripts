import { db } from "@/db/client";
import { notifications } from "@/db/schema";

export async function createNotification(
  userId: string,
  type: string,
  payload: any
): Promise<void> {
  await db.insert(notifications).values({
    userId,
    type,
    payload: JSON.stringify(payload),
    readAt: null,
  });
}
