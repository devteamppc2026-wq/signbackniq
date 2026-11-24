import { readFile } from 'node:fs/promises';
import type { RowDataPacket } from 'mysql2/promise';
import { loadConfig } from './core/config/app-config.js';
import { createMysqlPool } from './core/database/mysql.js';
const pool = createMysqlPool(loadConfig().database);

const lock = 'union-display:schema';
const additions = [
  {
    table: 'news',
    column: 'video_url',
    sql: 'ALTER TABLE news ADD COLUMN video_url VARCHAR(255) NULL',
  },
  {
    table: 'display_settings',
    column: 'ticker_news_ids',
    sql: 'ALTER TABLE display_settings ADD COLUMN ticker_news_ids JSON NULL',
  },
  {
    table: 'news',
    column: 'starts_at',
    sql: 'ALTER TABLE news ADD COLUMN starts_at DATETIME(3) NULL',
  },
  { table: 'news', column: 'ends_at', sql: 'ALTER TABLE news ADD COLUMN ends_at DATETIME(3) NULL' },
  {
    table: 'news',
    column: 'slide_seconds',
    sql: 'ALTER TABLE news ADD COLUMN slide_seconds SMALLINT UNSIGNED NULL',
  },
  {
    table: 'news',
    column: 'carousel_priority',
    sql: 'ALTER TABLE news ADD COLUMN carousel_priority SMALLINT UNSIGNED NOT NULL DEFAULT 0',
  },
  {
    table: 'news',
    column: 'archived_at',
    sql: 'ALTER TABLE news ADD COLUMN archived_at DATETIME(3) NULL',
  },
] as const;

async function setupDatabase() {
  const db = await pool.getConnection();
  let locked = false;
  try {
    const [result] = await db.execute<RowDataPacket[]>('SELECT GET_LOCK(?, 15) AS acquired', [
      lock,
    ]);
    locked = result[0]?.acquired === 1;
    if (!locked) throw new Error('Could not acquire schema lock');

    const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
    for (const statement of schema.split(/;\s*(?:\r?\n|$)/)) {
      if (statement.trim()) await db.query(statement);
    }
    for (const { table, column, sql } of additions) {
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?',
        [table, column],
      );
      if (rows.length === 0) await db.query(sql);
    }
    const [displayDefaults] = await db.execute<RowDataPacket[]>(
      "SELECT COLUMN_DEFAULT AS defaultSeconds FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='display_settings' AND column_name='slide_seconds'",
    );
    if (Number(displayDefaults[0]?.defaultSeconds) === 12) {
      await db.execute(
        'UPDATE display_settings SET slide_seconds=5 WHERE id=1 AND slide_seconds=12',
      );
      await db.query('ALTER TABLE display_settings ALTER COLUMN slide_seconds SET DEFAULT 5');
    }
  } finally {
    try {
      if (locked) await db.execute('SELECT RELEASE_LOCK(?)', [lock]);
    } finally {
      db.release();
    }
  }
}

try {
  await setupDatabase();
  console.log('Union display database schema is ready.');
} catch (error) {
  const code = (error as NodeJS.ErrnoException).code;
  console.error(
    'Database setup failed.',
    code || 'Check the database configuration and schema permissions.',
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
