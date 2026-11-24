import { z } from 'zod';

export const accountEmail = z
  .string()
  .trim()
  .max(254)
  .pipe(z.email())
  .transform((value) => value.toLowerCase());

export const loginInput = z.object({
  email: accountEmail,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginInput>;
