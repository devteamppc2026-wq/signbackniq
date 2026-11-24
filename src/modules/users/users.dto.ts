import { z } from 'zod';
import { accountEmail } from '../auth/auth.dto.js';
import { NEWS_PERMISSIONS } from '../auth/identity.js';

const password = z
  .string()
  .min(12, 'كلمة المرور لازم تكون 12 حرف على الأقل.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'كلمة المرور طويلة زيادة.');
const permissions = z
  .array(z.enum(NEWS_PERMISSIONS))
  .max(NEWS_PERMISSIONS.length)
  .refine((items) => new Set(items).size === items.length);

export const seedAdminInput = z.object({ email: accountEmail, password });
export const createUserInput = seedAdminInput.extend({ permissions });
export const userPermissionsInput = z.object({ permissions });
export type CreateUserInput = z.infer<typeof createUserInput>;
export type UserPermissionsInput = z.infer<typeof userPermissionsInput>;
