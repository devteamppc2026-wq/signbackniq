import type { UserIdentity } from './identity.js';

export const AUTH_REPOSITORY = Symbol('AuthRepository');

export interface AuthRepository {
  account(email: string): Promise<{ id: number; passwordHash: string } | undefined>;
  session(tokenHash: string): Promise<{ user: UserIdentity; csrfHash: string } | undefined>;
  createSession(
    tokenHash: string,
    userId: number,
    csrfHash: string,
    previousHash?: string,
  ): Promise<void>;
  removeSession(tokenHash: string): Promise<void>;
}
