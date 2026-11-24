import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { MysqlDatabase } from './mysql-database.service.js';

@Controller('api/health')
export class HealthController {
  constructor(private readonly database: MysqlDatabase) {}

  @Get()
  async health() {
    try {
      await this.database.verifyConnection();
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException({ status: 'database-unavailable' });
    }
  }
}
