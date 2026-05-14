"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/transcripts/status-badge";
import { NewTranscriptDialog } from "@/components/transcripts/new-transcript-dialog";
import { EditTranscriptDialog } from "@/components/transcripts/edit-transcript-dialog";
import { ExportSubmenu } from "@/components/transcripts/export-menu";
import { toast } from "sonner";
import {
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  ExternalLink,
  Pencil,
  Trash2,
  FileAudio,
} from "lucide-react";

dayjs.locale("pt-br");

interface MediaLite {
  id: string;
  filename: string;
  mime: string;
  durationSeconds: number | null;
}

interface TranscriptRow {
  id: string;
  title: string;
  operationName: string | null;
  operationDate: string | null;
  transcriptionDate: string | null;
  analysis: string | null;
  status: "pending" | "processing" | "done" | "failed";
  position: number;
  createdAt: string;
  updatedAt: string;
  media: MediaLite[];
}

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  return dayjs(iso).format("DD/MM/YYYY");
};

const TranscriptsPage = () => {
  const router = useRouter();
  const [items, setItems] = useState<TranscriptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [editingTranscript, setEditingTranscript] = useState<TranscriptRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TranscriptRow | null>(null);
  const [actorRole, setActorRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setActorRole(d.role ?? null))
      .catch(() => undefined);
  }, []);

  const canCreate = actorRole !== null && actorRole !== "viewer";
  const canMutate = canCreate;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transcripts", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } catch (err) {
      console.error("[transcripts] load", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length === 0) return items;
    return items.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.operationName ?? "").toLowerCase().includes(q) ||
        (t.analysis ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      const res = await fetch(`/api/transcripts/${confirmDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) throw new Error("falha");
      setItems((prev) => prev.filter((t) => t.id !== confirmDelete.id));
      toast.success("Transcrição removida");
      setConfirmDelete(null);
    } catch (err) {
      toast.error("Erro ao remover transcrição");
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditClick = (t: TranscriptRow) => {
    setEditingTranscript(t);
    setEditOpen(true);
  };

  const handleSaved = (updated: { id: string; title: string; operationName: string | null; operationDate: string | null; transcriptionDate: string | null; analysis: string | null }) => {
    setItems((prev) =>
      prev.map((t) =>
        t.id === updated.id
          ? {
              ...t,
              title: updated.title,
              operationName: updated.operationName,
              operationDate: updated.operationDate,
              transcriptionDate: updated.transcriptionDate,
              analysis: updated.analysis,
            }
          : t
      )
    );
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Transcrições</h1>
          <p className="text-sm text-muted-foreground">
            Lista completa de transcrições — total {items.length}
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova transcrição
          </Button>
        ) : null}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título, operação ou análise..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border border-border bg-card/40 backdrop-blur">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Operação</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Mídia</TableHead>
              <TableHead className="w-12 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                  {search ? "Nenhuma transcrição encontrada" : "Nenhuma transcrição cadastrada"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/transcripts/${t.id}`)}
                >
                  <TableCell className="font-medium max-w-xs">
                    <div className="truncate" title={t.title}>{t.title}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs">
                    <div className="truncate" title={t.operationName ?? ""}>
                      {t.operationName ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(t.operationDate ?? t.createdAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <FileAudio className="h-3 w-3" />
                      {t.media?.length ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/transcripts/${t.id}`)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Abrir
                        </DropdownMenuItem>
                        {canMutate ? (
                          <DropdownMenuItem onClick={() => handleEditClick(t)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        ) : null}
                        <ExportSubmenu transcriptId={t.id} />
                        {canMutate ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setConfirmDelete(t)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NewTranscriptDialog
        open={newOpen}
        setOpen={setNewOpen}
        onCreated={() => load()}
      />

      <EditTranscriptDialog
        open={editOpen}
        setOpen={setEditOpen}
        transcript={editingTranscript}
        onSaved={handleSaved}
      />

      <Dialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover transcrição?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Todas as mídias e segmentos associados serão removidos.
            </DialogDescription>
          </DialogHeader>
          {confirmDelete && (
            <p className="text-sm text-muted-foreground">
              <strong>{confirmDelete.title}</strong>
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletingId !== null}
            >
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TranscriptsPage;
