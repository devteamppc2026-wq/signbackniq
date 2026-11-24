import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { AuthRepository } from './auth.repository.js';
import { toIdentity, type Permission, type Role } from './identity.js';

export class MysqlAuthRepository implements AuthRepository {
  constructor(private readonly db: Pool) {}

  async account(email: string) {
    const [rows] = await this.db.execute<(RowDataPacket & { id: number; passwordHash: string })[]>(
      'SELECT id,password_hash AS passwordHash FROM dashboard_users WHERE email=?',
      [email],
    );
    return rows[0];
  }

  async session(tokenHash: string) {
    type SessionRow = RowDataPacket & {
      id: number;
      email: string;
      role: Role;
      csrfHash: string;
      permission: Permission | null;
    };
    const [rows] = await this.db.execute<SessionRow[]>(
      `SELECT u.id,u.email,u.role,s.csrf_hash AS csrfHash,p.permission
       FROM dashboard_sessions s JOIN dashboard_users u ON u.id=s.user_id
       LEFT JOIN dashboard_permissions p ON p.user_id=u.id
       WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP() ORDER BY p.permission`,
      [tokenHash],
    );
    const row = rows[0];
    if (!row) return undefined;
    const permissions = rows.flatMap((row) => (row.permission ? [row.permission] : []));
    return { user: toIdentity(row, permissions), csrfHash: row.csrfHash };
  }

  async createSession(tokenHash: string, userId: number, csrfHash: string, previousHash?: string) {
    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      if (previousHash)
        await connection.execute('DELETE FROM dashboard_sessions WHERE token_hash=?', [
          previousHash,
        ]);
      await connection.execute('DELETE FROM dashboard_sessions WHERE expires_at<=UTC_TIMESTAMP()');
      await connection.execute(
        'INSERT INTO dashboard_sessions (token_hash,user_id,csrf_hash,expires_at) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))',
        [tokenHash, userId, csrfHash],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async removeSession(tokenHash: string) {
    await this.db.execute('DELETE FROM dashboard_sessions WHERE token_hash=?', [tokenHash]);
  }
}
