import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DisplayService } from './modules/display/display.service.js';
import { NewsService } from './modules/news/news.service.js';
import type { NewsRepository } from './modules/news/news.repository.js';
import { createNewsInput, newsInput } from './modules/news/news.dto.js';
import { ScreensService } from './modules/screens/screens.service.js';
import type { ScreensRepository } from './modules/screens/screens.repository.js';
import { TickerService } from './modules/ticker/ticker.service.js';
import type { TickerRepository } from './modules/ticker/ticker.repository.js';
import { scheduleInput } from './modules/video-schedules/video-schedules.dto.js';
import { VideoSchedulesService } from './modules/video-schedules/video-schedules.service.js';
import type { VideoSchedulesRepository } from './modules/video-schedules/video-schedules.repository.js';

const now = new Date('2026-11-23T09:00:00.000Z');
const clip = {
  title: 'فيديو النقابة',
  videoUrl: '/uploads/cloud/00000000-0000-4000-8000-000000000000.mp4',
  startsAt: '2026-11-23T11:00:00+02:00',
  endsAt: '2026-11-23T09:15:00Z',
};

test('news can publish immediately or use its own duration and publication window', () => {
  const input = { title: 'خبر النقابة', body: 'وصف الخبر' };
  const defaults = newsInput.parse(input);
  assert.equal(defaults.status, 'published');
  assert.equal(defaults.slideSeconds, null);
  assert.equal(defaults.startsAt, null);
  assert.equal(
    newsInput
      .parse({ ...input, slideSeconds: 25, startsAt: clip.startsAt })
      .startsAt?.toISOString(),
    now.toISOString(),
  );
  assert.equal(newsInput.safeParse({ ...input, slideSeconds: 0 }).success, false);
  assert.equal(
    newsInput.safeParse({ ...input, startsAt: clip.endsAt, endsAt: clip.startsAt }).success,
    false,
  );
});

test('new text and video items share five-second slides and a one-week publication window', () => {
  const justBefore = Date.now();
  const input = { title: 'خبر من غير وصف', videoUrl: clip.videoUrl };
  const parsed = createNewsInput.parse(input);
  assert.equal(parsed.body, '');
  assert.equal(parsed.slideSeconds, 5);
  assert.equal(parsed.videoUrl, clip.videoUrl);
  assert.ok(parsed.startsAt!.valueOf() >= justBefore);
  assert.equal(parsed.endsAt!.valueOf() - parsed.startsAt!.valueOf(), 7 * 86400_000);
  assert.equal(createNewsInput.parse({ ...input, priority: 18, endsAt: null }).priority, 18);
  assert.equal(createNewsInput.safeParse({ ...input, priority: 3.5 }).success, false);
});

test('video stories can use their full duration outside the range for text and photo stories', () => {
  for (const duration of [2, 180, 65_535]) {
    const story = { title: 'فيديو النقابة', slideSeconds: duration };
    assert.equal(newsInput.parse({ ...story, videoUrl: clip.videoUrl }).slideSeconds, duration);
    assert.equal(newsInput.safeParse(story).success, false);
  }
  assert.equal(
    newsInput.safeParse({ title: 'فيديو النقابة', videoUrl: clip.videoUrl, slideSeconds: 65_536 })
      .success,
    false,
  );
});

test('video can wait for a screen, target all screens or require a specific screen ID', () => {
  assert.equal(scheduleInput.parse({ ...clip, target: 'unassigned' }).screenId, null);
  assert.equal(scheduleInput.parse({ ...clip, target: 'all' }).screenId, null);
  assert.equal(scheduleInput.parse({ ...clip, target: 'screen', screenId: 2 }).screenId, 2);
  assert.equal(scheduleInput.safeParse({ ...clip, target: 'screen' }).success, false);
  assert.equal(scheduleInput.safeParse({ ...clip, target: 'all', screenId: 2 }).success, false);
  assert.equal(
    scheduleInput.safeParse({ ...clip, target: 'all', endsAt: clip.startsAt }).success,
    false,
  );
});

test('display evaluates stories, ticker and the screen video at the same instant', async () => {
  let selectedScreen = 0;
  const news = new NewsService({
    listNews: async (at: Date) => {
      assert.equal(at, now);
      return [];
    },
    headlines: async (_ids: number[], at: Date) => {
      assert.equal(at, now);
      return new Map([
        [3, 'الثالث'],
        [5, 'الخامس'],
      ]);
    },
  } as unknown as NewsRepository);
  const screens = new ScreensService({
    screen: async (key: string) =>
      key === 'main' ? { id: 1, key, name: 'الرئيسية' } : { id: 2, key, name: 'قاعة' },
  } as ScreensRepository);
  const ticker = new TickerService(
    {
      settings: async () => ({
        ticker: 'النص الاحتياطي',
        slideSeconds: 12,
        tickerNewsIds: [5, 2, 3],
      }),
    } as TickerRepository,
    news,
  );
  const videos = new VideoSchedulesService({
    activeSchedule: async (id: number, at: Date) => {
      selectedScreen = id;
      assert.equal(at, now);
      return null;
    },
  } as VideoSchedulesRepository);
  const service = new DisplayService(news, screens, ticker, videos);
  assert.equal((await service.feed('main', now)).settings.ticker, 'الخامس • الثالث');
  assert.equal(selectedScreen, 1);
  assert.equal((await service.feed('hall', now)).settings.ticker, '');
  assert.equal(selectedScreen, 2);
});
