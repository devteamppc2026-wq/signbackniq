import { readLimitedText } from '../../../common/http/read-text.js';
import { PetroleumArticle, PetroleumFeed, PetroleumNewsProvider } from './models.js';
import { MAX_FEED_BYTES, parsePetroleumRss, publicationOrder } from './parser.js';

const RSS_URLS = [
  'https://www.youm7.com/rss/sectionrss?sectionid=297',
  'https://www.youm7.com/rss/sectionrss?sectionid=65',
] as const;
const CACHE_MS = 5 * 60 * 1000;
const MAX_STALE_MS = 24 * 60 * 60 * 1000;
type Fetcher = typeof fetch;

export class Youm7PetroleumProvider implements PetroleumNewsProvider {
  private articles: PetroleumArticle[] = [];
  private updatedAt: number | null = null;
  private nextAttempt = 0;
  private healthy = false;
  private pending: Promise<void> | undefined;

  constructor(
    private readonly fetcher: Fetcher = fetch,
    private readonly clock: () => number = Date.now,
  ) {}

  async get(): Promise<PetroleumFeed> {
    if (!this.pending && this.clock() >= this.nextAttempt) {
      this.nextAttempt = this.clock() + CACHE_MS;
      this.pending = this.refresh().finally(() => {
        this.pending = undefined;
      });
    }
    await this.pending;
    const expired = this.updatedAt !== null && this.clock() - this.updatedAt > MAX_STALE_MS;
    return {
      articles: expired ? [] : this.articles,
      source: 'اليوم السابع',
      updatedAt: this.updatedAt === null ? null : new Date(this.updatedAt).toISOString(),
      status: this.updatedAt === null || expired ? 'unavailable' : this.healthy ? 'fresh' : 'stale',
    };
  }

  private async refresh(): Promise<void> {
    const results = await Promise.allSettled(
      RSS_URLS.map(async (url) => {
        const response = await this.fetcher(url, {
          signal: AbortSignal.timeout(8000),
          redirect: 'error',
          headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
        });
        if (!response.ok) throw new Error('RSS provider unavailable');
        return parsePetroleumRss(await readLimitedText(response, MAX_FEED_BYTES));
      }),
    );
    const successful = results.filter(
      (result): result is PromiseFulfilledResult<PetroleumArticle[]> =>
        result.status === 'fulfilled',
    );
    this.healthy = successful.length === results.length;
    if (successful.length === 0) return;
    const byUrl = new Map<string, PetroleumArticle>();
    for (const article of [...successful.flatMap((result) => result.value)]) {
      if (!byUrl.has(article.url)) byUrl.set(article.url, article);
    }
    this.articles = [...byUrl.values()]
      .sort((a, b) => publicationOrder(b.publishedAt) - publicationOrder(a.publishedAt))
      .slice(0, 12);
    this.updatedAt = this.clock();
  }
}
