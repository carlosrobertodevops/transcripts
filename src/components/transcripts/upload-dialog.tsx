"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileAudio, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type MediaFile = {
  id: string;
  filename: string;
  mime: string;
  durationSeconds: number | null;
};

interface UploadDialogProps {
  transcriptId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onUploaded?: (media: MediaFile[]) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function UploadDialog({ transcriptId, open, setOpen, onUploaded }: UploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "audio/*": [".mp3", ".wav", ".aac", ".flac", ".m4a"], "video/*": [".mp4", ".webm", ".mkv"] },
    multiple: true,
  });

  async function handleUpload() {
    if (files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      setUploadProgress(0);
      const res = await fetch(`/api/transcripts/${transcriptId}/media`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Upload failed");

      const media: MediaFile[] = await res.json();
      toast.success(`${media.length} mídia(s) enviadas — transcrevendo...`);
      onUploaded?.(media);
      setFiles([]);
      setOpen(false);
      setUploadProgress(0);
    } catch (error) {
      toast.error("Erro ao enviar mídia");
      console.error(error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar mídia</DialogTitle>
          <DialogDescription>Envie áudio ou vídeo para transcrever</DialogDescription>
        </DialogHeader>

        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="size-10 mx-auto text-muted-foreground mb-2" />
          <p className="font-medium text-sm">Solte os arquivos aqui</p>
          <p className="text-xs text-muted-foreground">ou clique para selecionar</p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-sm text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <FileAudio className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="p-1 hover:bg-background rounded"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Enviando...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={files.length === 0 || uploading}>
            {uploading ? `Enviando (${files.length})...` : `Enviar (${files.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
