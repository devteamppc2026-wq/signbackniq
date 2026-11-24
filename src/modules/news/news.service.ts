import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { NewsInput } from './news.dto.js';
import { NEWS_REPOSITORY, type NewsRepository } from './news.repository.js';

@Injectable()
export class NewsService {
  constructor(@Inject(NEWS_REPOSITORY) private readonly repository: NewsRepository) {}

  list(at?: Date) {
    return this.repository.listNews(at);
  }

  headlines(ids: number[], at?: Date) {
    return this.repository.headlines(ids, at);
  }

  async save(input: NewsInput, id?: number) {
    const result = await this.repository.saveNews(input, id);
    if (result === null) throw new NotFoundException('الخبر مش موجود.');
    return { id: result };
  }

  async archive(id: number, archive: boolean) {
    if (!(await this.repository.archiveNews(id, archive ? new Date() : null))) {
      throw new NotFoundException('الخبر مش موجود.');
    }
  }

  async remove(id: number) {
    if (!(await this.repository.removeNews(id))) throw new NotFoundException('الخبر مش موجود.');
  }
}
