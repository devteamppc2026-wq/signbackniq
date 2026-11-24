import type { PetroleumArticle, PetroleumFeed, PetroleumNewsProvider } from './models.js';

export class ExternalPetroleumProvider implements PetroleumNewsProvider {
  constructor(
    private readonly ministry: PetroleumNewsProvider,
    private readonly youm7: PetroleumNewsProvider,
  ) {}

  async get(): Promise<PetroleumFeed> {
    const [ministry, youm7] = await Promise.all([this.ministry.get(), this.youm7.get()]);
    const articles = new Map<string, PetroleumArticle>();
    for (let i = 0; i < 12 && articles.size < 12; i++) {
      for (const article of [ministry.articles[i], youm7.articles[i]]) {
        if (article && articles.size < 12) articles.set(article.url, article);
      }
    }
    const feeds = [ministry, youm7];
    return {
      articles: [...articles.values()],
      source:
        ministry.articles.length && youm7.articles.length
          ? 'وزارة البترول واليوم السابع'
          : ministry.articles.length
            ? ministry.source
            : youm7.articles.length
              ? youm7.source
              : 'وزارة البترول واليوم السابع',
      updatedAt:
        feeds
          .flatMap((feed) => (feed.updatedAt ? [feed.updatedAt] : []))
          .sort()
          .at(-1) ?? null,
      status: feeds.every((feed) => feed.status === 'unavailable')
        ? 'unavailable'
        : feeds.every((feed) => feed.status === 'fresh')
          ? 'fresh'
          : 'stale',
    };
  }
}
