import { notFound } from "next/navigation";
import { requireUser, getTranscriptDetail } from "@/lib/auth-server";
import { TranscriptEditor } from "@/components/transcripts/transcript-editor";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getTranscriptDetail(id, user.id);

  if (!data) notFound();

  return <TranscriptEditor transcriptId={data.id} initialContent={data.analysis ?? ""} />;
}
