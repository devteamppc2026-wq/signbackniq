import { z } from 'zod';
import { localVideoPath } from './media-path.js';

export const selectedId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const routeId = z.coerce.number().pipe(selectedId);
export const dateTime = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .refine((value) => Number.isFinite(value.valueOf()) && value.getUTCFullYear() >= 1000);
export const slideSeconds = z.number().int().min(5).max(120);
export const title = z.string().trim().min(3).max(180);
export const videoUrl = z.string().regex(localVideoPath);
