import { Module } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { DatabaseModule } from '../../core/database/database.module.js';
import { MYSQL_POOL } from '../../core/database/mysql.js';
import { AuthModule } from '../auth/auth.module.js';
import { NewsModule } from '../news/news.module.js';
import { FeedsModule } from '../feeds/feeds.module.js';
import { TickerController } from './ticker.controller.js';
import { TICKER_REPOSITORY } from './ticker.repository.js';
import { TickerService } from './ticker.service.js';
import { MysqlTickerRepository } from './mysql-ticker.repository.js';

@Module({
  imports: [DatabaseModule, AuthModule, NewsModule, FeedsModule],
  controllers: [TickerController],
  providers: [
    TickerService,
    {
      provide: TICKER_REPOSITORY,
      inject: [MYSQL_POOL],
      useFactory: (pool: Pool) => new MysqlTickerRepository(pool),
    },
  ],
  exports: [TickerService],
})
export class TickerModule {}
