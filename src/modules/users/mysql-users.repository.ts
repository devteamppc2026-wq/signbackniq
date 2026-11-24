import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import type { MysqlRow } from '../../core/database/mysql.js';
import { toIdentity, type Permission, type Role } from '../auth/identity.js';
import type { UsersRepository } from './users.repository.js';

type Account = { id: number; email: string; role: Role };

export class MysqlUsersRepository implements UsersRepository {
  constructor(private readonly db: Pool) {}

  async list() {
    const [rows] = await this.db.execute<MysqlRow<Account & { permission: Permission | null }>[]>(
      `SELECT u.id,u.email,u.role,p.permission FROM dashboard_users u
       LEFT JOIN dashboard_permissions p ON p.user_id=u.id ORDER BY u.role,u.email,p.permission`,
    );
    const accounts = new Map<number, { user: Account; permissions: Permission[] }>();
    for (const row of rows) {
      const account = accounts.get(row.id) ?? { user: row, permissions: [] };
      if (row.permission) account.permissions.push(row.permission);
      accounts.set(row.id, account);
    }
    return [...accounts.values()].map(({ user, permissions }) => toIdentity(user, permissions));
  }

  async createEditor(email: string, hash: string, permissions: Permission[]) {
    try {
      return await this.transaction(async (connection) => {
        const [result] = await connection.execute<ResultSetHeader>(
          "INSERT INTO dashboard_users (email,password_hash,role) VALUES (?,?,'editor')",
          [email, hash],
        );
        await this.insertPermissions(connection, result.insertId, permissions);
        return result.insertId;
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ER_DUP_ENTRY') return null;
      throw error;
    }
  }

  async setPermissions(id: number, permissions: Permission[]) {
    return this.transaction(async (connection) => {
      const [rows] = await connection.execute<MysqlRow<{ id: number }>[]>(
        "SELECT id FROM dashboard_users WHERE id=? AND role='editor' FOR UPDATE",
        [id],
      );
      if (!rows[0]) return false;
      await connection.execute('DELETE FROM dashboard_permissions WHERE user_id=?', [id]);
      await this.insertPermissions(connection, id, permissions);
      return true;
    });
  }

  async seedAdmin(email: string, hash: string): Promise<'created' | 'exists' | 'editor'> {
    try {
      await this.db.execute(
        "INSERT INTO dashboard_users (email,password_hash,role) VALUES (?,?,'admin')",
        [email, hash],
      );
      return 'created';
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ER_DUP_ENTRY') throw error;
      const [rows] = await this.db.execute<MysqlRow<{ role: Role }>[]>(
        'SELECT role FROM dashboard_users WHERE email=?',
        [email],
      );
      return rows[0]?.role === 'admin' ? 'exists' : 'editor';
    }
  }

  private async insertPermissions(
    connection: PoolConnection,
    id: number,
    permissions: Permission[],
  ) {
    if (!permissions.length) return;
    const placeholders = permissions.map(() => '(?,?)').join(',');
    await connection.execute(
      `INSERT INTO dashboard_permissions (user_id,permission) VALUES ${placeholders}`,
      permissions.flatMap((permission) => [id, permission]),
    );
  }

  private async transaction<R>(operation: (connection: PoolConnection) => Promise<R>) {
    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      const result = await operation(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
