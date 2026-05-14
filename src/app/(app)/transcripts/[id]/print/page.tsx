import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/db/client";
import {
  transcripts as transcriptsTable,
  media,
  transcriptSegments,
  shares,
  users,
} from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { PrintView } from "./print-view";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const Page = async ({ params }: PageProps) => {
  const user = await requireUser();
  const { id } = await params;

  const rows = await db
    .select()
    .from(transcriptsTable)
    .where(and(eq(transcriptsTable.id, id), isNull(transcriptsTable.deletedAt)))
    .limit(1);
  if (rows.length === 0) notFound();
  const t = rows[0];

  if (t.ownerId !== user.id) {
    const share = await db
      .select({ id: shares.id })
      .from(shares)
      .where(
        and(eq(shares.transcriptId, id), eq(shares.sharedWithUserId, user.id)),
      )
      .limit(1);
    if (share.length === 0) notFound();
  }

  const mediaList = await db
    .select()
    .from(media)
    .where(eq(media.transcriptId, id));

  const mediaIds = mediaList.map((m) => m.id);
  const segs =
    mediaIds.length > 0
      ? await db
          .select()
          .from(transcriptSegments)
          .where(inArray(transcriptSegments.mediaId, mediaIds))
      : [];

  const ownerRow = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, t.ownerId))
    .limit(1);

  return (
    <PrintView
      transcript={{
        id: t.id,
        title: t.title,
        operationName: t.operationName,
        operationDate: t.operationDate ? t.operationDate.toISOString() : null,
        transcriptionDate: t.transcriptionDate
          ? t.transcriptionDate.toISOString()
          : null,
        analysis: t.analysis,
        status: t.status,
      }}
      media={mediaList.map((m) => ({ id: m.id, filename: m.filename, hash: m.hash }))}
      segments={segs.map((s) => ({
        id: s.id,
        mediaId: s.mediaId,
        startMs: s.startMs,
        endMs: s.endMs,
        text: s.text,
      }))}
      ownerName={ownerRow[0]?.name ?? null}
      ownerEmail={ownerRow[0]?.email ?? null}
    />
  );
};

export default Page;
