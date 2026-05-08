import { z } from "zod";

export const emailSchema = z.string().email();

export const passwordSchema = z.string().min(6).max(72);

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const transcriptCreateSchema = z.object({
  title: z.string().min(1).max(120),
  operationName: z.string().max(120).optional(),
  analysis: z.string().optional(),
});

export const transcriptUpdateSchema = transcriptCreateSchema.partial();

export const reorderSchema = z.array(
  z.object({
    id: z.string().uuid(),
    position: z.number().int().nonnegative(),
  })
);

export const shareSchema = z.object({
  email: emailSchema,
  canEdit: z.boolean().default(true),
});

export const passwordChangeSchema = z.object({
  current: passwordSchema,
  next: passwordSchema,
});
