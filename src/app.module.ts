import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ApiExceptionFilter } from './common/http/api-exception.filter.js';
import { ConfigModule } from './core/config/config.module.js';
import { DatabaseModule } from './core/database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DisplayModule } from './modules/display/display.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { PagesModule } from './modules/pages/pages.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuthModule,
    DisplayModule,
    MediaModule,
    PagesModule,
    UsersModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
