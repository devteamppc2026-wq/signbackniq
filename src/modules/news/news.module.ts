import { Module } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { DatabaseModule } from '../../core/database/database.module.js';
import { MYSQL_POOL } from '../../core/database/mysql.js';
import { AuthModule } from '../auth/auth.module.js';
import { NewsController } from './news.controller.js';
import { NEWS_REPOSITORY } from './news.repository.js';
import { NewsService } from './news.service.js';
import { MysqlNewsRepository } from './mysql-news.repository.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [NewsController],
  providers: [
    NewsService,
    {
      provide: NEWS_REPOSITORY,
      inject: [MYSQL_POOL],
      useFactory: (pool: Pool) => new MysqlNewsRepository(pool),
    },
  ],
  exports: [NewsService],
})
export class NewsModule {}
