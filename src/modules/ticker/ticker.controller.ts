import { Body, Controller, Get, HttpCode, Put, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { SessionGuard } from '../auth/session.guard.js';
import { CairoInformationService } from '../feeds/civic.js';
import { settingsInput, tickerInput, type SettingsInput, type TickerInput } from './ticker.dto.js';
import { TickerService } from './ticker.service.js';

@Controller('api/admin')
@UseGuards(SessionGuard, AdminGuard)
export class TickerController {
  constructor(
    private readonly display: TickerService,
    private readonly civic: CairoInformationService,
  ) {}

  @Get('settings')
  async settings() {
    return { ...(await this.display.settings()), ...(await this.civic.get()) };
  }

  @Put('settings')
  @HttpCode(204)
  writeSettings(@Body(new ZodValidationPipe(settingsInput)) input: SettingsInput) {
    return this.display.saveSettings(input);
  }

  @Get('ticker')
  ticker() {
    return this.display.ticker();
  }

  @Put('ticker')
  @HttpCode(204)
  writeTicker(@Body(new ZodValidationPipe(tickerInput)) input: TickerInput) {
    return this.display.saveTicker(input);
  }
}
