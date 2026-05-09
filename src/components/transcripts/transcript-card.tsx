"use client";

import { Mic, Clock, GripVertical, Loader2, MoreVertical, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Transcript = {
  id: string;
  title: string;
  operationName: string | null;
  operationDate: string | null;
  transcriptionDate: string | null;
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
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
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

export function TranscriptCard({ transcript, onClick, onOpen, onEdit, onDelete, dragHandleProps }: TranscriptCardProps) {
  const { variant, label } = getStatusBadge(transcript.status);
  const totalDuration = transcript.media.reduce((acc, m) => acc + (m.durationSeconds ?? 0), 0);

  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden group transition-all duration-300 ease-out cursor-pointer h-full flex flex-col",
        "hover:border-primary/40 hover:scale-[1.02] glass-border-animated",
        onClick && "cursor-pointer"
      )}
    >
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="size-4" />
                <span className="sr-only">Ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {onOpen && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen();
                  }}
                >
                  <ExternalLink className="mr-2 size-4" />
                  Abrir página
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Apagar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="p-1 text-muted-foreground hover:text-foreground cursor-grab"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-4" />
          </div>
        )}
      </div>

      <CardHeader>
        <div className="flex items-start justify-between gap-2 pr-16">
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

      <CardContent className="flex-1 min-h-[3.5rem]">
        {transcript.analysis ? (
          <p className="text-xs text-muted-foreground line-clamp-3">{transcript.analysis}</p>
        ) : (
          <p className="text-xs text-muted-foreground italic">Sem análise registrada</p>
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
