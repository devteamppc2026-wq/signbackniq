import { createApplication } from './app.js';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { APP_CONFIG, type AppConfig } from './core/config/app-config.js';

let app: NestExpressApplication | undefined;
try {
  app = await createApplication();
  const config = app.get<AppConfig>(APP_CONFIG);
  app.enableShutdownHooks();
  await app.listen(config.port, '127.0.0.1');
  console.log(`Backend health at http://127.0.0.1:${config.port}/api/health`);
} catch {
  console.error('Could not start the server. Check the configuration and the local port.');
  await app?.close();
  process.exitCode = 1;
}
