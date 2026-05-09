"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, Check, X } from "lucide-react";

interface TagRow {
  id: string;
  name: string;
  color: string;
  occurrences: number;
}

const PRESET_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#8b5cf6", "#14b8a6",
];

const TagsPage = () => {
  const [list, setList] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tags", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { tags: TagRow[] };
        setList(data.tags ?? []);
      }
    } catch (err) {
      console.error("[tags] load", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (name.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, color: newColor }),
      });
      if (res.status === 409) {
        toast.error("Já existe uma tag com esse nome");
        return;
      }
      if (!res.ok) throw new Error("falha");
      toast.success("Tag criada");
      setNewName("");
      setNewColor(PRESET_COLORS[0]);
      await load();
    } catch (err) {
      toast.error("Erro ao criar tag");
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (t: TagRow) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditColor(t.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleSave = async (id: string) => {
    const name = editName.trim();
    if (name.length === 0) return;
    setSavingId(id);
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, color: editColor }),
      });
      if (!res.ok) throw new Error("falha");
      toast.success("Tag atualizada");
      cancelEdit();
      await load();
    } catch (err) {
      toast.error("Erro ao salvar tag");
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta tag?")) return;
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) throw new Error("falha");
      toast.success("Tag removida");
      setList((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      toast.error("Erro ao remover tag");
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Tags</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre tags para destacá-las e contabilizá-las nas transcrições
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova tag</CardTitle>
          <CardDescription>Escolha um nome e uma cor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Nome</Label>
              <Input
                id="tag-name"
                placeholder="ex: alvo, código, droga"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-9 w-10 rounded border border-input bg-transparent cursor-pointer"
                />
                <div className="flex flex-wrap gap-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      style={{ backgroundColor: c }}
                      className={`h-6 w-6 rounded-full border-2 ${newColor === c ? "border-foreground" : "border-transparent"}`}
                      aria-label={`cor ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} disabled={creating || newName.trim().length === 0}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" />Criar</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suas tags ({list.length})</CardTitle>
          <CardDescription>Total de ocorrências calculado em todas as transcrições</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma tag cadastrada</p>
          ) : (
            <ul className="space-y-2">
              {list.map((t) => {
                const isEditing = editingId === t.id;
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="h-8 w-10 rounded border border-input bg-transparent cursor-pointer shrink-0"
                        />
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSave(t.id)}
                          disabled={savingId === t.id}
                        >
                          {savingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge
                          style={{ backgroundColor: t.color, color: "#fff", borderColor: "transparent" }}
                          className="shrink-0"
                        >
                          {t.name}
                        </Badge>
                        <div className="flex-1 text-xs text-muted-foreground">
                          {t.occurrences} ocorrência{t.occurrences === 1 ? "" : "s"}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(t)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(t.id)}
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TagsPage;
