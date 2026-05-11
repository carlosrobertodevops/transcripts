"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileAudio, Music, Video, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MediaDropzone } from "./media-dropzone";
import { MediaTranscriptEditor } from "./media-transcript-editor";
import { LiveTranscription } from "./live-transcription";
import { type TagRef } from "@/lib/highlight-tags";

interface Media {
  id: string;
  filename: string;
  mime: string;
  sizeBytes: number | null;
  durationSeconds: number | null;
  description: string | null;
  transcriptHtml: string | null;
  createdAt: Date | string;
}

interface Segment {
  id: string;
  mediaId: string;
  startMs: number;
  endMs: number;
  text: string;
}

interface MediaSectionProps {
  transcriptId: string;
  initialMedia: Media[];
  initialSegments: Segment[];
}

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getMediaIcon = (mime: string) => {
  if (mime.startsWith("audio/")) return <Music className="h-4 w-4" />;
  if (mime.startsWith("video/")) return <Video className="h-4 w-4" />;
  return <FileAudio className="h-4 w-4" />;
};

export const MediaSection = ({
  transcriptId,
  initialMedia,
  initialSegments,
}: MediaSectionProps) => {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [media, setMedia] = useState<Media[]>(initialMedia);
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [tagList, setTagList] = useState<TagRef[]>([]);
  const [descDrafts, setDescDrafts] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    for (const m of initialMedia) d[m.id] = m.description ?? "";
    return d;
  });
  const [savingDescId, setSavingDescId] = useState<string | null>(null);
  const [retranscribingId, setRetranscribingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [liveActive, setLiveActive] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch("/api/tags", { credentials: "include" });
        if (res.ok) {
          const data = (await res.json()) as { tags: TagRef[] };
          setTagList(data.tags ?? []);
        }
      } catch (err) {
        console.error("[media-section] fetch tags", err);
      }
    };
    fetchTags();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMedia(data.media ?? []);
        setSegments(data.segments ?? []);
        const next: Record<string, string> = {};
        for (const m of data.media ?? []) next[m.id] = m.description ?? "";
        setDescDrafts(next);
      }
    } catch (err) {
      console.error("[media-section] refresh", err);
    }
  }, [transcriptId]);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploading(true);
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch(`/api/transcripts/${transcriptId}/media`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        toast.error(
          error.error === "invalid_mime_type"
            ? "Apenas arquivos de áudio ou vídeo são permitidos"
            : error.error === "file_too_large"
              ? "Arquivo muito grande (máximo 500MB)"
              : "Erro ao fazer upload",
        );
        return;
      }
      const result = await response.json();
      toast.success(`${result.media.length} arquivo(s) enviado(s) — transcrição enfileirada`);
      setLiveActive(true);
      await refresh();
      router.refresh();
    } catch (err) {
      toast.error("Erro ao enviar arquivo");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetranscribe = async (mediaId: string) => {
    setRetranscribingId(mediaId);
    try {
      const res = await fetch(`/api/media/${mediaId}/retranscribe`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("falha");
      toast.success("Transcrição reenfileirada");
      setSegments((prev) => prev.filter((s) => s.mediaId !== mediaId));
      setLiveActive(true);
    } catch (err) {
      toast.error("Erro ao refazer transcrição");
      console.error(err);
    } finally {
      setRetranscribingId(null);
    }
  };

  const handleSaveDesc = async (mediaId: string) => {
    const original = media.find((m) => m.id === mediaId)?.description ?? "";
    const draft = descDrafts[mediaId] ?? "";
    if (draft === original) return;
    setSavingDescId(mediaId);
    try {
      const res = await fetch(`/api/media/${mediaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ description: draft }),
      });
      if (!res.ok) throw new Error("falha");
      setMedia((prev) =>
        prev.map((m) => (m.id === mediaId ? { ...m, description: draft.length > 0 ? draft : null } : m)),
      );
      toast.success("Descrição salva");
    } catch (err) {
      toast.error("Erro ao salvar descrição");
      console.error(err);
    } finally {
      setSavingDescId(null);
    }
  };

  const handleDelete = async (mediaId: string) => {
    setDeletingId(mediaId);
    try {
      const response = await fetch(`/api/media/${mediaId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok && response.status !== 204) {
        toast.error("Erro ao deletar arquivo");
        return;
      }
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      setSegments((prev) => prev.filter((s) => s.mediaId !== mediaId));
      toast.success("Arquivo deletado");
      router.refresh();
    } catch (err) {
      toast.error("Erro ao deletar arquivo");
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mídia ({media.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MediaDropzone onFilesSelected={handleUpload} isLoading={isUploading} />
        {media.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma mídia enviada</p>
        ) : (
          <ul className="space-y-3">
            {media.map((m) => {
              const draft = descDrafts[m.id] ?? "";
              const dirty = draft !== (m.description ?? "");
              return (
                <li
                  key={m.id}
                  className="space-y-2 rounded-md border border-border bg-muted/30 px-3 py-3 text-sm min-w-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-muted-foreground shrink-0">{getMediaIcon(m.mime)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate" title={m.filename}>
                        {m.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(m.sizeBytes)} • {formatDuration(m.durationSeconds)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => handleRetranscribe(m.id)}
                      disabled={retranscribingId === m.id}
                      title="Refazer transcrição"
                    >
                      {retranscribingId === m.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive"
                      onClick={() => handleDelete(m.id)}
                      disabled={deletingId === m.id}
                      title="Remover mídia"
                    >
                      {deletingId === m.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={draft}
                    onChange={(e) =>
                      setDescDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))
                    }
                    onBlur={() => dirty && handleSaveDesc(m.id)}
                    placeholder="Descrição desta mídia (opcional)"
                    className="min-h-12 text-xs resize-none"
                    disabled={savingDescId === m.id}
                  />
                  {dirty && (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() =>
                          setDescDrafts((prev) => ({ ...prev, [m.id]: m.description ?? "" }))
                        }
                      >
                        Desfazer
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleSaveDesc(m.id)}
                        disabled={savingDescId === m.id}
                      >
                        {savingDescId === m.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Salvar"
                        )}
                      </Button>
                    </div>
                  )}
                  {liveActive ? (
                    <LiveTranscription
                      transcriptId={transcriptId}
                      mediaId={m.id}
                      enabled={liveActive}
                      tags={tagList}
                      compact
                    />
                  ) : (
                    <MediaTranscriptEditor
                      mediaId={m.id}
                      segments={segments.filter((s) => s.mediaId === m.id)}
                      initialHtml={m.transcriptHtml}
                      tags={tagList}
                      onSaved={(html) =>
                        setMedia((prev) =>
                          prev.map((mm) => (mm.id === m.id ? { ...mm, transcriptHtml: html } : mm)),
                        )
                      }
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {liveActive && (
          <div className="sr-only">
            <LiveTranscription
              transcriptId={transcriptId}
              enabled={liveActive}
              tags={tagList}
              onAllDone={async () => {
                setLiveActive(false);
                await refresh();
                toast.success("Transcrição concluída");
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
