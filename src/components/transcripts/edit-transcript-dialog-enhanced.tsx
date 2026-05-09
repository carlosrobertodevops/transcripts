"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "sonner";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";

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
}

interface MediaItem {
  id: string;
  filename: string;
  sizeBytes: number;
  durationSeconds: number | null;
}

interface Segment {
  id: string;
  mediaId: string;
  text: string;
  startMs: number;
  endMs: number;
}

interface EditTranscriptDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  transcript: TranscriptLite | null;
  onSaved?: (updated: TranscriptLite) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return "—";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

export const EditTranscriptDialog = ({ open, setOpen, transcript, onSaved }: EditTranscriptDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [retranscribingId, setRetranscribingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", operationName: "", operationDate: "", transcriptionDate: "", analysis: "" },
  });

  // FETCH media + segments quando dialog abre
  useEffect(() => {
    const fetchData = async () => {
      if (!transcript || !open) return;

      setLoading(true);
      try {
        const res = await fetch(`/api/transcripts/${transcript.id}`, {
          credentials: "include",
        });

        if (res.ok) {
          const { media: fetchedMedia, segments: fetchedSegments } = await res.json();
          setMediaList(fetchedMedia || []);
          setSegments(fetchedSegments || []);
        }
      } catch (err) {
        console.error("Erro ao carregar mídia e segmentos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [transcript, open]);

  // RESET form quando transcript muda
  useEffect(() => {
    if (transcript && open) {
      form.reset({
        title: transcript.title,
        operationName: transcript.operationName ?? "",
        operationDate: transcript.operationDate ? transcript.operationDate.slice(0, 10) : "",
        transcriptionDate: transcript.transcriptionDate ? transcript.transcriptionDate.slice(0, 10) : "",
        analysis: transcript.analysis ?? "",
      });
    }
  }, [transcript, open, form]);

  // RETRANSCRIBE media
  const handleRetranscribe = async (mediaId: string) => {
    setRetranscribingId(mediaId);
    try {
      const res = await fetch(`/api/media/${mediaId}/retranscribe`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Falha ao recriar transcrição");

      toast.success("Transcrição refeita — job enfileirado");
      // Segments serão atualizados na próxima fetch
    } catch (err) {
      toast.error("Erro ao refazer transcrição");
      console.error(err);
    } finally {
      setRetranscribingId(null);
    }
  };

  // DELETE media
  const handleDeleteMedia = async (mediaId: string) => {
    setDeletingId(mediaId);
    try {
      const res = await fetch(`/api/media/${mediaId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Falha ao remover");

      toast.success("Mídia removida");
      setMediaList(mediaList.filter((m) => m.id !== mediaId));
      setSegments(segments.filter((s) => s.mediaId !== mediaId));
    } catch (err) {
      toast.error("Erro ao remover mídia");
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  // CONCAT segments
  const concatenatedText = segments
    .sort((a, b) => a.startMs - b.startMs)
    .map((s) => s.text)
    .join(" ");

  const onSubmit = async (data: FormData) => {
    if (!transcript) return;
    setSubmitting(true);
    try {
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
        }),
      });

      if (!res.ok) throw new Error("Falha ao salvar");

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
          <DialogDescription>Atualize os dados da transcrição</DialogDescription>
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
                <RichTextEditor
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Resumo, codinomes identificados, próximas ações..."
                />
              )}
            />
          </div>

          {/* MÍDIAS ANEXADAS */}
          <div className="space-y-2 border-t pt-4">
            <Label className="text-sm font-semibold">Mídias anexadas</Label>
            {loading ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : mediaList.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhuma mídia</p>
            ) : (
              <div className="space-y-2">
                {mediaList.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-xs bg-muted p-2 rounded border border-border"
                  >
                    <div className="flex-1">
                      <p className="font-mono truncate">{m.filename}</p>
                      <p className="text-muted-foreground">
                        {formatFileSize(m.sizeBytes)} · {formatDuration(m.durationSeconds)}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={retranscribingId === m.id}
                        onClick={() => handleRetranscribe(m.id)}
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
                        size="sm"
                        disabled={deletingId === m.id}
                        onClick={() => handleDeleteMedia(m.id)}
                        title="Remover mídia"
                      >
                        {deletingId === m.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TRANSCRIÇÃO CONCATENADA */}
          <div className="space-y-2 border-t pt-4">
            <Label className="text-sm font-semibold">Transcrição</Label>
            {loading ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : segments.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Sem segmentos</p>
            ) : (
              <div className="bg-muted p-3 rounded border border-border max-h-40 overflow-y-auto">
                <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{concatenatedText}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
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
