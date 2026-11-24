import assert from 'node:assert/strict';
import { test } from 'node:test';
import { localVideoPath } from './common/media-path.js';
import { CloudinaryMedia } from './modules/media/cloudinary.storage.js';
import { InvalidVideoError } from './modules/media/media.storage.js';

const credentials = { cloudName: 'fixtures', apiKey: 'test-key', apiSecret: 'test-secret' };

test('a ready video is recovered after the upload response drops and reused on retry', async (t) => {
  let publicId: string | null = null;
  let uploads = 0;
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    if (options.method === 'POST') {
      uploads++;
      publicId = String((options.body as FormData).get('public_id'));
      throw new TypeError('Lost upload response');
    }
    if (!publicId) return new Response(null, { status: 404 });
    assert.ok(url.endsWith('/' + encodeURIComponent(publicId)));
    return Response.json({
      public_id: publicId,
      format: 'mp4',
      resource_type: 'video',
      width: 1280,
      height: 720,
      duration: 30,
    });
  });

  const media = new CloudinaryMedia(credentials);
  const video = Buffer.from('test video content');
  const asset = await media.storeVideo(video);
  assert.match(asset.url, localVideoPath);
  assert.equal(asset.duration, 30);
  assert.deepEqual(await media.storeVideo(video), asset);
  assert.equal(uploads, 1);
});

test('a rejected video upload does not get reported as a successful upload', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: string, options: RequestInit) =>
      new Response(null, { status: options.method === 'POST' ? 400 : 404 }),
  );

  const media = new CloudinaryMedia(credentials);
  await assert.rejects(media.storeVideo(Buffer.from('invalid video')), InvalidVideoError);
});
