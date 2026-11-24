import type { NestExpressApplication } from '@nestjs/platform-express';
import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import type { AppConfig } from '../../core/config/app-config.js';

export function isReadMethod(method: string) {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method);
}

export function configureRequestPolicy(app: NestExpressApplication, config: AppConfig) {
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          frameAncestors: ["'none'"],
          mediaSrc: ["'self'"],
          upgradeInsecureRequests: config.production ? [] : null,
        },
      },
    }),
  );
  app.use(cookieParser());
  app.use('/api', (_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(
    '/api',
    rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }),
  );
  app.use(
    '/api/auth/login',
    rateLimit({
      windowMs: 900_000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: 'محاولات دخول كتير. استنى شوية وجرّب تاني.' },
    }),
  );
  app.use('/api', (request: Request, response: Response, next: NextFunction) => {
    const origin = request.get('origin');
    const displayLogin =
      request.method === 'POST' &&
      /^\/auth\/login\/?$/i.test(request.path) &&
      !!config.displayOrigin &&
      origin === config.displayOrigin;
    if (!isReadMethod(request.method) && origin !== config.origin && !displayLogin) {
      response.status(403).json({ message: 'الطلب لازم ييجي من عنوان لوحة الإدارة.' });
      return;
    }
    next();
  });
  app.use('/api', express.json({ limit: '32kb' }));
}
