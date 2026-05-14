"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Mic, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActorRole } from "@/lib/use-actor-role";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableCard } from "./sortable-card";
import { NewTranscriptDialog } from "./new-transcript-dialog";
import { EditTranscriptDialog } from "./edit-transcript-dialog";
import { ConfirmDialog } from "./confirm-dialog";
import { SearchBar } from "./search-bar";
import { toast } from "sonner";
import dayjs from "dayjs";

type Transcript = {
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
  media: Array<{
    id: string;
    filename: string;
    mime: string;
    durationSeconds: number | null;
  }>;
};

interface TranscriptGridProps {
  initial: Transcript[];
}

type SortField =
  | "position"
  | "title"
  | "operationName"
  | "operationDate"
  | "transcriptionDate"
  | "status"
  | "mediaCount"
  | "createdAt"
  | "updatedAt";

type SortDir = "asc" | "desc";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "position", label: "Ordem manual" },
  { value: "title", label: "Título" },
  { value: "operationName", label: "Operação" },
  { value: "operationDate", label: "Data da operação" },
  { value: "transcriptionDate", label: "Data da transcrição" },
  { value: "status", label: "Status" },
  { value: "mediaCount", label: "Quantidade de mídias" },
  { value: "createdAt", label: "Criação" },
  { value: "updatedAt", label: "Atualização" },
];

const STATUS_LABEL: Record<Transcript["status"], string> = {
  pending: "pendente",
  processing: "processando",
  done: "concluída concluida done",
  failed: "falhou erro",
};

const STATUS_ORDER: Record<Transcript["status"], number> = {
  processing: 0,
  pending: 1,
  done: 2,
  failed: 3,
};

const stripHtml = (s: string | null | undefined): string => {
  if (!s) return "";
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const buildHaystack = (t: Transcript): string => {
  const parts: string[] = [
    t.title,
    t.operationName ?? "",
    stripHtml(t.analysis),
    STATUS_LABEL[t.status] ?? t.status,
    (t.media ?? []).map((m) => m.filename).join(" "),
  ];
  if (t.operationDate) {
    const d = dayjs(t.operationDate);
    if (d.isValid()) {
      parts.push(d.format("DD/MM/YYYY"));
      parts.push(d.format("YYYY-MM-DD"));
    } else {
      parts.push(t.operationDate);
    }
  }
  if (t.transcriptionDate) {
    const d = dayjs(t.transcriptionDate);
    if (d.isValid()) {
      parts.push(d.format("DD/MM/YYYY"));
      parts.push(d.format("YYYY-MM-DD"));
    } else {
      parts.push(t.transcriptionDate);
    }
  }
  return parts.join(" ").toLowerCase();
};

const compareValues = (
  a: Transcript,
  b: Transcript,
  field: SortField,
): number => {
  if (field === "position") return a.position - b.position;
  if (field === "mediaCount")
    return (a.media?.length ?? 0) - (b.media?.length ?? 0);
  if (field === "status")
    return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];

  if (
    field === "operationDate" ||
    field === "transcriptionDate" ||
    field === "createdAt" ||
    field === "updatedAt"
  ) {
    const av = a[field] ? new Date(a[field] as string).getTime() : 0;
    const bv = b[field] ? new Date(b[field] as string).getTime() : 0;
    return av - bv;
  }

  const av = (a[field] ?? "") as string;
  const bv = (b[field] ?? "") as string;
  return av.localeCompare(bv, "pt-BR", { sensitivity: "base" });
};

