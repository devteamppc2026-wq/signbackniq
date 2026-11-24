import type { Pool, ResultSetHeader } from 'mysql2/promise';
import type { MysqlRow } from '../../core/database/mysql.js';
import type { ScheduleInput } from './video-schedules.dto.js';
import type {
  SavedSchedule,
  Schedule,
  VideoSchedulesRepository,
} from './video-schedules.repository.js';

const scheduleColumns =
  'id,title,video_url AS videoUrl,target,screen_id AS screenId,starts_at AS startsAt,ends_at AS endsAt,cancelled_at AS cancelledAt';

export class MysqlVideoSchedulesRepository implements VideoSchedulesRepository {
  constructor(private readonly db: Pool) {}

  async schedules() {
    const [rows] = await this.db.execute<MysqlRow<Schedule>[]>(
      `SELECT ${scheduleColumns} FROM display_video_schedules ORDER BY starts_at DESC,id DESC`,
    );
    return rows;
  }

  async saveSchedule(input: ScheduleInput, id?: number): Promise<SavedSchedule> {
    try {
      return await this.writeSchedule(input, id);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ER_NO_REFERENCED_ROW_2')
        return 'unknown-screen';
      throw error;
    }
  }

  private async writeSchedule(input: ScheduleInput, id?: number) {
    const values = [
      input.title,
      input.videoUrl,
      input.target,
      input.screenId,
      input.startsAt,
      input.endsAt,
    ];
    if (id === undefined) {
      const [result] = await this.db.execute<ResultSetHeader>(
        'INSERT INTO display_video_schedules (title,video_url,target,screen_id,starts_at,ends_at) VALUES (?,?,?,?,?,?)',
        values,
      );
      return result.insertId;
    }
    const [result] = await this.db.execute<ResultSetHeader>(
      'UPDATE display_video_schedules SET title=?,video_url=?,target=?,screen_id=?,starts_at=?,ends_at=? WHERE id=? AND cancelled_at IS NULL',
      [...values, id],
    );
    return result.affectedRows ? id : null;
  }

  async cancelSchedule(id: number, at: Date) {
    const [result] = await this.db.execute<ResultSetHeader>(
      'UPDATE display_video_schedules SET cancelled_at=COALESCE(cancelled_at, ?) WHERE id=?',
      [at, id],
    );
    return result.affectedRows > 0;
  }

  async activeSchedule(screenId: number, at: Date) {
    const [rows] = await this.db.execute<MysqlRow<Schedule>[]>(
      `SELECT ${scheduleColumns} FROM display_video_schedules
       WHERE cancelled_at IS NULL AND starts_at<=? AND ends_at>? AND (target='all' OR (target='screen' AND screen_id=?))
       ORDER BY (target='screen') DESC, starts_at DESC, id DESC LIMIT 1`,
      [at, at, screenId],
    );
    return rows[0] ?? null;
  }
}
