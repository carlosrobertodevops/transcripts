"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Textarea } from "@/components/ui/textarea";
import { LiveTranscription } from "@/components/transcripts/live-transcription";
import { segmentsToHighlightedHtml, type TagRef } from "@/lib/highlight-tags";
import { toast } from "sonner";
import { Loader2, RotateCcw, Trash2, FileAudio, Music, FileVideo, X, Sparkles, Wand2 } from "lucide-react";

interface PendingFile {
  file: File;
  description: string;
}

interface MediaItem {
  id: string;
  filename: string;
  mime: string;
  sizeBytes: number | null;
  durationSeconds: number | null;
  description: string | null;
}

interface SegmentItem {
  id: string;
  mediaId: string;
  startMs: number;
  endMs: number;
  text: string;
}

const formatSize = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (secs: number | null) => {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const schema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200),
  operationName: z.string().max(100).optional().nullable(),
  operationDate: z.string().optional().nullable(),
  transcriptionDate: z.string().optional().nullable(),
  analysis: z.string().max(5000).optional().nullable(),
});

type FormData = z.infer<typeof schema>;

interface TranscriptLite {
  id: string;
  title: string;
  operationName: string | null;
  operationDate: string | null;
  transcriptionDate: string | null;
  analysis: string | null;
  transcriptHtml?: string | null;
}

interface EditTranscriptDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  transcript: TranscriptLite | null;
  onSaved?: (updated: TranscriptLite) => void;
}

