import { Module } from '@nestjs/common';
import { FeedsModule } from '../feeds/feeds.module.js';
import { NewsModule } from '../news/news.module.js';
import { ScreensModule } from '../screens/screens.module.js';
import { TickerModule } from '../ticker/ticker.module.js';
import { VideoSchedulesModule } from '../video-schedules/video-schedules.module.js';
import { DisplayController } from './display.controller.js';
import { DisplayService } from './display.service.js';

@Module({
  imports: [FeedsModule, NewsModule, ScreensModule, TickerModule, VideoSchedulesModule],
  controllers: [DisplayController],
  providers: [DisplayService],
})
export class DisplayModule {}
