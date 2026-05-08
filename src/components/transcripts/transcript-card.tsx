"use client";

import { Mic, Clock, GripVertical, Loader2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Transcript = {
  id: string;
  title: string;
  operationName: string | null;
  analysis: string | null;
  status: "pending" | "processing" | "done" | "failed";
  position: number;
  createdAt: string;
  updatedAt: string;
  media: Array<{ id: string; filename: string; mime: string; durationSeconds: number | null }>;
};

interface TranscriptCardProps {
  transcript: Transcript;
  onClick?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

function relativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `há ${diffMins}m`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays}d`;
  return then.toLocaleDateString("pt-BR");
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m${secs}s`;
}

function getStatusBadge(status: Transcript["status"]) {
  const variants = {
    pending: { variant: "outline" as const, label: "Pendente" },
    processing: { variant: "secondary" as const, label: "Processando" },
    done: { variant: "default" as const, label: "Concluída" },
    failed: { variant: "destructive" as const, label: "Falhou" },
  };
  return variants[status];
}

export function TranscriptCard({ transcript, onClick, dragHandleProps }: TranscriptCardProps) {
  const { variant, label } = getStatusBadge(transcript.status);
  const totalDuration = transcript.media.reduce((acc, m) => acc + (m.durationSeconds ?? 0), 0);

  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden transition-all cursor-pointer",
        "hover:border-primary/40 hover:scale-105",
        onClick && "cursor-pointer"
      )}
    >
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-4" />
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold truncate line-clamp-2">
              {transcript.title}
            </CardTitle>
            {transcript.operationName && (
              <p className="text-xs text-muted-foreground truncate">{transcript.operationName}</p>
            )}
          </div>
          <Badge variant={variant} className="shrink-0 whitespace-nowrap">
            {transcript.status === "processing" && <Loader2 className="size-3 mr-1 animate-spin" />}
            {label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {transcript.analysis && (
          <p className="text-xs text-muted-foreground line-clamp-3">{transcript.analysis}</p>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Mic className="size-3.5" />
          <span>{transcript.media.length} mídia(s)</span>
          {totalDuration > 0 && <span>• {formatDuration(totalDuration)}</span>}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="size-3.5" />
          <span>{relativeTime(transcript.createdAt)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
