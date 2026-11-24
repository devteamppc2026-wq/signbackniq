import { Body, Controller, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe.js';
import { routeId } from '../../common/input-fields.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { SessionGuard } from '../auth/session.guard.js';
import {
  createUserInput,
  userPermissionsInput,
  type CreateUserInput,
  type UserPermissionsInput,
} from './users.dto.js';
import { UsersService } from './users.service.js';

@Controller('api/admin/users')
@UseGuards(SessionGuard, AdminGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@Body(new ZodValidationPipe(createUserInput)) input: CreateUserInput) {
    return this.users.create(input);
  }

  @Put(':id/permissions')
  @HttpCode(204)
  setPermissions(
    @Param('id', new ZodValidationPipe(routeId)) id: number,
    @Body(new ZodValidationPipe(userPermissionsInput)) input: UserPermissionsInput,
  ) {
    return this.users.setPermissions(id, input);
  }
}
