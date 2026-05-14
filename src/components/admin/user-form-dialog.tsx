"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { UserRole } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserDTO } from "./user-card";

const ROLE_VALUES = ["super_admin", "admin", "pro", "viewer"] as const;

const baseSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(ROLE_VALUES),
  avatarUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  password: z
    .string()
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .optional()
    .or(z.literal("")),
});

type FormData = z.infer<typeof baseSchema>;

interface UserFormDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  mode: "create" | "edit";
  user?: UserDTO;
  allowedRoles: UserRole[];
  canChangeRole: boolean;
  onSaved: () => void;
}

export const UserFormDialog = ({
  open,
  setOpen,
  mode,
  user,
  allowedRoles,
  canChangeRole,
  onSaved,
}: UserFormDialogProps) => {
  const isCreate = mode === "create";
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      name: "",
      email: "",
      role: allowedRoles[0] ?? "viewer",
      avatarUrl: "",
      password: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: user?.name ?? "",
        email: user?.email ?? "",
        role: user?.role ?? allowedRoles[0] ?? "viewer",
        avatarUrl: user?.avatarUrl ?? "",
        password: "",
      });
    }
  }, [open, user, allowedRoles, form]);

  const onSubmit = async (data: FormData) => {
    if (isCreate && (!data.password || data.password.length < 6)) {
      form.setError("password", { message: "Senha obrigatória (mínimo 6 caracteres)" });
      return;
    }

    setSubmitting(true);
    try {
      const method = isCreate ? "POST" : "PATCH";
      const endpoint = isCreate ? "/api/users" : `/api/users/${user?.id}`;

      const payload: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl && data.avatarUrl.length > 0 ? data.avatarUrl : null,
      };
      if (isCreate || canChangeRole) payload.role = data.role;
      if (data.password && data.password.length > 0) payload.password = data.password;
      if (isCreate && !payload.password) payload.password = data.password;

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const code = (err as { error?: string }).error;
        if (code === "email_in_use") {
          form.setError("email", { message: "Email já está em uso" });
        } else if (code === "forbidden" || code === "forbidden_role_change") {
          toast.error("Permissão negada");
        } else {
          toast.error(isCreate ? "Erro ao criar usuário" : "Erro ao atualizar usuário");
        }
        return;
      }

      toast.success(isCreate ? "Usuário criado" : "Usuário atualizado");
      onSaved();
      setOpen(false);
    } catch (err) {
      console.error("[user-form] submit", err);
      toast.error("Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && setOpen(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Novo usuário" : "Editar usuário"}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Crie um novo usuário definindo nome, email, senha e papel."
              : "Atualize informações do usuário. Deixe a senha em branco para manter."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">Nome *</Label>
            <Input id="user-name" placeholder="João Silva" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email *</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="joao@example.com"
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-password">
              {isCreate ? "Senha *" : "Nova senha (opcional)"}
            </Label>
            <Input
              id="user-password"
              type="password"
              placeholder={isCreate ? "Mínimo 6 caracteres" : "Deixe em branco para manter"}
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-avatar">Avatar URL (opcional)</Label>
            <Input
              id="user-avatar"
              type="url"
              placeholder="https://..."
              {...form.register("avatarUrl")}
            />
            {form.formState.errors.avatarUrl ? (
              <p className="text-xs text-destructive">{form.formState.errors.avatarUrl.message}</p>
            ) : null}
          </div>

          {canChangeRole ? (
            <div className="space-y-2">
              <Label>Papel *</Label>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.role ? (
                <p className="text-xs text-destructive">{form.formState.errors.role.message}</p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : isCreate ? (
                "Criar"
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
