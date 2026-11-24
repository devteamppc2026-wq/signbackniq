import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExternalPetroleumProvider } from './modules/feeds/petroleum/external.provider.js';
import {
  MINISTRY_NEWS_URL,
  MinistryPetroleumProvider,
} from './modules/feeds/petroleum/ministry.js';
import type { PetroleumFeed } from './modules/feeds/petroleum/models.js';

const timestamp = 1760000000000;
const page = `<div class="widget-thumb"><img src="/MopPublishingImages/test.jpg"></div>
<div class="widget-content">
  <a href="bulletin.aspx"><h5>خبر من الوزارة</h5></a>
  <div class="newsDate">23/11/2026</div><p>ملخص الخبر</p>
</div>`;

test('the Ministry feed caches successful articles and expires old data after a failed refresh', async () => {
  let now = timestamp;
  let calls = 0;
  let fail = false;
  const fetcher: typeof fetch = async (url) => {
    assert.equal(url, MINISTRY_NEWS_URL);
    calls++;
    return fail ? new Response(null, { status: 503 }) : new Response(page);
  };
  const provider = new MinistryPetroleumProvider(fetcher, () => now);
  const [first, duplicate] = await Promise.all([provider.get(), provider.get()]);
  assert.equal(calls, 1);
  assert.equal(first.articles[0]?.title, 'خبر من الوزارة');
  assert.equal(duplicate.status, 'fresh');
  fail = true;
  now += 6 * 60_000;
  assert.equal((await provider.get()).status, 'stale');
  now += 86400000;
  assert.deepEqual((await provider.get()).articles, []);
});

test('the external feed includes both publishers and retains the remaining provider during an outage', async () => {
  const ministry = new MinistryPetroleumProvider(
    async () => new Response(page),
    () => timestamp,
  );
  const base = await ministry.get();
  let feed: PetroleumFeed = {
    ...base,
    source: 'اليوم السابع',
    articles: [
      {
        ...base.articles[0]!,
        id: 'youm7-test',
        source: 'اليوم السابع',
        url: 'https://www.youm7.com/story/test',
      },
    ],
  };
  const external = new ExternalPetroleumProvider(ministry, { get: async () => feed });
  assert.deepEqual(
    (await external.get()).articles.map((item) => item.source),
    ['وزارة البترول والثروة المعدنية', 'اليوم السابع'],
  );
  feed = { ...feed, status: 'unavailable', articles: [] };
  const result = await external.get();
  assert.equal(result.status, 'stale');
  assert.equal(result.articles.length, 1);
});
