import type { NestExpressApplication } from '@nestjs/platform-express';
import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import type { AppConfig } from '../../core/config/app-config.js';
import { isFirebaseDashboardOrigin, isFirebaseDisplayOrigin } from './frontend-origins.js';

const loginPath = /^\/auth\/login\/?$/i;
const displayFeedPath = /^\/(?:display|news\/petroleum|prices\/petroleum)\/?$/i;

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
    const dashboard = isFirebaseDashboardOrigin(origin);
    const preflight = request.method === 'OPTIONS' && request.get('Access-Control-Request-Method');
    const method = preflight || request.method;
    const display = isFirebaseDisplayOrigin(origin);
    const displayLogin = display && method === 'POST' && loginPath.test(request.path);
    const displayRead = display && (method === 'GET' || method === 'HEAD') && displayFeedPath.test(request.path);
    if (origin && (dashboard || displayLogin || displayRead)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      if (dashboard || displayLogin) response.setHeader('Access-Control-Allow-Credentials', 'true');
      if (dashboard) response.setHeader('Access-Control-Expose-Headers', 'X-CSRF-Token');
      if (preflight) {
        response.setHeader('Access-Control-Allow-Methods', dashboard ? 'GET, HEAD, POST, PUT, DELETE' : method);
        response.setHeader('Access-Control-Allow-Headers', dashboard ? 'Content-Type, X-CSRF-Token' : 'Content-Type');
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
      loginPath.test(request.path) &&
      (!!origin && (origin === config.displayOrigin || isFirebaseDisplayOrigin(origin)));
    if (!isReadMethod(request.method) && !trustedOrigin && !displayLogin) {
      response.status(403).json({ message: 'الطلب لازم ييجي من عنوان لوحة الإدارة.' });
      return;
    }
    next();
  });
  app.use('/api', express.json({ limit: '32kb' }));
}
