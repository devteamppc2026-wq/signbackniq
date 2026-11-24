import { z } from 'zod';
import { dateTime, selectedId, title, videoUrl } from '../../common/input-fields.js';

export const scheduleInput = z
  .object({
    title,
    videoUrl,
    target: z.enum(['unassigned', 'all', 'screen']),
    screenId: selectedId.nullable().default(null),
    startsAt: dateTime,
    endsAt: dateTime,
  })
  .refine((row) => row.startsAt < row.endsAt, {
    path: ['endsAt'],
    message: 'وقت النهاية لازم يكون بعد بداية العرض.',
  })
  .refine((row) => (row.target === 'screen') === (row.screenId !== null), {
    path: ['screenId'],
    message: 'اختار الشاشة المستهدفة.',
  });
export type ScheduleInput = z.infer<typeof scheduleInput>;
