import { Controller, Get, Inject } from '@nestjs/common';
import { PETROLEUM_NEWS_PROVIDER, PETROLEUM_PRICES_PROVIDER } from './feeds.tokens.js';
import type { PetroleumNewsProvider } from './petroleum/models.js';
import type { PetroleumPriceProvider } from './prices/models.js';

@Controller('api')
export class FeedsController {
  constructor(
    @Inject(PETROLEUM_NEWS_PROVIDER) private readonly news: PetroleumNewsProvider,
    @Inject(PETROLEUM_PRICES_PROVIDER) private readonly prices: PetroleumPriceProvider,
  ) {}

  @Get('news/petroleum')
  petroleumNews() {
    return this.news.get();
  }

  @Get('prices/petroleum')
  petroleumPrices() {
    return this.prices.get();
  }
}
