import mysql, { type RowDataPacket } from 'mysql2/promise';
import type { AppConfig } from '../config/app-config.js';

export const MYSQL_POOL = Symbol('MysqlPool');
export type MysqlRow<T> = T & RowDataPacket;

export function createMysqlPool(options: AppConfig['database']) {
  return mysql.createPool(options);
}
