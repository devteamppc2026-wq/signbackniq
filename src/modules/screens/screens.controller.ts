import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { SessionGuard } from '../auth/session.guard.js';
import { screenInput, type ScreenInput } from './screens.dto.js';
import { ScreensService } from './screens.service.js';

@Controller('api/admin/screens')
@UseGuards(SessionGuard, AdminGuard)
export class ScreensController {
  constructor(private readonly screens: ScreensService) {}

  @Get()
  list() {
    return this.screens.list();
  }

  @Post()
  add(@Body(new ZodValidationPipe(screenInput)) input: ScreenInput) {
    return this.screens.add(input);
  }
}
