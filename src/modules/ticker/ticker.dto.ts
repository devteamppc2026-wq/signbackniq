import { z } from 'zod';
import { selectedId, slideSeconds } from '../../common/input-fields.js';

export const tickerInput = z.object({
  text: z.string().trim().max(1500),
  newsIds: z
    .array(selectedId)
    .min(1)
    .max(8)
    .refine((values) => new Set(values).size === values.length)
    .nullable(),
});
export const settingsInput = z.object({
  ticker: z.string().trim().min(1).max(1500).optional(),
  slideSeconds,
});
export type TickerInput = z.infer<typeof tickerInput>;
export type SettingsInput = z.infer<typeof settingsInput>;
