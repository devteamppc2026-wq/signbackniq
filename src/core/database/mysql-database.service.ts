import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from './mysql.js';

@Injectable()
export class MysqlDatabase implements OnApplicationShutdown {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  onApplicationShutdown() {
    return this.pool.end();
  }

  async verifyConnection() {
    await this.pool.query('SELECT 1 FROM display_screens LIMIT 1');
  }
}
