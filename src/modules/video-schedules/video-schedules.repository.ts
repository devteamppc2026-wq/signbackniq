import type { ScheduleInput } from './video-schedules.dto.js';

export const VIDEO_SCHEDULES_REPOSITORY = Symbol('VideoSchedulesRepository');
export type Schedule = ScheduleInput & { id: number; cancelledAt: Date | null };
export type SavedSchedule = number | null | 'unknown-screen';

export interface VideoSchedulesRepository {
  schedules(): Promise<Schedule[]>;
  saveSchedule(input: ScheduleInput, id?: number): Promise<SavedSchedule>;
  cancelSchedule(id: number, at: Date): Promise<boolean>;
  activeSchedule(screenId: number, at: Date): Promise<Schedule | null>;
}
