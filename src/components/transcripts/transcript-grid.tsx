"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TranscriptCard } from "./transcript-card";
import { SortableCard } from "./sortable-card";
import { NewTranscriptDialog } from "./new-transcript-dialog";
import { EditTranscriptDialog } from "./edit-transcript-dialog";
import { ConfirmDialog } from "./confirm-dialog";
import { SearchBar } from "./search-bar";
import { toast } from "sonner";

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
  media: Array<{ id: string; filename: string; mime: string; durationSeconds: number | null }>;
};

interface TranscriptGridProps {
  initial: Transcript[];
}

export function TranscriptGrid({ initial }: TranscriptGridProps) {
  const router = useRouter();
  const [items, setItems] = useState<Transcript[]>(initial);
  const [query, setQuery] = useState("");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingTranscript, setEditingTranscript] = useState<Transcript | null>(null);
  const [deletingTranscript, setDeletingTranscript] = useState<Transcript | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleEditSaved = (updated: {
    id: string;
    title: string;
    operationName: string | null;
    operationDate: string | null;
    transcriptionDate: string | null;
    analysis: string | null;
  }) => {
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
          : t,
      ),
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
      if (!res.ok && res.status !== 204) throw new Error("Falha ao apagar");
      setItems((prev) => prev.filter((t) => t.id !== deletingTranscript.id));
      toast.success("Transcrição removida");
      setDeletingTranscript(null);
    } catch (error) {
      toast.error("Erro ao apagar transcrição");
      console.error(error);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const fetchTranscripts = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/transcripts", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data?.items ?? []);
          setItems(list);
        }
      } catch (error) {
        console.error("Failed to fetch transcripts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTranscripts();
  }, []);

  const filtered = items.filter((t) => {
    const q = query.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.operationName?.toLowerCase().includes(q) ?? false) ||
      (t.analysis?.toLowerCase().includes(q) ?? false)
    );
  });

  async function handleDragEnd(event: DragEndEvent) {
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
  }

  function handleNewTranscript(t: Transcript) {
    setItems((prev) => (prev.some((p) => p.id === t.id) ? prev : [t, ...prev]));
  }

  if (filtered.length === 0 && items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <Mic className="size-16 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Nenhuma transcrição ainda</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Comece criando sua primeira transcrição
          </p>
        </div>
        <Button onClick={() => setNewDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          Nova transcrição
        </Button>
        <NewTranscriptDialog
          open={newDialogOpen}
          setOpen={setNewDialogOpen}
          onCreated={handleNewTranscript}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <SearchBar onChange={setQuery} />
        <Button onClick={() => setNewDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          Nova transcrição
        </Button>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
            {filtered.map((transcript) => (
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

      {query && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum resultado para "{query}"
        </div>
      )}
    </div>
  );
}
