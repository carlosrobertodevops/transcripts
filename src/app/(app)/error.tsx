"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="size-12 text-destructive" />
      <h2 className="text-xl font-semibold">Erro ao carregar página</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        {error.message || "Ocorreu um erro inesperado."}
        {error.digest ? ` (id: ${error.digest})` : null}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Tentar novamente</Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
