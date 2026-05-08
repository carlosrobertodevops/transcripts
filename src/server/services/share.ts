import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, shares, notifications } from "@/db/schema";

interface ShareTranscriptParams {
  transcriptId: string;
  ownerId: string;
  email: string;
  canEdit: boolean;
}

export async function shareTranscript({
  transcriptId,
  ownerId,
  email,
  canEdit,
}: ShareTranscriptParams) {
  // Find user by email
  const targetUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((rows) => rows[0]);

  if (!targetUser) {
    throw new Error("user_not_found");
  }

  // Verify ownership
  const transcript = await db.query.transcripts.findFirst({
    where: (t) => eq(t.id, transcriptId),
  });

  if (!transcript || transcript.ownerId !== ownerId) {
    throw new Error("Unauthorized");
  }

  // Insert or ignore on conflict (unique constraint)
  await db.insert(shares).values({
    transcriptId,
    ownerId,
    sharedWithUserId: targetUser.id,
    canEdit,
  });

  // Create notification
  await db.insert(notifications).values({
    userId: targetUser.id,
    type: "transcript_shared",
    payload: { transcriptId, sharedBy: ownerId },
  });

  // Return share record
  const share = await db
    .select()
    .from(shares)
    .where(eq(shares.transcriptId, transcriptId))
    .limit(1)
    .then((rows) => rows[0]);

  return share;
}
