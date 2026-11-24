import type { Permission, UserIdentity } from '../auth/identity.js';

export const USERS_REPOSITORY = Symbol('UsersRepository');

export interface UsersRepository {
  list(): Promise<UserIdentity[]>;
  createEditor(email: string, hash: string, permissions: Permission[]): Promise<number | null>;
  setPermissions(id: number, permissions: Permission[]): Promise<boolean>;
}
