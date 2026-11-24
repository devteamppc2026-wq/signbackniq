import { Module } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { DatabaseModule } from '../../core/database/database.module.js';
import { MYSQL_POOL } from '../../core/database/mysql.js';
import { AuthModule } from '../auth/auth.module.js';
import { VideoSchedulesController } from './video-schedules.controller.js';
import { VIDEO_SCHEDULES_REPOSITORY } from './video-schedules.repository.js';
import { VideoSchedulesService } from './video-schedules.service.js';
import { MysqlVideoSchedulesRepository } from './mysql-video-schedules.repository.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [VideoSchedulesController],
  providers: [
    VideoSchedulesService,
    {
      provide: VIDEO_SCHEDULES_REPOSITORY,
      inject: [MYSQL_POOL],
      useFactory: (pool: Pool) => new MysqlVideoSchedulesRepository(pool),
    },
  ],
  exports: [VideoSchedulesService],
})
export class VideoSchedulesModule {}
