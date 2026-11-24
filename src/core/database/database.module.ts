import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { ConfigModule } from '../config/config.module.js';
import { createMysqlPool, MYSQL_POOL } from './mysql.js';
import { HealthController } from './health.controller.js';
import { MysqlDatabase } from './mysql-database.service.js';

@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
  providers: [
    {
      provide: MYSQL_POOL,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => createMysqlPool(config.database),
    },
    MysqlDatabase,
  ],
  exports: [MYSQL_POOL],
})
export class DatabaseModule {}
