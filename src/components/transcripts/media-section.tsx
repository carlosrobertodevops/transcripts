"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Music, Video, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MediaDropzone } from "./media-dropzone";

interface Media {
  id: string;
  filename: string;
  mime: string;
  sizeBytes: number | null;
  durationSeconds: number | null;
  createdAt: Date | string;
}

interface MediaSectionProps {
  transcriptId: string;
  initialMedia: Media[];
}

const formatFileSize = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
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
  return <Music className="h-4 w-4" />;
};

export const MediaSection = ({
  transcriptId,
  initialMedia,
}: MediaSectionProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [media, setMedia] = useState<Media[]>(initialMedia);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch(
        `/api/transcripts/${transcriptId}/media`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        toast.error(
          error.error === "invalid_mime_type"
            ? "Apenas arquivos de áudio ou vídeo são permitidos"
            : error.error === "file_too_large"
              ? "Arquivo muito grande (máximo 500MB)"
              : "Erro ao fazer upload"
        );
        return;
      }

      const result = await response.json();
      setMedia((prev) => [...prev, ...result.media]);
      toast.success(
        `${result.media.length} arquivo(s) enviado(s) com sucesso`
      );
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      toast.error("Erro ao enviar arquivo");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (mediaId: string) => {
    try {
      const response = await fetch(`/api/media/${mediaId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        toast.error("Erro ao deletar arquivo");
        return;
      }

      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      toast.success("Arquivo deletado");
      router.refresh();
    } catch (err) {
      toast.error("Erro ao deletar arquivo");
      console.error(err);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Mídia</CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar mídia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar mídia</DialogTitle>
              <DialogDescription>
                Arraste ou clique para selecionar arquivos de áudio ou vídeo
                (máximo 500MB)
              </DialogDescription>
            </DialogHeader>
            <MediaDropzone
              onFilesSelected={handleUpload}
              isLoading={isUploading}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {media.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma mídia enviada</p>
        ) : (
          <div className="space-y-2">
            {media.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors min-w-0"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-muted-foreground">
                    {getMediaIcon(m.mime)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate min-w-0" title={m.filename}>
                      {m.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.sizeBytes ? formatFileSize(m.sizeBytes) : "—"} •{" "}
                      {formatDuration(m.durationSeconds || null)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(m.id)}
                  disabled={isUploading}
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
