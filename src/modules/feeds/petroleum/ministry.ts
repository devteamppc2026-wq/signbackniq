import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { readLimitedText } from '../../../common/http/read-text.js';
import type { PetroleumArticle, PetroleumFeed, PetroleumNewsProvider } from './models.js';

export const MINISTRY_NEWS_URL =
  'https://www.petroleum.gov.eg/ar-eg/media-center/news/news-pages/Pages/default.aspx';
const SOURCE = 'وزارة البترول والثروة المعدنية';
const MAX_BYTES = 2 * 1024 * 1024;
const CACHE_MS = 5 * 60_000;
const MAX_STALE_MS = 24 * 60 * 60_000;

function approvedUrl(raw: string, image = false) {
  try {
    const url = new URL(raw, MINISTRY_NEWS_URL);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'www.petroleum.gov.eg' ||
      url.username ||
      url.password ||
      url.port
    )
      return null;
    const allowed = image
      ? /\/MopPublishingImages\//i.test(url.pathname)
      : /^\/ar-eg\/media-center\/news\/news-pages\/Pages\/(?!default\.aspx)[\w-]+\.aspx$/i.test(
          url.pathname,
        );
    if (!allowed) return null;
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

export function parseMinistryNews(html: string): PetroleumArticle[] {
  if (Buffer.byteLength(html, 'utf8') > MAX_BYTES) throw new Error('Oversized ministry news');
  const $ = load(html);
  $('script, style').remove();
  const articles = new Map<string, PetroleumArticle>();
  const clean = (value: string) => value.replace(/\s+/g, ' ').trim();
  $('.widget-content').each((_index, element) => {
    const content = $(element);
    const url = approvedUrl(content.find('a[href]').first().attr('href') || '');
    const title = clean(content.find('h5').text()).slice(0, 220);
    const publishedAt = clean(content.find('.newsDate').text()).slice(0, 100);
    if (!url || !title || !publishedAt || articles.has(url)) return;
    const summary = content.find('p').clone();
    summary.find('a').remove();
    const image = content.prev('.widget-thumb').find('img').attr('src');
    articles.set(url, {
      id: createHash('sha256').update(url).digest('hex').slice(0, 24),
      title,
      body: clean(summary.text()).slice(0, 220),
      source: SOURCE,
      url,
      imageUrl: image ? approvedUrl(image, true) : null,
      publishedAt,
    });
  });
  return [...articles.values()].slice(0, 12);
}

export class MinistryPetroleumProvider implements PetroleumNewsProvider {
  private saved: PetroleumFeed | undefined;
  private nextAttempt = 0;
  private failed = false;
  private pending: Promise<void> | undefined;

  constructor(
    private readonly fetcher: typeof fetch = fetch,
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
    const saved = this.saved;
    if (!saved || this.clock() - Date.parse(saved.updatedAt!) > MAX_STALE_MS) {
      return { articles: [], source: SOURCE, updatedAt: null, status: 'unavailable' };
    }
    return { ...saved, status: this.failed ? 'stale' : 'fresh' };
  }

  private async refresh() {
    try {
      const response = await this.fetcher(MINISTRY_NEWS_URL, {
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
        headers: { Accept: 'text/html' },
      });
      if (!response.ok) throw new Error('Ministry news unavailable');
      const articles = parseMinistryNews(await readLimitedText(response, MAX_BYTES));
      if (!articles.length) throw new Error('Ministry news listings missing');
      this.saved = {
        articles,
        source: SOURCE,
        updatedAt: new Date(this.clock()).toISOString(),
        status: 'fresh',
      };
      this.failed = false;
    } catch {
      this.failed = true;
    }
  }
}
