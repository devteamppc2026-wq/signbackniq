import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ScreenInput } from './screens.dto.js';
import { SCREENS_REPOSITORY, type ScreensRepository } from './screens.repository.js';

@Injectable()
export class ScreensService {
  constructor(@Inject(SCREENS_REPOSITORY) private readonly repository: ScreensRepository) {}

  list() {
    return this.repository.screens();
  }

  async get(key: string) {
    const screen = await this.repository.screen(key);
    if (!screen) throw new NotFoundException('الشاشة مش موجودة.');
    return screen;
  }

  async add(input: ScreenInput) {
    const id = await this.repository.addScreen(input);
    if (id === null) throw new ConflictException('كود الشاشة مستخدم قبل كده.');
    return { id, ...input };
  }
}
