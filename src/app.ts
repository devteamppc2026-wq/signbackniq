import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module.js';
import { configureRequestPolicy } from './common/http/request-policy.js';
import { APP_CONFIG, type AppConfig } from './core/config/app-config.js';
import { publicDirectory } from './modules/pages/pages.controller.js';

export async function createApplication() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: false,
    abortOnError: false,
  });
  const config = app.get<AppConfig>(APP_CONFIG);
  configureRequestPolicy(app, config);
  app.useStaticAssets(config.uploads, {
    prefix: '/uploads',
    dotfiles: 'deny',
    immutable: true,
    maxAge: '1y',
  });
  app.useStaticAssets(join(publicDirectory, 'assets'), {
    prefix: '/assets',
    dotfiles: 'deny',
    index: false,
  });
  return app;
}
