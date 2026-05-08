import { requireUser, getTranscriptsForUser } from "@/lib/auth-server";
import { TranscriptGrid } from "@/components/transcripts/transcript-grid";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const list = await getTranscriptsForUser(user.id, q);

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
      <TranscriptGrid initial={list as any} />
    </div>
  );
}
