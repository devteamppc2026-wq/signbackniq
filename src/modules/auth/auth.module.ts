import { Module } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { ConfigModule } from '../../core/config/config.module.js';
import { DatabaseModule } from '../../core/database/database.module.js';
import { MYSQL_POOL } from '../../core/database/mysql.js';
import { AdminGuard } from './admin.guard.js';
import { SessionGuard } from './session.guard.js';
import { PermissionsGuard } from './permissions.guard.js';
import { AuthController } from './auth.controller.js';
import { AUTH_REPOSITORY } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { MysqlAuthRepository } from './mysql-auth.repository.js';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AdminGuard,
    SessionGuard,
    PermissionsGuard,
    {
      provide: AUTH_REPOSITORY,
      inject: [MYSQL_POOL],
      useFactory: (pool: Pool) => new MysqlAuthRepository(pool),
    },
  ],
  exports: [AdminGuard, SessionGuard, PermissionsGuard, AuthService],
})
export class AuthModule {}
