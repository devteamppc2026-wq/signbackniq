import { createHash, createHmac, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { encodeWebp } from './sharp-image.storage.js';
import {
  InvalidVideoError,
  VideoUploadUnconfirmedError,
  type CloudMediaStorage,
  type MediaExtension,
} from './media.storage.js';

type CloudinaryCredentials = { cloudName: string; apiKey: string; apiSecret: string };
type CloudinaryAsset = {
  public_id?: string;
  format?: string;
  resource_type?: string;
  width?: number;
  height?: number;
  duration?: number;
};

const namespace = 'union-display';
const videoUploadTimeout = process.env.VERCEL === '1' ? 280_000 : 300_000;
const videoCheckInterval = 8_000;

function videoId(buffer: Buffer, secret: string) {
  const hex = createHmac('sha256', secret)
    .update('union-display/video:')
    .update(buffer)
    .digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function videoDuration(asset: CloudinaryAsset) {
  const duration = Number(asset.duration);
  return Number(asset.width) > 0 &&
    Number(asset.height) > 0 &&
    Number.isFinite(duration) &&
    duration > 0
    ? duration
    : null;
}

export class CloudinaryMedia implements CloudMediaStorage {
  constructor(private readonly credentials: CloudinaryCredentials) {}

  async store(buffer: Buffer) {
    const id = randomUUID();
    await this.upload(await encodeWebp(buffer), 'webp', id, AbortSignal.timeout(30_000));
    return `/uploads/cloud/${id}.webp`;
  }

  async storeVideo(buffer: Buffer) {
    const id = videoId(buffer, this.credentials.apiSecret);
    const url = `/uploads/cloud/${id}.mp4`;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(videoUploadTimeout)]);

    try {
      const existing = await this.readVideoDuration(id, signal);
      if (existing !== null) return { url, duration: existing };
      const upload = this.upload(buffer, 'mp4', id, signal)
        .then((asset) => {
          const duration = videoDuration(asset);
          if (duration === null) throw new InvalidVideoError();
          return duration;
        })
        .catch(async (error: unknown) => {
          if (error instanceof InvalidVideoError || signal.aborted) throw error;
          const recovered = await this.readVideoDuration(id, signal);
          if (recovered !== null) return recovered;
          throw error;
        });

      // A completed asset can be available before the original upload response arrives.
      const duration = await Promise.race([upload, this.waitForVideoDuration(id, signal)]);
      return { url, duration };
    } catch (error) {
      if (error instanceof InvalidVideoError) throw error;
      throw new VideoUploadUnconfirmedError();
    } finally {
      controller.abort();
    }
  }

  deliveryUrl(id: string, extension: MediaExtension) {
    const resource = extension === 'mp4' ? 'video' : 'image';
    return `https://res.cloudinary.com/${this.credentials.cloudName}/${resource}/upload/${namespace}/${id}.${extension}`;
  }

  private async waitForVideoDuration(id: string, signal: AbortSignal) {
    let duration: number | null;
    do {
      await delay(videoCheckInterval, undefined, { signal });
      duration = await this.readVideoDuration(id, signal);
    } while (duration === null);
    return duration;
  }

  private async readVideoDuration(id: string, signal: AbortSignal) {
    const { cloudName, apiKey, apiSecret } = this.credentials;
    const publicId = `${namespace}/${id}`;
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/resources/video/upload/${encodeURIComponent(publicId)}`;
    try {
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
        },
        redirect: 'error',
        signal: AbortSignal.any([signal, AbortSignal.timeout(5_000)]),
      });
      if (!response.ok) {
        await response.body?.cancel();
        return null;
      }
      const asset = (await response.json()) as CloudinaryAsset;
      return asset.public_id === publicId &&
        asset.resource_type === 'video' &&
        asset.format === 'mp4'
        ? videoDuration(asset)
        : null;
    } catch {
      return null;
    }
  }

  private async upload(buffer: Buffer, extension: MediaExtension, id: string, signal: AbortSignal) {
    const { cloudName, apiKey, apiSecret } = this.credentials;
    const isVideo = extension === 'mp4';
    const kind = isVideo ? 'video' : 'image';
    const params = {
      overwrite: 'false',
      public_id: `${namespace}/${id}`,
      timestamp: String(Math.floor(Date.now() / 1000)),
      ...(isVideo ? { transformation: 'c_limit,f_mp4,h_1080,vc_h264,w_1920' } : {}),
    };
    const signable = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    const form = new FormData();
    for (const [key, value] of Object.entries(params)) form.set(key, value);
    form.set('api_key', apiKey);
    form.set(
      'signature',
      createHash('sha256')
        .update(signable + apiSecret)
        .digest('hex'),
    );
    form.set(
      'file',
      new Blob([Uint8Array.from(buffer)], {
        type: isVideo ? 'application/octet-stream' : 'image/webp',
      }),
      isVideo ? 'upload' : 'upload.webp',
    );

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${kind}/upload`, {
      method: 'POST',
      body: form,
      redirect: 'error',
      signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (isVideo && response.status === 400) throw new InvalidVideoError();
      throw new Error('Cloudinary upload failed');
    }
    const asset = (await response.json()) as CloudinaryAsset;
    if (
      asset.public_id !== params.public_id ||
      asset.format !== extension ||
      asset.resource_type !== kind
    ) {
      throw new Error('Unexpected Cloudinary upload result');
    }
    return asset;
  }
}
