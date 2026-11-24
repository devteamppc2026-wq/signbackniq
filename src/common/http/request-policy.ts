import type { NestExpressApplication } from '@nestjs/platform-express';
import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import type { AppConfig } from '../../core/config/app-config.js';
import { isFirebaseDashboardOrigin } from './dashboard-origin.js';

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
  app.use('/uploads', (_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });
  app.use('/api', (request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    response.vary('Origin');
    const origin = request.get('origin');
    if (isFirebaseDashboardOrigin(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Access-Control-Expose-Headers', 'X-CSRF-Token');
      if (request.method === 'OPTIONS' && request.get('Access-Control-Request-Method')) {
        response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
        response.setHeader('Access-Control-Max-Age', '600');
        response.status(204).end();
        return;
      }
    }
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
    const trustedOrigin =
      origin && (origin === config.origin || origin === config.hostedOrigin || isFirebaseDashboardOrigin(origin));
    const displayLogin =
      request.method === 'POST' &&
      /^\/auth\/login\/?$/i.test(request.path) &&
      !!config.displayOrigin &&
      origin === config.displayOrigin;
    if (!isReadMethod(request.method) && !trustedOrigin && !displayLogin) {
      response.status(403).json({ message: 'الطلب لازم ييجي من عنوان لوحة الإدارة.' });
      return;
    }
    next();
  });
  app.use('/api', express.json({ limit: '32kb' }));
}
