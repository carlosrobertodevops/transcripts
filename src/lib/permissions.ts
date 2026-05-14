import type { UserRole } from "./auth";

export interface Actor {
  id: string;
  role: UserRole;
}

export interface Target {
  id: string;
  role: UserRole;
}

export const USER_ROLES = ["super_admin", "admin", "pro", "viewer"] as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  pro: "Editor",
  viewer: "Visualizador",
};

const isSelf = (actor: Actor, target: Target): boolean => actor.id === target.id;

export const canViewUser = (actor: Actor, target: Target): boolean => {
  if (isSelf(actor, target)) return true;
  if (actor.role === "super_admin") return true;
  if (actor.role === "admin") {
    return target.role === "admin" || target.role === "pro" || target.role === "viewer";
  }
  if (actor.role === "pro") {
    return target.role === "pro" || target.role === "viewer";
  }
  return false;
};

export const canEditUser = (actor: Actor, target: Target): boolean => {
  if (actor.role === "super_admin") return true;
  if (actor.role === "admin") {
    if (isSelf(actor, target)) return true;
    return target.role === "pro" || target.role === "viewer";
  }
  if (actor.role === "pro") {
    return target.role === "viewer";
  }
  if (actor.role === "viewer") {
    return isSelf(actor, target);
  }
  return false;
};

export const canDeleteUser = (actor: Actor, target: Target): boolean => {
  if (isSelf(actor, target)) return false;
  return actor.role === "super_admin";
};

export const canCreateUser = (actor: Actor, newRole: UserRole): boolean => {
  if (actor.role === "super_admin") return true;
  if (actor.role === "admin") return newRole !== "super_admin";
  return false;
};

export const visibleRoles = (actor: Actor): UserRole[] => {
  if (actor.role === "super_admin") return [...USER_ROLES];
  if (actor.role === "admin") return ["admin", "pro", "viewer"];
  if (actor.role === "pro") return ["pro", "viewer"];
  return [];
};

export const editableTargetRoles = (actor: Actor): UserRole[] => {
  if (actor.role === "super_admin") return [...USER_ROLES];
  if (actor.role === "admin") return ["admin", "pro", "viewer"];
  if (actor.role === "pro") return ["viewer"];
  if (actor.role === "viewer") return ["viewer"];
  return [];
};

export const creatableRoles = (actor: Actor): UserRole[] => {
  if (actor.role === "super_admin") return [...USER_ROLES];
  if (actor.role === "admin") return ["admin", "pro", "viewer"];
  return [];
};

export const canAccessUserModule = (_actor: Actor): boolean => true;

export const canChangeRole = (actor: Actor, target: Target, newRole: UserRole): boolean => {
  if (actor.role === "super_admin") return true;
  if (actor.role === "admin") {
    if (isSelf(actor, target)) return false;
    if (newRole === "super_admin") return false;
    return target.role !== "super_admin";
  }
  return false;
};

// --- Transcript permissions (T6) ---
//
// Hierarquia: super_admin > admin > pro > viewer.
//  - Próprio dono → CRUD completo.
//  - Mesmo tier (peer) → somente leitura.
//  - Tier abaixo (mais permissivo manda) → CRUD completo.
//  - Tier acima → bloqueado.
//  - Viewer → nunca cria/edita/apaga; só visualiza próprio + shared.
//  - Shares (sharedWithUserId) preservam acesso explícito (view; edit se canEdit).

const RANK: Record<UserRole, number> = {
  super_admin: 4,
  admin: 3,
  pro: 2,
  viewer: 1,
};

export const roleRank = (role: UserRole): number => RANK[role] ?? 0;

export interface TranscriptOwner {
  id: string;
  role: UserRole;
}

export interface ShareGrant {
  canEdit: boolean | null;
}

export const canViewTranscript = (
  actor: Actor,
  owner: TranscriptOwner,
  share?: ShareGrant | null,
): boolean => {
  if (actor.id === owner.id) return true;
  if (share) return true;
  if (actor.role === "viewer") return false;
  return roleRank(actor.role) >= roleRank(owner.role);
};

export const canEditTranscript = (
  actor: Actor,
  owner: TranscriptOwner,
  share?: ShareGrant | null,
): boolean => {
  if (actor.role === "viewer") return false;
  if (actor.id === owner.id) return true;
  if (share && share.canEdit) return true;
  return roleRank(actor.role) > roleRank(owner.role);
};

export const canDeleteTranscript = (
  actor: Actor,
  owner: TranscriptOwner,
): boolean => {
  if (actor.role === "viewer") return false;
  if (actor.id === owner.id) return true;
  return roleRank(actor.role) > roleRank(owner.role);
};

export const canCreateTranscript = (actor: Actor): boolean =>
  actor.role !== "viewer";

// Roles cujos transcripts são visíveis ao actor (para filtrar listagem).
// SuperAdmin vê todos; Admin vê admin+pro+viewer; Pro vê pro+viewer; Viewer só os próprios/shares.
export const visibleOwnerRoles = (actor: Actor): UserRole[] => {
  if (actor.role === "super_admin") return [...USER_ROLES];
  if (actor.role === "admin") return ["admin", "pro", "viewer"];
  if (actor.role === "pro") return ["pro", "viewer"];
  return [];
};
