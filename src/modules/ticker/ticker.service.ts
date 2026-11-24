import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { NewsService } from '../news/news.service.js';
import { MAIN_SCREEN } from '../screens/screens.dto.js';
import type { SettingsInput, TickerInput } from './ticker.dto.js';
import { TICKER_REPOSITORY, type TickerRepository } from './ticker.repository.js';

@Injectable()
export class TickerService {
  constructor(
    @Inject(TICKER_REPOSITORY) private readonly repository: TickerRepository,
    private readonly news: NewsService,
  ) {}

  async settings() {
    const { ticker, slideSeconds } = await this.repository.settings();
    return { ticker, slideSeconds };
  }

  saveSettings(input: SettingsInput) {
    return this.repository.saveSettings(input);
  }

  async ticker() {
    const { ticker, tickerNewsIds } = await this.repository.settings();
    return { text: ticker, newsIds: tickerNewsIds };
  }

  async saveTicker(input: TickerInput) {
    if (input.newsIds && (await this.news.headlines(input.newsIds)).size !== input.newsIds.length) {
      throw new BadRequestException('اختار أخبار منشورة من قسم النقابة.');
    }
    await this.repository.saveTicker(input);
  }

  async forScreen(key: string, at: Date) {
    const { ticker, slideSeconds, tickerNewsIds } = await this.repository.settings();
    if (key !== MAIN_SCREEN) return { ticker: '', slideSeconds };
    if (!tickerNewsIds?.length) return { ticker, slideSeconds };
    const headlines = await this.news.headlines(tickerNewsIds, at);
    const selected = tickerNewsIds
      .map((id) => headlines.get(id))
      .filter(Boolean)
      .join(' • ');
    return { ticker: selected || ticker, slideSeconds };
  }
}