export const TranscriptGrid = ({ initial }: TranscriptGridProps) => {
  const { canMutate } = useActorRole();
  const router = useRouter();
  const [items, setItems] = useState<Transcript[]>(initial);
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("position");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editingTranscript, setEditingTranscript] =
    useState<Transcript | null>(null);
  const [deletingTranscript, setDeletingTranscript] =
    useState<Transcript | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleEditSaved = (updated: Transcript) => {
    setItems((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
    );
    setEditingTranscript(null);
  };

  const confirmDelete = async () => {
    if (!deletingTranscript) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/transcripts/${deletingTranscript.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) {
        let detail = "";
        try {
          const body = await res.json();
          detail = body?.error ? `: ${body.error}` : "";
        } catch {}
        throw new Error(`Falha ao apagar (HTTP ${res.status}${detail})`);
      }
      setItems((prev) => prev.filter((t) => t.id !== deletingTranscript.id));
      toast.success("Transcrição removida");
      setDeletingTranscript(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro ao apagar transcrição";
      toast.error(msg);
      console.error(error);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const fetchTranscripts = async () => {
      try {
        const res = await fetch("/api/transcripts", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data?.items ?? []);
          setItems(list);
        }
      } catch (error) {
        console.error("Failed to fetch transcripts:", error);
      }
    };

    fetchTranscripts();
  }, []);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter((t) => buildHaystack(t).includes(q))
      : items;
    if (sortField === "position" && sortDir === "asc") return filtered;

    const sorted = [...filtered].sort((a, b) => compareValues(a, b, sortField));
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [items, query, sortField, sortDir]);

  const handleDragEnd = async (event: DragEndEvent) => {
    if (sortField !== "position") {
      toast.info(
        "Reordenação manual disponível apenas com ordenação por 'Ordem manual'",
      );
      return;
    }
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((t) => t.id === active.id);
    const newIndex = items.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = [...items];
    const [moved] = newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, moved);

    setItems(newItems);

    const updates = newItems.map((t, i) => ({ id: t.id, position: i }));
    try {
      await fetch("/api/transcripts/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to reorder:", error);
      setItems(initial);
    }
  };

  const handleNewTranscript = (t: Transcript) => {
    setItems((prev) => (prev.some((p) => p.id === t.id) ? prev : [t, ...prev]));
  };

  const toggleSortDir = () => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const isEmpty = items.length === 0;

  return (
    <>
      {isEmpty ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6">
          <Mic className="size-16 text-muted-foreground" />
          <div className="text-center">
            <h2 className="text-xl font-semibold">Nenhuma transcrição ainda</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Comece criando sua primeira transcrição
            </p>
          </div>
          {canMutate ? (
            <Button onClick={() => setNewDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Nova transcrição
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <SearchBar onChange={setQuery} />
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={sortField}
                onValueChange={(v) => setSortField(v as SortField)}
              >
                <SelectTrigger className="w-[200px]">
                  <ArrowUpDown className="size-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Ordenar por..." />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleSortDir}
                title={sortDir === "asc" ? "Crescente" : "Decrescente"}
                aria-label="Inverter direção de ordenação"
              >
                {sortDir === "asc" ? (
                  <ArrowUp className="size-4" />
                ) : (
                  <ArrowDown className="size-4" />
                )}
              </Button>
              {canMutate ? (
                <Button onClick={() => setNewDialogOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  Nova transcrição
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Exibindo <strong className="text-foreground">{filteredSorted.length}</strong>{" "}
              de <strong className="text-foreground">{items.length}</strong>{" "}
              {items.length === 1 ? "transcrição" : "transcrições"}
              {query && (
                <span>
                  {" "}
                  para <span className="italic">"{query}"</span>
                </span>
              )}
            </span>
          </div>

          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredSorted.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
                {filteredSorted.map((transcript) => (
                  <SortableCard
                    key={transcript.id}
                    id={transcript.id}
                    transcript={transcript}
                    onClick={() => setEditingTranscript(transcript)}
                    onOpen={() => router.push(`/transcripts/${transcript.id}`)}
                    onEdit={() => setEditingTranscript(transcript)}
                    onDelete={() => setDeletingTranscript(transcript)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {query && filteredSorted.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum resultado para "{query}"
            </div>
          )}
        </div>
      )}

      <NewTranscriptDialog
        open={newDialogOpen}
        setOpen={setNewDialogOpen}
        onCreated={handleNewTranscript}
      />

      <EditTranscriptDialog
        open={!!editingTranscript}
        setOpen={(open) => !open && setEditingTranscript(null)}
        transcript={editingTranscript}
        onSaved={handleEditSaved}
      />

      <ConfirmDialog
        open={!!deletingTranscript}
        title="Apagar transcrição?"
        description={`A transcrição "${deletingTranscript?.title ?? ""}" será ocultada do dashboard. Os dados permanecem armazenados.`}
        confirmText="Apagar"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeletingTranscript(null)}
      />
    </>
  );
};
