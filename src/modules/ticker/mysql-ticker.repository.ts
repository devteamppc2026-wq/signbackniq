import type { Pool } from 'mysql2/promise';
import type { MysqlRow } from '../../core/database/mysql.js';
import type { SettingsInput, TickerInput } from './ticker.dto.js';
import type { Settings, TickerRepository } from './ticker.repository.js';

export class MysqlTickerRepository implements TickerRepository {
  constructor(private readonly db: Pool) {}

  async settings() {
    const [rows] = await this.db.execute<MysqlRow<Settings>[]>(
      'SELECT ticker,slide_seconds AS slideSeconds,ticker_news_ids AS tickerNewsIds FROM display_settings WHERE id=1',
    );
    if (!rows[0]) throw new Error('Display settings are missing');
    return rows[0];
  }

  async saveSettings(input: SettingsInput) {
    if (input.ticker === undefined) {
      await this.db.execute('UPDATE display_settings SET slide_seconds=? WHERE id=1', [
        input.slideSeconds,
      ]);
      return;
    }
    await this.db.execute(
      'UPDATE display_settings SET ticker=?,slide_seconds=?,ticker_news_ids=NULL WHERE id=1',
      [input.ticker, input.slideSeconds],
    );
  }

  async saveTicker(input: TickerInput) {
    await this.db.execute('UPDATE display_settings SET ticker=?,ticker_news_ids=? WHERE id=1', [
      input.text,
      input.newsIds && JSON.stringify(input.newsIds),
    ]);
  }
}