export const EditTranscriptDialog = ({ open, setOpen, transcript, onSaved }: EditTranscriptDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [segments, setSegments] = useState<SegmentItem[]>([]);
  const [retranscribingId, setRetranscribingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [liveActive, setLiveActive] = useState(false);
  const [mediaDescDrafts, setMediaDescDrafts] = useState<Record<string, string>>({});
  const [savingMediaId, setSavingMediaId] = useState<string | null>(null);
  const [tagList, setTagList] = useState<TagRef[]>([]);
  const [transcriptHtml, setTranscriptHtml] = useState<string>("");
  const [savedTranscriptHtml, setSavedTranscriptHtml] = useState<string>("");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", operationName: "", operationDate: "", transcriptionDate: "", analysis: "" },
  });

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { tags: TagRef[] };
        setTagList(data.tags ?? []);
      }
    } catch (err) {
      console.error("[edit-dialog] fetch tags", err);
    }
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/transcripts/${id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const list: MediaItem[] = data.media ?? [];
        setMediaList(list);
        setSegments(data.segments ?? []);
        const drafts: Record<string, string> = {};
        for (const m of list) drafts[m.id] = m.description ?? "";
        setMediaDescDrafts(drafts);
        const stored = data.transcript?.transcriptHtml ?? "";
        setSavedTranscriptHtml(stored);
        setTranscriptHtml(stored);
      }
    } catch (err) {
      console.error("[edit-dialog] fetch detail", err);
    }
  }, []);

  useEffect(() => {
    if (transcript && open) {
      form.reset({
        title: transcript.title,
        operationName: transcript.operationName ?? "",
        operationDate: transcript.operationDate ? transcript.operationDate.slice(0, 10) : "",
        transcriptionDate: transcript.transcriptionDate ? transcript.transcriptionDate.slice(0, 10) : "",
        analysis: transcript.analysis ?? "",
      });
      setPendingFiles([]);
      fetchDetail(transcript.id);
      fetchTags();
    }
  }, [transcript, open, form, fetchDetail, fetchTags]);

  const onDrop = useCallback((accepted: File[]) => {
    const valid: PendingFile[] = accepted
      .filter((f) => {
        if (f.size > 500 * 1024 * 1024) {
          toast.error(`${f.name} excede 500MB`);
          return false;
        }
        return true;
      })
      .map((file) => ({ file, description: "" }));
    setPendingFiles((prev) => [...prev, ...valid]);
  }, []);

  const updatePendingDesc = (index: number, value: string) => {
    setPendingFiles((prev) => prev.map((p, i) => (i === index ? { ...p, description: value } : p)));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".opus"],
      "video/*": [".mp4", ".mov", ".avi", ".mkv"],
    },
  });

  const removePending = (i: number) => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleUploadAndTranscribe = async () => {
    if (!transcript || pendingFiles.length === 0) return;
    setUploading(true);
    try {
      for (const entry of pendingFiles) {
        const fd = new FormData();
        fd.append("file", entry.file);
        if (entry.description.trim().length > 0) {
          fd.append("description", entry.description);
        }
        const res = await fetch(`/api/transcripts/${transcript.id}/media`, {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Falha ao enviar ${entry.file.name}`);
      }
      toast.success(`${pendingFiles.length} arquivo(s) enviados — transcrição enfileirada`);
      setPendingFiles([]);
      setLiveActive(true);
      await fetchDetail(transcript.id);
    } catch (err) {
      toast.error("Erro ao enviar mídia");
      console.error(err);
    } finally {
      setUploading(false);
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

  const handleSaveMediaDesc = async (mediaId: string) => {
    const original = mediaList.find((m) => m.id === mediaId)?.description ?? "";
    const draft = mediaDescDrafts[mediaId] ?? "";
    if (draft === original) return;
    setSavingMediaId(mediaId);
    try {
      const res = await fetch(`/api/media/${mediaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ description: draft }),
      });
      if (!res.ok) throw new Error("falha");
      setMediaList((prev) => prev.map((m) => (m.id === mediaId ? { ...m, description: draft.length > 0 ? draft : null } : m)));
      toast.success("Descrição salva");
    } catch (err) {
      toast.error("Erro ao salvar descrição");
      console.error(err);
    } finally {
      setSavingMediaId(null);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    setDeletingId(mediaId);
    try {
      const res = await fetch(`/api/media/${mediaId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) throw new Error("falha");
      setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
      setSegments((prev) => prev.filter((s) => s.mediaId !== mediaId));
      toast.success("Mídia removida");
    } catch (err) {
      toast.error("Erro ao remover mídia");
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!transcript) return;
    setSubmitting(true);
    try {
      const transcriptHtmlPayload =
        transcriptHtml !== savedTranscriptHtml ? transcriptHtml : undefined;
      const res = await fetch(`/api/transcripts/${transcript.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: data.title,
          operationName: data.operationName || null,
          operationDate: data.operationDate || null,
          transcriptionDate: data.transcriptionDate || null,
          analysis: data.analysis || null,
          ...(transcriptHtmlPayload !== undefined ? { transcriptHtml: transcriptHtmlPayload } : {}),
        }),
      });

      if (!res.ok) throw new Error("Falha ao salvar");

      if (pendingFiles.length > 0) {
        await handleUploadAndTranscribe();
      }

      toast.success("Transcrição atualizada!");
      onSaved?.({
        id: transcript.id,
        title: data.title,
        operationName: data.operationName || null,
        operationDate: data.operationDate || null,
        transcriptionDate: data.transcriptionDate || null,
        analysis: data.analysis || null,
      });
      setOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar transcrição");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar transcrição</DialogTitle>
          <DialogDescription>Atualize dados, gerencie mídia e dispare transcrição</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título *</Label>
            <Input
              id="edit-title"
              placeholder="ex: Interceptação telemática — alvo TX-001 — sessão 03"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-operationName">Nome da operação (opcional)</Label>
            <Input
              id="edit-operationName"
              placeholder="ex: Operação Sentinela — Protocolo CX-2026/04"
              {...form.register("operationName")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-operationDate">Data da operação</Label>
              <Input id="edit-operationDate" type="date" {...form.register("operationDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-transcriptionDate">Data da transcrição</Label>
              <Input id="edit-transcriptionDate" type="date" {...form.register("transcriptionDate")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-analysis">Análise (opcional)</Label>
            <Controller
              name="analysis"
              control={form.control}
              render={({ field }) => (
                <RichTextEditor value={field.value ?? ""} onChange={field.onChange} placeholder="Resumo, codinomes identificados, próximas ações..." />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Mídia ({mediaList.length})</Label>
            {mediaList.length > 0 ? (
              <ul className="space-y-2 max-h-72 overflow-auto">
                {mediaList.map((m) => {
                  const draft = mediaDescDrafts[m.id] ?? "";
                  const dirty = draft !== (m.description ?? "");
                  return (
                    <li
                      key={m.id}
                      className="space-y-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm min-w-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileAudio className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate" title={m.filename}>{m.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatSize(m.sizeBytes)} • {formatDuration(m.durationSeconds)}
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
                          onClick={() => handleDeleteMedia(m.id)}
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
                          setMediaDescDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))
                        }
                        onBlur={() => dirty && handleSaveMediaDesc(m.id)}
                        placeholder="Descrição desta mídia (opcional)"
                        className="min-h-12 text-xs resize-none"
                        disabled={savingMediaId === m.id}
                      />
                      {dirty && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() =>
                              setMediaDescDrafts((prev) => ({ ...prev, [m.id]: m.description ?? "" }))
                            }
                          >
                            Desfazer
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => handleSaveMediaDesc(m.id)}
                            disabled={savingMediaId === m.id}
                          >
                            {savingMediaId === m.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Salvar"
                            )}
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma mídia anexada.</p>
            )}

            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-accent/30"
              }`}
            >
              <input {...getInputProps()} />
              <Music className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragActive
                  ? "Solte os arquivos aqui..."
                  : "Adicionar mídia — arraste ou clique"}
              </p>
              <p className="text-xs text-muted-foreground">
                MP3, WAV, M4A, AAC, OGG, OPUS, MP4, MOV — até 500MB cada
              </p>
            </div>

            {pendingFiles.length > 0 && (
              <>
                <ul className="space-y-2 max-h-72 overflow-auto min-w-0 w-full">
                  {pendingFiles.map((entry, index) => {
                    const file = entry.file;
                    const isVideo = file.type.startsWith("video/");
                    const Icon = isVideo ? FileVideo : Music;
                    return (
                      <li
                        key={`${file.name}-${index}`}
                        className="space-y-2 rounded-md border border-border bg-muted/30 px-2 py-2 text-sm min-w-0"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate min-w-0" title={file.name}>{file.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {(file.size / (1024 * 1024)).toFixed(1)}MB
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removePending(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <Textarea
                          value={entry.description}
                          onChange={(e) => updatePendingDesc(index, e.target.value)}
                          placeholder="Descrição desta mídia (opcional)"
                          className="min-h-12 text-xs resize-none"
                        />
                      </li>
                    );
                  })}
                </ul>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={handleUploadAndTranscribe}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando e enfileirando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Transcrever {pendingFiles.length} arquivo(s)
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {transcript && liveActive && (
            <LiveTranscription
              transcriptId={transcript.id}
              enabled={liveActive}
              tags={tagList}
              onAllDone={() => {
                setLiveActive(false);
                fetchDetail(transcript.id);
                toast.success("Transcrição concluída");
              }}
            />
          )}

          {!liveActive && segments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Transcrição ({segments.length} segmentos)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const sorted = [...segments].sort((a, b) => a.startMs - b.startMs);
                    setTranscriptHtml(segmentsToHighlightedHtml(sorted, tagList));
                  }}
                  title="Regenerar com tags atuais"
                >
                  <Wand2 className="mr-1 h-3 w-3" />
                  Aplicar tags
                </Button>
              </div>
              <RichTextEditor
                value={
                  transcriptHtml ||
                  segmentsToHighlightedHtml(
                    [...segments].sort((a, b) => a.startMs - b.startMs),
                    tagList
                  )
                }
                onChange={setTranscriptHtml}
                placeholder="Transcrição..."
              />
              {tagList.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {tagList.length} tag(s) destacadas em negrito. Clique em &quot;Aplicar tags&quot; para regenerar com as tags atuais.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || uploading}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
