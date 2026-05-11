import { notFound } from "next/navigation";
import { requireUser, getTranscriptDetail } from "@/lib/auth-server";
import { TranscriptEditor } from "@/components/transcripts/transcript-editor";
import { MediaSection } from "@/components/transcripts/media-section";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getTranscriptDetail(id, user.id);

  if (!data) notFound();

  return (
    <div className="space-y-6">
      <MediaSection
        transcriptId={id}
        initialMedia={data.media || []}
        initialSegments={data.segments || []}
      />
      <TranscriptEditor transcriptId={data.id} initialContent={data.analysis ?? ""} />
    </div>
  );
}
