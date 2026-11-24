import { Module } from '@nestjs/common';
import { CairoInformationService } from './civic.js';
import { FeedsController } from './feeds.controller.js';
import { PETROLEUM_NEWS_PROVIDER, PETROLEUM_PRICES_PROVIDER } from './feeds.tokens.js';
import { Youm7PetroleumProvider } from './petroleum/provider.js';
import { MinistryPetroleumProvider } from './petroleum/ministry.js';
import { ExternalPetroleumProvider } from './petroleum/external.provider.js';
import { MinistryPriceProvider } from './prices/provider.js';

@Module({
  controllers: [FeedsController],
  providers: [
    CairoInformationService,
    {
      provide: PETROLEUM_NEWS_PROVIDER,
      useFactory: () =>
        new ExternalPetroleumProvider(
          new MinistryPetroleumProvider(),
          new Youm7PetroleumProvider(),
        ),
    },
    { provide: PETROLEUM_PRICES_PROVIDER, useFactory: () => new MinistryPriceProvider() },
  ],
  exports: [CairoInformationService],
})
export class FeedsModule {}
