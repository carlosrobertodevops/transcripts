"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserRole } from "@/lib/auth";
import {
  canCreateUser,
  canDeleteUser,
  canEditUser,
  canChangeRole,
  creatableRoles,
  editableTargetRoles,
} from "@/lib/permissions";
import { UserCard, type UserDTO } from "@/components/admin/user-card";
import { UserFormDialog } from "@/components/admin/user-form-dialog";

interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
}

const AdminUsersPage = () => {
  const [actor, setActor] = useState<CurrentUser | null>(null);
  const [items, setItems] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserDTO | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<UserDTO | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadActor = async () => {
    const res = await fetch("/api/users/me", { credentials: "include" });
    if (res.ok) {
      const data = (await res.json()) as CurrentUser;
      setActor(data);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { items: UserDTO[] };
        setItems(data.items ?? []);
      }
    } catch (err) {
      console.error("[admin/users] load", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActor();
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length === 0) return items;
    return items.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const canCreate = useMemo(() => {
    if (!actor) return false;
    return creatableRoles(actor).length > 0;
  }, [actor]);

  const allowedCreateRoles = useMemo<UserRole[]>(() => {
    if (!actor) return [];
    return creatableRoles(actor);
  }, [actor]);

  const allowedEditRoles = useMemo<UserRole[]>(() => {
    if (!actor) return [];
    return editableTargetRoles(actor);
  }, [actor]);

  const computeEditRoles = (target: UserDTO): UserRole[] => {
    if (!actor) return [target.role];
    const can = canChangeRole(actor, target, target.role);
    if (!can) return [target.role];
    const all: UserRole[] = ["super_admin", "admin", "pro", "viewer"];
    return all.filter((r) => canChangeRole(actor, target, r));
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      const res = await fetch(`/api/users/${confirmDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) throw new Error("falha");
      setItems((prev) => prev.filter((u) => u.id !== confirmDelete.id));
      toast.success("Usuário removido");
      setConfirmDelete(null);
    } catch (err) {
      toast.error("Erro ao remover usuário");
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Total {items.length}
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo usuário
          </Button>
        ) : null}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/40 backdrop-blur p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {search ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((u) => {
            const canEdit = actor ? canEditUser(actor, u) : false;
            const canDel = actor ? canDeleteUser(actor, u) : false;
            return (
              <UserCard
                key={u.id}
                user={u}
                canEdit={canEdit}
                canDelete={canDel}
                onEdit={() => {
                  setEditing(u);
                  setEditOpen(true);
                }}
                onDelete={() => setConfirmDelete(u)}
              />
            );
          })}
        </div>
      )}

      {actor && canCreate ? (
        <UserFormDialog
          open={createOpen}
          setOpen={setCreateOpen}
          mode="create"
          allowedRoles={allowedCreateRoles}
          canChangeRole
          onSaved={() => loadUsers()}
        />
      ) : null}

      {actor && editing ? (
        <UserFormDialog
          open={editOpen}
          setOpen={(o) => {
            setEditOpen(o);
            if (!o) setEditing(null);
          }}
          mode="edit"
          user={editing}
          allowedRoles={
            computeEditRoles(editing).length > 0
              ? computeEditRoles(editing)
              : allowedEditRoles.length > 0
                ? allowedEditRoles
                : [editing.role]
          }
          canChangeRole={
            !!actor && canChangeRole(actor, editing, editing.role) === false
              ? computeEditRoles(editing).length > 1
              : computeEditRoles(editing).length > 1
          }
          onSaved={() => loadUsers()}
        />
      ) : null}

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover usuário?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Todos os dados associados ao usuário
              (transcrições, mídias, notificações) serão removidos em cascata.
            </DialogDescription>
          </DialogHeader>
          {confirmDelete ? (
            <p className="text-sm text-muted-foreground">
              <strong>{confirmDelete.name ?? confirmDelete.email}</strong>
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletingId !== null}
            >
              {deletingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remover"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersPage;
