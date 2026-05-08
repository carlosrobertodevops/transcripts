'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Mic, Video, X, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';

interface MediaFile {
  file: File;
  id: string;
}

interface MediaDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxSize?: number;
  multiple?: boolean;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function MediaDropzone({
  onFilesSelected,
  maxSize = MAX_FILE_SIZE,
  multiple = true,
}: MediaDropzoneProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles: File[] = [];

      acceptedFiles.forEach((file) => {
        // Validar tipo
        if (
          !file.type.startsWith('audio/') &&
          !file.type.startsWith('video/')
        ) {
          toast.error(`${file.name} não é áudio ou vídeo`);
          return;
        }

        // Validar tamanho
        if (file.size > maxSize) {
          toast.error(
            `${file.name} excede ${formatBytes(maxSize)}`
          );
          return;
        }

        // Verificar duplicata (nome + tamanho)
        const isDuplicate = mediaFiles.some(
          (mf) => mf.file.name === file.name && mf.file.size === file.size
        );

        if (isDuplicate) {
          toast.error(`${file.name} já foi adicionado`);
          return;
        }

        validFiles.push(file);
      });

      if (validFiles.length > 0) {
        const newFiles: MediaFile[] = validFiles.map((file) => ({
          file,
          id: `${file.name}-${file.size}-${Date.now()}`,
        }));

        const updated = multiple
          ? [...mediaFiles, ...newFiles]
          : newFiles;

        setMediaFiles(updated);
        onFilesSelected(updated.map((mf) => mf.file));
        toast.success(
          `${validFiles.length} arquivo(s) adicionado(s)`
        );
      }
    },
    [mediaFiles, onFilesSelected, maxSize, multiple]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': [],
      'video/*': [],
    },
  });

  const removeFile = (id: string) => {
    const updated = mediaFiles.filter((mf) => mf.id !== id);
    setMediaFiles(updated);
    onFilesSelected(updated.map((mf) => mf.file));
  };

  const getFileIcon = (type: string) => {
    return type.startsWith('audio/') ? (
      <Mic className="h-4 w-4" />
    ) : (
      <Video className="h-4 w-4" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border bg-background hover:border-primary/50'
          }
        `}
      >
        <input {...getInputProps()} />
        <UploadCloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <>
            <p className="text-lg font-medium text-primary">
              Solte arquivos aqui...
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-medium mb-2">
              Arraste arquivos ou clique para selecionar
            </p>
            <p className="text-sm text-muted-foreground">
              Áudio ou vídeo, máx {formatBytes(maxSize)}
            </p>
          </>
        )}
      </div>

      {/* File List */}
      {mediaFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {mediaFiles.length} arquivo(s) selecionado(s)
          </p>
          <div className="space-y-2">
            {mediaFiles.map((mf) => (
              <div
                key={mf.id}
                className="flex items-center justify-between bg-card border border-border rounded-lg p-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(mf.file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {mf.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(mf.file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(mf.id)}
                  className="ml-2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
