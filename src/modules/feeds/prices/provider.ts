import { readLimitedText } from '../../../common/http/read-text.js';
import {
  MINISTRY_PRICES_URL,
  MINISTRY_SOURCE,
  PetroleumPriceFeed,
  PetroleumPriceGroup,
  PetroleumPriceProvider,
} from './models.js';
import { MAX_MINISTRY_BYTES, parseMinistryPrices } from './parser.js';

const CACHE_MS = 15 * 60 * 1000;
const MAX_STALE_MS = 24 * 60 * 60 * 1000;

export class MinistryPriceProvider implements PetroleumPriceProvider {
  private groups: PetroleumPriceGroup[] = [];
  private fetchedAt: number | null = null;
  private nextAttempt = 0;
  private healthy = false;
  private pending: Promise<void> | undefined;

  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly clock: () => number = Date.now,
  ) {}

  async get(): Promise<PetroleumPriceFeed> {
    if (!this.pending && this.clock() >= this.nextAttempt) {
      this.nextAttempt = this.clock() + CACHE_MS;
      this.pending = this.refresh().finally(() => {
        this.pending = undefined;
      });
    }
    await this.pending;
    const expired = this.fetchedAt === null || this.clock() - this.fetchedAt > MAX_STALE_MS;
    return {
      groups: expired ? [] : this.groups,
      source: MINISTRY_SOURCE,
      sourceUrl: MINISTRY_PRICES_URL,
      fetchedAt: this.fetchedAt === null ? null : new Date(this.fetchedAt).toISOString(),
      status: expired ? 'unavailable' : this.healthy ? 'fresh' : 'stale',
    };
  }

  private async refresh(): Promise<void> {
    try {
      const response = await this.fetcher(MINISTRY_PRICES_URL, {
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
        headers: { Accept: 'text/html' },
      });
      if (!response.ok) throw new Error('Ministry unavailable');
      const groups = parseMinistryPrices(await readLimitedText(response, MAX_MINISTRY_BYTES));
      this.groups = groups;
      this.fetchedAt = this.clock();
      this.healthy = true;
    } catch {
      this.healthy = false;
    }
  }
}
