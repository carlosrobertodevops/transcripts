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
  pro: "Pro",
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
