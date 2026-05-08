"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, X, Music, FileVideo } from "lucide-react";

const schema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200),
  operationName: z.string().max(100).optional().nullable(),
});

type FormData = z.infer<typeof schema>;

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

interface NewTranscriptDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onCreated?: (transcript: Transcript) => void;
}

export function NewTranscriptDialog({ open, setOpen, onCreated }: NewTranscriptDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { title: "", operationName: "" } });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > 500 * 1024 * 1024) {
        toast.error(`${file.name} excede 500MB`);
        return false;
      }
      return true;
    });
    setSelectedFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "audio/*": [".mp3", ".wav", ".m4a", ".aac"], "video/*": [".mp4", ".mov", ".avi", ".mkv"] },
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async (transcriptId: string) => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/transcripts/${transcriptId}/media`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
      }
      toast.success("Mídia enviada com sucesso!");
    } catch (error) {
      toast.error("Erro ao enviar mídia");
      console.error(error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to create transcript");

      const transcript: Transcript = await res.json();

      if (selectedFiles.length > 0) {
        await uploadMedia(transcript.id);
      }

      toast.success("Transcrição criada!");
      form.reset();
      setSelectedFiles([]);
      setOpen(false);
      onCreated?.(transcript);
      router.push(`/transcripts/${transcript.id}`);
    } catch (error) {
      toast.error("Erro ao criar transcrição");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova transcrição</DialogTitle>
          <DialogDescription>Crie uma nova transcrição e comece a adicionar mídia</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" placeholder="ex: Reunião de planejamento" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="operationName">Nome da operação (opcional)</Label>
            <Input
              id="operationName"
              placeholder="ex: Sprint Planning 2024-Q2"
              {...form.register("operationName")}
            />
          </div>

          <div className="space-y-2">
            <Label>Mídia (áudio/vídeo)</Label>
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
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
                  : "Arraste arquivos ou clique para selecionar"}
              </p>
              <p className="text-xs text-muted-foreground">
                MP3, WAV, M4A, AAC, MP4, MOV, AVI, MKV — até 500MB cada
              </p>
            </div>

            {selectedFiles.length > 0 && (
              <ul className="space-y-1 max-h-40 overflow-auto">
                {selectedFiles.map((file, index) => {
                  const isVideo = file.type.startsWith("video/");
                  const Icon = isVideo ? FileVideo : Music;
                  return (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-sm"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(1)}MB
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando mídia...
                </>
              ) : submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
