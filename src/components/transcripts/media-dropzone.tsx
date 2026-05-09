"use client";

import { useCallback } from "react";
import { Upload, Music, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  isLoading: boolean;
}

const ACCEPTED_TYPES = ["audio/*", "video/*"];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export const MediaDropzone = ({
  onFilesSelected,
  isLoading,
}: MediaDropzoneProps) => {
  const validateFiles = useCallback((files: File[]): File[] => {
    return files.filter((file) => {
      const isValidType = ACCEPTED_TYPES.some((type) => {
        if (type === "audio/*") return file.type.startsWith("audio/");
        if (type === "video/*") return file.type.startsWith("video/");
        return file.type === type;
      });

      const isValidSize = file.size <= MAX_FILE_SIZE;

      return isValidType && isValidSize;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const files = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(files);

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [validateFiles, onFilesSelected]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.currentTarget.files || []);
      const validFiles = validateFiles(files);

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }

      e.currentTarget.value = "";
    },
    [validateFiles, onFilesSelected]
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="text-muted-foreground">
            <Upload className="h-8 w-8 mx-auto" />
          </div>
          <div>
            <p className="text-sm font-medium">Arraste arquivos aqui</p>
            <p className="text-xs text-muted-foreground">
              ou clique para selecionar
            </p>
          </div>
        </div>
        <input
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileInputChange}
          disabled={isLoading}
          className="hidden"
          id="file-input"
        />
      </div>

      <label htmlFor="file-input">
        <Button asChild disabled={isLoading} className="w-full">
          <span>Selecionar arquivos</span>
        </Button>
      </label>

      <p className="text-xs text-muted-foreground text-center">
        Arquivos suportados: áudio ou vídeo (máximo 500MB)
      </p>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4" />
          <span>Áudio</span>
        </div>
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4" />
          <span>Vídeo</span>
        </div>
      </div>
    </div>
  );
};
