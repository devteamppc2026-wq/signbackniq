import type { Pool, ResultSetHeader } from 'mysql2/promise';
import type { MysqlRow } from '../../core/database/mysql.js';
import type { NewsInput } from './news.dto.js';
import type { News, NewsRepository } from './news.repository.js';

const visible =
  "status='published' AND archived_at IS NULL AND (starts_at IS NULL OR starts_at<=?) AND (ends_at IS NULL OR ends_at>?)";
const newsColumns =
  'id,title,body,source,category,status,image_url AS imageUrl,video_url AS videoUrl,slide_seconds AS slideSeconds,carousel_priority AS priority,starts_at AS startsAt,ends_at AS endsAt,created_at AS publishedAt,archived_at AS archivedAt';

export class MysqlNewsRepository implements NewsRepository {
  constructor(private readonly db: Pool) {}

  async listNews(at?: Date) {
    const where = at ? 'WHERE ' + visible : '';
    const [rows] = await this.db.execute<MysqlRow<News>[]>(
      `SELECT ${newsColumns} FROM news ${where} ORDER BY carousel_priority DESC,id ASC`,
      at ? [at, at] : [],
    );
    return rows;
  }

  async saveNews(input: NewsInput, id?: number) {
    const values = [
      input.title,
      input.body,
      input.source,
      input.category,
      input.status,
      input.imageUrl,
      input.videoUrl,
      input.slideSeconds,
      input.startsAt,
      input.endsAt,
    ];
    if (id === undefined) {
      const [result] = await this.db.execute<ResultSetHeader>(
        'INSERT INTO news (title,body,source,category,status,image_url,video_url,slide_seconds,starts_at,ends_at,carousel_priority) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [...values, input.priority ?? 0],
      );
      return result.insertId;
    }
    const [result] = await this.db.execute<ResultSetHeader>(
      'UPDATE news SET title=?,body=?,source=?,category=?,status=?,image_url=?,video_url=?,slide_seconds=?,starts_at=?,ends_at=?,carousel_priority=COALESCE(?,carousel_priority) WHERE id=?',
      [...values, input.priority ?? null, id],
    );
    return result.affectedRows ? id : null;
  }

  async archiveNews(id: number, archivedAt: Date | null) {
    const [result] = await this.db.execute<ResultSetHeader>(
      'UPDATE news SET archived_at=? WHERE id=?',
      [archivedAt, id],
    );
    return result.affectedRows > 0;
  }

  async removeNews(id: number) {
    const [result] = await this.db.execute<ResultSetHeader>('DELETE FROM news WHERE id=?', [id]);
    return result.affectedRows > 0;
  }

  async headlines(ids: number[], at?: Date) {
    if (!ids.length) return new Map<number, string>();
    const placeholders = ids.map(() => '?').join(',');
    const state = at ? visible : "status='published' AND archived_at IS NULL";
    const [rows] = await this.db.execute<MysqlRow<{ id: number; title: string }>[]>(
      `SELECT id,title FROM news WHERE category='union' AND ${state} AND id IN (${placeholders})`,
      at ? [at, at, ...ids] : ids,
    );
    return new Map(rows.map((row) => [row.id, row.title]));
  }
}
