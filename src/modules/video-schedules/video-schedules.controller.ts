import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe.js';
import { routeId } from '../../common/input-fields.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { SessionGuard } from '../auth/session.guard.js';
import { scheduleInput, type ScheduleInput } from './video-schedules.dto.js';
import { VideoSchedulesService } from './video-schedules.service.js';

@Controller('api/admin/video-schedules')
@UseGuards(SessionGuard, AdminGuard)
export class VideoSchedulesController {
  constructor(private readonly schedules: VideoSchedulesService) {}

  @Get()
  list() {
    return this.schedules.list();
  }

  @Post()
  add(@Body(new ZodValidationPipe(scheduleInput)) input: ScheduleInput) {
    return this.schedules.save(input);
  }

  @Put(':id')
  @HttpCode(204)
  async edit(
    @Param('id', new ZodValidationPipe(routeId)) id: number,
    @Body(new ZodValidationPipe(scheduleInput)) input: ScheduleInput,
  ) {
    await this.schedules.save(input, id);
  }

  @Delete(':id')
  @HttpCode(204)
  cancel(@Param('id', new ZodValidationPipe(routeId)) id: number) {
    return this.schedules.cancel(id);
  }
}
