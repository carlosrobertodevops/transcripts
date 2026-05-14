"use client";

import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { MoreHorizontal, Pencil, Trash2, Mail } from "lucide-react";
import type { UserRole } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleBadge } from "./role-badge";

dayjs.locale("pt-br");

export interface UserDTO {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

interface UserCardProps {
  user: UserDTO;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const initialsOf = (name: string | null, email: string): string => {
  const source = name && name.trim().length > 0 ? name : email;
  const parts = source.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  const initials = (first + last).toUpperCase();
  return initials || source.slice(0, 2).toUpperCase();
};

export const UserCard = ({ user, canEdit, canDelete, onEdit, onDelete }: UserCardProps) => {
  const hasActions = canEdit || canDelete;
  return (
    <div className="relative rounded-lg border border-border bg-card/40 backdrop-blur p-4 hover:bg-card/60 transition-colors">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name ?? user.email} /> : null}
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {initialsOf(user.name, user.email)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate" title={user.name ?? "—"}>
                {user.name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1" title={user.email}>
                <Mail className="h-3 w-3 shrink-0" />
                {user.email}
              </p>
            </div>
            {hasActions ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit ? (
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  ) : null}
                  {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
                  {canDelete ? (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={onDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <RoleBadge role={user.role} />
            <span className="text-[10px] text-muted-foreground">
              {dayjs(user.createdAt).format("DD/MM/YYYY")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
