import { z } from 'zod';

export const MAIN_SCREEN = 'main';
export const screenKey = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const screenInput = z.object({ key: screenKey, name: z.string().trim().min(2).max(100) });
export type ScreenInput = z.infer<typeof screenInput>;
