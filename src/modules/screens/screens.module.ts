import { Module } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { DatabaseModule } from '../../core/database/database.module.js';
import { MYSQL_POOL } from '../../core/database/mysql.js';
import { AuthModule } from '../auth/auth.module.js';
import { ScreensController } from './screens.controller.js';
import { SCREENS_REPOSITORY } from './screens.repository.js';
import { ScreensService } from './screens.service.js';
import { MysqlScreensRepository } from './mysql-screens.repository.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ScreensController],
  providers: [
    ScreensService,
    {
      provide: SCREENS_REPOSITORY,
      inject: [MYSQL_POOL],
      useFactory: (pool: Pool) => new MysqlScreensRepository(pool),
    },
  ],
  exports: [ScreensService],
})
export class ScreensModule {}
