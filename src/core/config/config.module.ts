import { Module } from '@nestjs/common';
import { APP_CONFIG, loadConfig } from './app-config.js';

@Module({
  providers: [{ provide: APP_CONFIG, useFactory: loadConfig }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
