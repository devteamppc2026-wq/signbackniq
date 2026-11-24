import { Controller, Get, Param, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe.js';
import { CairoInformationService } from '../feeds/civic.js';
import { MAIN_SCREEN, screenKey } from '../screens/screens.dto.js';
import { DisplayService } from './display.service.js';

@Controller('api')
export class DisplayController {
  constructor(
    private readonly display: DisplayService,
    private readonly civic: CairoInformationService,
  ) {}

  @Get('display')
  async feed(@Query('screen', new ZodValidationPipe(screenKey.default(MAIN_SCREEN))) key: string) {
    const [feed, information] = await Promise.all([this.display.feed(key), this.civic.get()]);
    return { ...feed, settings: { ...feed.settings, ...information } };
  }

  @Get('screens/:key/feed')
  screenFeed(@Param('key', new ZodValidationPipe(screenKey)) key: string) {
    return this.display.feed(key);
  }
}
