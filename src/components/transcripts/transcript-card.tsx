"use client";

import {
  Mic,
  Clock,
  GripVertical,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Calendar,
  FileText,
  Briefcase,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

const stripHtml = (s: string): string =>
  s
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

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
  media: Array<{
    id: string;
    filename: string;
    mime: string;
    durationSeconds: number | null;
  }>;
};

interface TranscriptCardProps {
  transcript: Transcript;
  onClick?: () => void;
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

const relativeTime = (date: string): string => {
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
};

const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m${secs}s`;
};

const formatDate = (value: string | null): string | null => {
  if (!value) return null;
  const d = dayjs(value);
  if (!d.isValid()) return null;
  return d.format("DD/MM/YYYY");
};

const getStatusBadge = (status: Transcript["status"]) => {
  const variants = {
    pending: { variant: "outline" as const, label: "Pendente" },
    processing: { variant: "secondary" as const, label: "Processando" },
    done: { variant: "default" as const, label: "Concluída" },
    failed: { variant: "destructive" as const, label: "Falhou" },
  };
  return variants[status];
};

export const TranscriptCard = ({
  transcript,
  onClick,
  onOpen,
  onEdit,
  onDelete,
  dragHandleProps,
}: TranscriptCardProps) => {
  const { variant, label } = getStatusBadge(transcript.status);
  const totalDuration = (transcript.media ?? []).reduce(
    (acc, m) => acc + (m.durationSeconds ?? 0),
    0,
  );
  const operationDate = formatDate(transcript.operationDate);
  const transcriptionDate = formatDate(transcript.transcriptionDate);

  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden group transition-all duration-300 ease-out cursor-pointer h-full flex flex-col min-h-[320px]",
        "hover:border-primary/40 hover:scale-[1.02] glass-border-animated",
        onClick && "cursor-pointer",
      )}
    >
      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="size-4" />
                <span className="sr-only">Ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
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

      <CardHeader className="pb-4 pt-6 px-6">
        <div className="flex items-start justify-between gap-3 pr-20">
          <div className="flex-1 min-w-0 space-y-1.5">
            <CardTitle className="text-lg font-semibold line-clamp-2 leading-snug">
              {transcript.title}
            </CardTitle>
            {transcript.operationName && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                <Briefcase className="size-4 shrink-0" />
                <span className="truncate">{transcript.operationName}</span>
              </p>
            )}
          </div>
          <Badge variant={variant} className="shrink-0 whitespace-nowrap">
            {transcript.status === "processing" && (
              <Loader2 className="size-3 mr-1 animate-spin" />
            )}
            {label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 px-6 pb-5">
        {(operationDate || transcriptionDate) && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {operationDate && (
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
                  Operação
                </span>
                <span className="flex items-center gap-1.5 font-medium text-foreground truncate">
                  <Calendar className="size-4 shrink-0 text-muted-foreground" />
                  {operationDate}
                </span>
              </div>
            )}
            {transcriptionDate && (
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
                  Transcrição
                </span>
                <span className="flex items-center gap-1.5 font-medium text-foreground truncate">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  {transcriptionDate}
                </span>
              </div>
            )}
          </div>
        )}

        {transcript.analysis && stripHtml(transcript.analysis).length > 0 ? (
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {stripHtml(transcript.analysis)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/60 italic">
            Sem análise registrada
          </p>
        )}

        {(transcript.media?.length ?? 0) > 0 && (
          <div className="flex flex-col gap-1 mt-auto">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
              Mídias ({transcript.media.length})
            </span>
            <ul className="flex flex-col gap-1">
              {transcript.media.slice(0, 3).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0"
                  title={m.filename}
                >
                  <Mic className="size-3.5 shrink-0" />
                  <span className="truncate">{m.filename}</span>
                </li>
              ))}
              {transcript.media.length > 3 && (
                <li className="text-xs text-muted-foreground/70 italic">
                  +{transcript.media.length - 3} mídia(s)…
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between text-sm border-t px-6 py-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mic className="size-4" />
          <span>{transcript.media?.length ?? 0} mídia(s)</span>
          {totalDuration > 0 && (
            <span>• {formatDuration(totalDuration)}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="size-4" />
          <span>{relativeTime(transcript.createdAt)}</span>
        </div>
      </CardFooter>
    </Card>
  );
};
