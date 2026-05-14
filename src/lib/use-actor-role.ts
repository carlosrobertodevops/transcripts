"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "./auth";

export const useActorRole = (): { role: UserRole | null; canMutate: boolean; loading: boolean } => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return;
        setRole((d?.role as UserRole | undefined) ?? null);
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return {
    role,
    canMutate: role !== null && role !== "viewer",
    loading,
  };
};
