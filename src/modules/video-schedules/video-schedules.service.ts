import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ScheduleInput } from './video-schedules.dto.js';
import {
  VIDEO_SCHEDULES_REPOSITORY,
  type VideoSchedulesRepository,
} from './video-schedules.repository.js';

@Injectable()
export class VideoSchedulesService {
  constructor(
    @Inject(VIDEO_SCHEDULES_REPOSITORY) private readonly repository: VideoSchedulesRepository,
  ) {}

  list() {
    return this.repository.schedules();
  }

  active(screenId: number, at: Date) {
    return this.repository.activeSchedule(screenId, at);
  }

  async save(input: ScheduleInput, id?: number) {
    const result = await this.repository.saveSchedule(input, id);
    if (result === 'unknown-screen') throw new BadRequestException('الشاشة المختارة مش موجودة.');
    if (result === null) throw new NotFoundException('الجدولة دي مش متاحة للتعديل.');
    return { id: result };
  }

  async cancel(id: number) {
    if (!(await this.repository.cancelSchedule(id, new Date()))) {
      throw new NotFoundException('الجدولة مش موجودة.');
    }
  }
}
