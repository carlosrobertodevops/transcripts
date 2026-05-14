"use client";

import type { UserRole } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { Shield, Lock, Star, Eye } from "lucide-react";

const variant: Record<UserRole, string> = {
  super_admin: "bg-primary/15 text-primary border-primary/30",
  admin: "bg-accent/30 text-accent-foreground border-accent/50",
  pro: "bg-secondary text-secondary-foreground border-border",
  viewer: "bg-muted text-muted-foreground border-border",
};

const icon: Record<UserRole, typeof Shield> = {
  super_admin: Shield,
  admin: Lock,
  pro: Star,
  viewer: Eye,
};

interface RoleBadgeProps {
  role: UserRole;
}

export const RoleBadge = ({ role }: RoleBadgeProps) => {
  const Icon = icon[role];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${variant[role]}`}
    >
      <Icon className="h-3 w-3" />
      {ROLE_LABELS[role]}
    </span>
  );
};
