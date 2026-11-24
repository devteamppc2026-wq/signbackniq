import { Injectable } from '@nestjs/common';
import { NewsService } from '../news/news.service.js';
import { ScreensService } from '../screens/screens.service.js';
import { TickerService } from '../ticker/ticker.service.js';
import { VideoSchedulesService } from '../video-schedules/video-schedules.service.js';

@Injectable()
export class DisplayService {
  constructor(
    private readonly news: NewsService,
    private readonly screens: ScreensService,
    private readonly ticker: TickerService,
    private readonly videos: VideoSchedulesService,
  ) {}

  async feed(key: string, at = new Date()) {
    const screen = await this.screens.get(key);
    const [news, activeVideo, settings] = await Promise.all([
      this.news.list(at),
      this.videos.active(screen.id, at),
      this.ticker.forScreen(screen.key, at),
    ]);
    return { screen, news, activeVideo, serverTime: at, settings };
  }
}
