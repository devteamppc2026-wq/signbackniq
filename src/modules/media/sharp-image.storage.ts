import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

import { InvalidImageError, type ImageStorage } from './media.storage.js';

export async function encodeWebp(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer, { limitInputPixels: 24_000_000, animated: false });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || '')) {
      throw new InvalidImageError('Unsupported image content');
    }
    return await image
      .rotate()
      .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new InvalidImageError('Invalid image');
  }
}

export class SharpImageStorage implements ImageStorage {
  constructor(private readonly directory: string) {}

  async store(buffer: Buffer): Promise<string> {
    const encoded = await encodeWebp(buffer);
    await mkdir(this.directory, { recursive: true });
    const filename = randomUUID() + '.webp';
    await writeFile(join(this.directory, filename), encoded, { flag: 'wx' });
    return '/uploads/' + filename;
  }
}
