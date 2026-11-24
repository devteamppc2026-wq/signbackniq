import type { NewsInput } from './news.dto.js';

export const NEWS_REPOSITORY = Symbol('NewsRepository');
export type News = NewsInput & {
  id: number;
  priority: number;
  publishedAt: Date;
  archivedAt: Date | null;
};

export interface NewsRepository {
  listNews(at?: Date): Promise<News[]>;
  saveNews(input: NewsInput, id?: number): Promise<number | null>;
  archiveNews(id: number, archivedAt: Date | null): Promise<boolean>;
  removeNews(id: number): Promise<boolean>;
  headlines(ids: number[], at?: Date): Promise<Map<number, string>>;
}
