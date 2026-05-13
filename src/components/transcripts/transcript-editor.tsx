"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, X } from "lucide-react";
import { useRouter } from "next/navigation";

const schema = z.object({
  analysis: z.string().max(5000, "Análise não pode exceder 5000 caracteres"),
});

type FormData = z.infer<typeof schema>;

interface TranscriptEditorProps {
  transcriptId: string;
  initialContent?: string;
  onSave?: (content: string) => void;
  onCancel?: () => void;
}

export function TranscriptEditor({
  transcriptId,
  initialContent = "",
  onSave,
  onCancel,
}: TranscriptEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { analysis: initialContent },
  });

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }

    router.back();
  }
  async function handleSave(data: FormData) {
    setSaving(true);
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: data.analysis }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Erro ao salvar");

      toast.success("Análise salva com sucesso");
      onSave?.(data.analysis);
    } catch (error) {
      toast.error("Erro ao salvar análise");
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
      <Textarea
        placeholder="Escreva sua análise aqui..."
        {...form.register("analysis")}
        disabled={saving}
        className="min-h-48 resize-none"
      />
      {form.formState.errors.analysis && (
        <p className="text-xs text-destructive">
          {form.formState.errors.analysis.message}
        </p>
      )}
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={saving}
        >
          <X className="size-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="size-4 mr-2" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
