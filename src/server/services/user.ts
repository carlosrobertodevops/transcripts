import { eq, or, ilike, inArray, and } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";
import { visibleRoles } from "@/lib/permissions";

export interface UserDTO {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

type UserRow = typeof users.$inferSelect;

const toDTO = (row: UserRow): UserDTO => ({
  id: row.id,
  email: row.email,
  name: row.name,
  avatarUrl: row.avatarUrl,
  role: row.role as UserRole,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const listVisibleUsers = async ({
  actorId,
  actorRole,
  q,
}: {
  actorId: string;
  actorRole: UserRole;
  q?: string;
}): Promise<UserDTO[]> => {
  const roles = visibleRoles({ id: actorId, role: actorRole });

  const roleFilter =
    roles.length > 0
      ? or(inArray(users.role, roles), eq(users.id, actorId))
      : eq(users.id, actorId);

  const searchFilter = q && q.trim().length > 0
    ? or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`))
    : undefined;

  const where = searchFilter ? and(roleFilter, searchFilter) : roleFilter;

  const rows = await db.select().from(users).where(where).orderBy(users.createdAt);
  return rows.map(toDTO);
};

export const findUserById = async (id: string): Promise<UserDTO | null> => {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (rows.length === 0) return null;
  return toDTO(rows[0]);
};

export const findUserByEmail = async (email: string): Promise<UserDTO | null> => {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (rows.length === 0) return null;
  return toDTO(rows[0]);
};

export const createUser = async (input: {
  email: string;
  password: string;
  name: string | null;
  role: UserRole;
  avatarUrl?: string | null;
}): Promise<UserDTO> => {
  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      name: input.name,
      avatarUrl: input.avatarUrl ?? null,
      role: input.role,
    })
    .returning();
  return toDTO(row);
};

export const updateUser = async (
  id: string,
  patch: {
    name?: string | null;
    avatarUrl?: string | null;
    email?: string;
    role?: UserRole;
    password?: string;
  }
): Promise<UserDTO> => {
  const set: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.avatarUrl !== undefined) set.avatarUrl = patch.avatarUrl;
  if (patch.email !== undefined) set.email = patch.email;
  if (patch.role !== undefined) set.role = patch.role;
  if (patch.password !== undefined && patch.password.length > 0) {
    set.passwordHash = await hashPassword(patch.password);
  }

  const [row] = await db.update(users).set(set).where(eq(users.id, id)).returning();
  return toDTO(row);
};

export const deleteUser = async (id: string): Promise<void> => {
  await db.delete(users).where(eq(users.id, id));
};
