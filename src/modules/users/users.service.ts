import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { CreateUserInput, UserPermissionsInput } from './users.dto.js';
import { USERS_REPOSITORY, type UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(@Inject(USERS_REPOSITORY) private readonly repository: UsersRepository) {}

  list() {
    return this.repository.list();
  }

  async create(input: CreateUserInput) {
    const id = await this.repository.createEditor(
      input.email,
      await bcrypt.hash(input.password, 12),
      input.permissions,
    );
    if (id === null) throw new ConflictException('البريد الإلكتروني ده مستخدم قبل كده.');
    return { id, email: input.email, role: 'editor', permissions: input.permissions } as const;
  }

  async setPermissions(id: number, input: UserPermissionsInput) {
    if (!(await this.repository.setPermissions(id, input.permissions))) {
      throw new NotFoundException('حساب المحرر مش موجود.');
    }
  }
}
