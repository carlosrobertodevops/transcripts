"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Share2, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Email inválido"),
  canEdit: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

type Share = {
  id: string;
  email: string;
  canEdit: boolean;
  createdAt: string;
};

interface ShareDialogProps {
  transcriptId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  shares?: Share[];
}

export function ShareDialog({ transcriptId, open, setOpen, shares: initialShares }: ShareDialogProps) {
  const [shares, setShares] = useState<Share[]>(initialShares ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!initialShares);
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: "", canEdit: false } });

  useEffect(() => {
    if (open && !initialShares) {
      fetchShares();
    }
  }, [open, initialShares]);

  async function fetchShares() {
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/shares`, { credentials: "include" });
      if (res.ok) {
        setShares(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch shares:", error);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to share");

      const newShare: Share = await res.json();
      setShares((prev) => [newShare, ...prev]);
      toast.success(`Compartilhado com ${data.email}`);
      form.reset();
    } catch (error) {
      toast.error("Erro ao compartilhar");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(shareId: string) {
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/shares/${shareId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to remove share");

      setShares((prev) => prev.filter((s) => s.id !== shareId));
      toast.success("Compartilhamento removido");
    } catch (error) {
      toast.error("Erro ao remover compartilhamento");
      console.error(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar transcrição</DialogTitle>
          <DialogDescription>Convide pessoas para acessar esta transcrição</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@example.com"
              {...form.register("email")}
              disabled={submitting}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <Label htmlFor="canEdit" className="text-sm font-medium">
              Pode editar
            </Label>
            <Switch id="canEdit" {...form.register("canEdit")} disabled={submitting} />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Compartilhando..." : "Compartilhar"}
          </Button>
        </form>

        <div className="pt-4 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Compartilhado com:</p>
          {loading ? (
            <div className="text-xs text-muted-foreground">Carregando...</div>
          ) : shares.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ninguém ainda</p>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-sm text-xs"
                >
                  <div>
                    <p className="font-medium truncate">{share.email}</p>
                    <p className="text-muted-foreground">
                      {share.canEdit ? "Pode editar" : "Somente leitura"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(share.id)}
                    className="p-1 hover:bg-background rounded transition-colors"
                  >
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
