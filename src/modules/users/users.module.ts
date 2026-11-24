import { Module } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { DatabaseModule } from '../../core/database/database.module.js';
import { MYSQL_POOL } from '../../core/database/mysql.js';
import { AuthModule } from '../auth/auth.module.js';
import { MysqlUsersRepository } from './mysql-users.repository.js';
import { UsersController } from './users.controller.js';
import { USERS_REPOSITORY } from './users.repository.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USERS_REPOSITORY,
      inject: [MYSQL_POOL],
      useFactory: (pool: Pool) => new MysqlUsersRepository(pool),
    },
  ],
})
export class UsersModule {}
