"use client";

import { useEffect, useState, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface JobInfo {
  id: string;
  mediaId: string;
  filename: string;
  status: "pending" | "processing" | "done" | "failed";
  error?: string;
  transcriptText?: string;
}

interface TranscriptionProgressProps {
  transcriptId: string;
  jobs: JobInfo[];
  onComplete?: (allDone: boolean) => void;
}

export function TranscriptionProgress({
  transcriptId,
  jobs: initialJobs,
  onComplete,
}: TranscriptionProgressProps) {
  const [jobs, setJobs] = useState<JobInfo[]>(initialJobs);
  const [polling, setPolling] = useState(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const allDone = jobs.every((j) => j.status === "done" || j.status === "failed");

  useEffect(() => {
    if (allDone) {
      setPolling(false);
      onComplete?.(true);
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/transcripts/${transcriptId}/jobs`, {
          credentials: "include",
        });

        if (!res.ok) {
          console.error("Failed to fetch job status");
          return;
        }

        const { jobs: newJobs } = await res.json();
        setJobs(newJobs || []);

        if (newJobs?.every((j: JobInfo) => j.status === "done" || j.status === "failed")) {
          setPolling(false);
          onComplete?.(true);
        }
      } catch (error) {
        console.error("Poll error:", error);
      }
    };

    if (polling) {
      poll();
      pollIntervalRef.current = setInterval(poll, 3000);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [polling, allDone, transcriptId, onComplete]);

  return (
    <div className="space-y-3 py-4 border-t">
      {jobs.map((job) => (
        <div key={job.id} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{job.filename}</p>
            </div>
            <StatusBadge status={job.status} />
          </div>

          {/* Progress bar */}
          <Progress
            value={
              job.status === "pending" ? 0 : job.status === "processing" ? 50 : 100
            }
            className="h-2"
          />

          {/* Error message */}
          {job.status === "failed" && job.error && (
            <p className="text-xs text-destructive">{job.error}</p>
          )}

          {/* Transcript preview (when done) */}
          {job.status === "done" && job.transcriptText && (
            <div className="mt-2 p-2 rounded-md bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground line-clamp-3">
                {job.transcriptText}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "pending" | "processing" | "done" | "failed";
}) {
  const variants: Record<typeof status, { variant: any; icon: any; label: string }> = {
    pending: {
      variant: "secondary",
      icon: null,
      label: "Pendente",
    },
    processing: {
      variant: "default",
      icon: Loader2,
      label: "Processando",
    },
    done: {
      variant: "outline",
      icon: CheckCircle2,
      label: "Concluído",
    },
    failed: {
      variant: "destructive",
      icon: AlertCircle,
      label: "Falhou",
    },
  };

  const { variant, icon: Icon, label } = variants[status];

  return (
    <Badge variant={variant} className="shrink-0 gap-1">
      {Icon && <Icon className="h-3 w-3" />}
      {status === "processing" && <span className="animate-spin inline-block">⟳</span>}
      {label}
    </Badge>
  );
}
