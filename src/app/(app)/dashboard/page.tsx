import { requireUser, getTranscriptsForUser } from "@/lib/auth-server";
import { TranscriptGrid } from "@/components/transcripts/transcript-grid";

type TranscriptStatus = "pending" | "processing" | "done" | "failed";

const toIso = (d: Date | null) => (d ? d.toISOString() : null);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const list = await getTranscriptsForUser(user.id, q);

  const initial = list.map((t) => ({
    id: t.id,
    title: t.title,
    operationName: t.operationName,
    operationDate: toIso(t.operationDate),
    transcriptionDate: toIso(t.transcriptionDate),
    analysis: t.analysis,
    status: t.status as TranscriptStatus,
    position: t.position ?? 0,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    media: t.media.map((m) => ({
      id: m.id,
      filename: m.filename,
      mime: m.mime,
      durationSeconds: m.durationSeconds,
    })),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Suas transcrições
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie e revise transcrições em português brasileiro.
        </p>
      </header>
      <TranscriptGrid initial={initial} />
    </div>
  );
}
