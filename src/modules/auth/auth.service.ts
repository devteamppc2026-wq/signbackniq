import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AUTH_REPOSITORY, type AuthRepository } from './auth.repository.js';
import type { LoginInput } from './auth.dto.js';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const isToken = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

@Injectable()
export class AuthService {
  constructor(@Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository) {}

  async login({ email, password }: LoginInput, previous: unknown) {
    const account = await this.repository.account(email);
    const valid = await bcrypt.compare(
      password,
      account?.passwordHash || '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYh7gT9ZDRTZcETSTTt2FFEFzOTg8JL6',
    );
    if (!account || !valid)
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غلط.');
    const session = randomBytes(32).toString('hex');
    const csrf = randomBytes(32).toString('hex');
    await this.repository.createSession(
      digest(session),
      account.id,
      digest(csrf),
      isToken(previous) ? digest(previous) : undefined,
    );
    return { session, csrf, email };
  }

  async authorize(token: unknown, csrf: unknown, write: boolean) {
    if (!isToken(token)) throw new UnauthorizedException('سجّل الدخول الأول.');
    const session = await this.repository.session(digest(token));
    if (!session) throw new UnauthorizedException('جلسة الدخول انتهت. سجّل الدخول تاني.');
    if (
      write &&
      (!isToken(csrf) ||
        !isToken(session.csrfHash) ||
        !timingSafeEqual(Buffer.from(digest(csrf)), Buffer.from(session.csrfHash)))
    ) {
      throw new ForbiddenException('تعذّر تأكيد الطلب. حدّث الصفحة وجرّب تاني.');
    }
    return session.user;
  }

  async logout(token: unknown) {
    if (isToken(token)) await this.repository.removeSession(digest(token));
  }
}
