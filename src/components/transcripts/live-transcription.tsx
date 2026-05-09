"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, FileAudio, Clock } from "lucide-react";

type JobStatus = "pending" | "processing" | "done" | "failed";

interface LiveJob {
  id: string;
  mediaId: string;
  filename: string;
  status: JobStatus;
  error?: string;
  transcriptText: string;
  segmentCount: number;
}

interface LiveTranscriptionProps {
  transcriptId: string;
  enabled: boolean;
  onAllDone?: () => void;
  pollIntervalMs?: number;
  charPerTickMs?: number;
}

const POLL_DEFAULT = 1000;
const TYPE_TICK_DEFAULT = 25;

export const LiveTranscription = ({
  transcriptId,
  enabled,
  onAllDone,
  pollIntervalMs = POLL_DEFAULT,
  charPerTickMs = TYPE_TICK_DEFAULT,
}: LiveTranscriptionProps) => {
  const [jobs, setJobs] = useState<LiveJob[]>([]);
  const [rendered, setRendered] = useState<Record<string, string>>({});
  const targetRef = useRef<Record<string, string>>({});
  const renderedRef = useRef<Record<string, string>>({});
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const typeRef = useRef<NodeJS.Timeout | null>(null);
  const doneFiredRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    doneFiredRef.current = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/transcripts/${transcriptId}/jobs`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { jobs: LiveJob[] };
        const next = data.jobs ?? [];
        setJobs(next);

        const targets: Record<string, string> = {};
        for (const j of next) targets[j.mediaId] = j.transcriptText ?? "";
        targetRef.current = targets;

        const allTerminal = next.length > 0 && next.every(
          (j) => j.status === "done" || j.status === "failed"
        );
        const fullyTyped = next.every(
          (j) => (renderedRef.current[j.mediaId]?.length ?? 0) >= (j.transcriptText?.length ?? 0)
        );

        if (allTerminal && fullyTyped && !doneFiredRef.current) {
          doneFiredRef.current = true;
          onAllDone?.();
        }
      } catch (err) {
        console.error("[live-transcription] poll", err);
      }
    };

    poll();
    pollRef.current = setInterval(poll, pollIntervalMs);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [enabled, transcriptId, pollIntervalMs, onAllDone]);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      let changed = false;
      const next = { ...renderedRef.current };
      for (const [mid, target] of Object.entries(targetRef.current)) {
        const cur = next[mid] ?? "";
        if (cur.length < target.length) {
          const remaining = target.length - cur.length;
          const step = Math.max(1, Math.min(remaining, Math.ceil(remaining / 40)));
          next[mid] = target.slice(0, cur.length + step);
          changed = true;
        }
      }
      if (changed) {
        renderedRef.current = next;
        setRendered(next);
      }
    };

    typeRef.current = setInterval(tick, charPerTickMs);
    return () => {
      if (typeRef.current) clearInterval(typeRef.current);
    };
  }, [enabled, charPerTickMs]);

  if (!enabled || jobs.length === 0) return null;

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Transcrição em tempo real
      </div>

      <AnimatePresence initial={false}>
        {jobs.map((job) => {
          const text = rendered[job.mediaId] ?? "";
          const target = job.transcriptText ?? "";
          const typing = text.length < target.length;
          const showCursor = job.status === "processing" || job.status === "pending" || typing;
          return (
            <motion.div
              key={job.mediaId}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileAudio className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <p className="text-xs font-medium truncate" title={job.filename}>
                    {job.filename}
                  </p>
                </div>
                <StatusBadge status={job.status} segmentCount={job.segmentCount} />
              </div>

              {job.status === "failed" && job.error ? (
                <p className="text-xs text-destructive">{job.error}</p>
              ) : (
                <div className="rounded-sm bg-background/60 px-2 py-1.5 text-xs leading-relaxed text-foreground/90 max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {text || (
                    <span className="text-muted-foreground italic">
                      {job.status === "pending" ? "Aguardando processamento..." : "Aguardando segmentos..."}
                    </span>
                  )}
                  {showCursor && text && (
                    <span className="ml-0.5 inline-block w-1.5 h-3 bg-primary align-middle animate-pulse" />
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

interface StatusBadgeProps {
  status: JobStatus;
  segmentCount: number;
}

const StatusBadge = ({ status, segmentCount }: StatusBadgeProps) => {
  const config: Record<JobStatus, { label: string; icon: React.ReactNode }> = {
    pending: { label: "Pendente", icon: <Clock className="h-3 w-3" /> },
    processing: { label: "Processando", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    done: { label: `${segmentCount} segmentos`, icon: <CheckCircle2 className="h-3 w-3" /> },
    failed: { label: "Falhou", icon: <AlertCircle className="h-3 w-3" /> },
  };
  const { label, icon } = config[status];
  return (
    <Badge variant={status === "failed" ? "destructive" : "secondary"} className="shrink-0 gap-1 text-[10px]">
      {icon}
      {label}
    </Badge>
  );
};
