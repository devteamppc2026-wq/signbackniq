import { z } from 'zod';
import { dateTime, slideSeconds, title, videoUrl } from '../../common/input-fields.js';
import { localPhotoPath } from '../../common/media-path.js';

// The news table stores whole seconds in a SMALLINT UNSIGNED column.
const videoSlideSeconds = z.number().int().min(1).max(65_535);

export const newsInput = z
  .object({
    title,
    body: z.string().trim().max(2000).default(''),
    source: z.string().trim().min(2).max(200).default('النقابة العامة للعاملين بالبترول'),
    category: z.enum(['union', 'national']).default('union'),
    status: z.enum(['draft', 'published']).default('published'),
    imageUrl: z.string().regex(localPhotoPath).nullable().default(null),
    videoUrl: videoUrl.nullable().default(null),
    slideSeconds: videoSlideSeconds.nullable().default(null),
    priority: z.number().int().min(0).max(999).optional(),
    startsAt: dateTime.nullable().default(null),
    endsAt: dateTime.nullable().default(null),
  })
  .refine((row) => !(row.imageUrl && row.videoUrl), {
    path: ['videoUrl'],
    message: 'اختار صورة أو فيديو للخبر.',
  })
  .refine(
    (row) =>
      row.videoUrl || row.slideSeconds === null || slideSeconds.safeParse(row.slideSeconds).success,
    {
      path: ['slideSeconds'],
      message: 'اختار مدة من ٥ لـ١٢٠ ثانية للأخبار النصية والمصوّرة.',
    },
  )
  .refine((row) => !row.startsAt || !row.endsAt || row.startsAt < row.endsAt, {
    path: ['endsAt'],
    message: 'وقت النهاية لازم يكون بعد بداية العرض.',
  });
export type NewsInput = z.infer<typeof newsInput>;

const week = 7 * 24 * 60 * 60 * 1000;

export const createNewsInput = z.preprocess((value) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  const now = Date.now();
  const start = typeof input['startsAt'] === 'string' ? Date.parse(input['startsAt']) : now;
  return {
    ...input,
    slideSeconds: input['slideSeconds'] === undefined ? 5 : input['slideSeconds'],
    startsAt: input['startsAt'] === undefined ? new Date(now).toISOString() : input['startsAt'],
    endsAt:
      input['endsAt'] === undefined
        ? new Date((Number.isFinite(start) ? start : now) + week).toISOString()
        : input['endsAt'],
  };
}, newsInput);
