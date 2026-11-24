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
import { SessionGuard } from '../auth/session.guard.js';
import { PermissionsGuard, RequireAnyPermission } from '../auth/permissions.guard.js';
import { NEWS_PERMISSIONS } from '../auth/identity.js';
import { createNewsInput, newsInput, type NewsInput } from './news.dto.js';
import { NewsService } from './news.service.js';

@Controller('api/admin/news')
@UseGuards(SessionGuard, PermissionsGuard)
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Get()
  @RequireAnyPermission(NEWS_PERMISSIONS)
  list() {
    return this.news.list();
  }

  @Post()
  @RequireAnyPermission(['news.create'])
  create(@Body(new ZodValidationPipe(createNewsInput)) input: NewsInput) {
    return this.news.save(input);
  }

  @Put(':id')
  @RequireAnyPermission(['news.update'])
  @HttpCode(204)
  async edit(
    @Param('id', new ZodValidationPipe(routeId)) id: number,
    @Body(new ZodValidationPipe(newsInput)) input: NewsInput,
  ) {
    await this.news.save(input, id);
  }

  @Post(':id/archive')
  @RequireAnyPermission(['news.archive'])
  @HttpCode(204)
  archive(@Param('id', new ZodValidationPipe(routeId)) id: number) {
    return this.news.archive(id, true);
  }

  @Post(':id/restore')
  @RequireAnyPermission(['news.archive'])
  @HttpCode(204)
  restore(@Param('id', new ZodValidationPipe(routeId)) id: number) {
    return this.news.archive(id, false);
  }

  @Delete(':id')
  @RequireAnyPermission(['news.delete'])
  @HttpCode(204)
  remove(@Param('id', new ZodValidationPipe(routeId)) id: number) {
    return this.news.remove(id);
  }
}
