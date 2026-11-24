import type { Pool, ResultSetHeader } from 'mysql2/promise';
import type { MysqlRow } from '../../core/database/mysql.js';
import type { ScreenInput } from './screens.dto.js';
import type { Screen, ScreensRepository } from './screens.repository.js';

export class MysqlScreensRepository implements ScreensRepository {
  constructor(private readonly db: Pool) {}

  async screens() {
    const [rows] = await this.db.execute<MysqlRow<Screen>[]>(
      'SELECT id,screen_key AS `key`,name FROM display_screens ORDER BY id',
    );
    return rows;
  }

  async screen(key: string) {
    const [rows] = await this.db.execute<MysqlRow<Screen>[]>(
      'SELECT id,screen_key AS `key`,name FROM display_screens WHERE screen_key=?',
      [key],
    );
    return rows[0];
  }

  async addScreen(input: ScreenInput) {
    try {
      const [result] = await this.db.execute<ResultSetHeader>(
        'INSERT INTO display_screens (screen_key,name) VALUES (?,?)',
        [input.key, input.name],
      );
      return result.insertId;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ER_DUP_ENTRY') return null;
      throw error;
    }
  }
}
