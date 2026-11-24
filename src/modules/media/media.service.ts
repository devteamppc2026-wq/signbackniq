import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { cloudFilename } from '../../common/media-path.js';
import {
  CLOUD_MEDIA_STORAGE,
  IMAGE_STORAGE,
  InvalidImageError,
  InvalidVideoError,
  VideoUploadUnconfirmedError,
  type CloudMediaStorage,
  type ImageStorage,
} from './media.storage.js';

@Injectable()
export class MediaService {
  constructor(
    @Inject(IMAGE_STORAGE) private readonly images: ImageStorage,
    @Inject(CLOUD_MEDIA_STORAGE) private readonly cloud: CloudMediaStorage | null,
  ) {}

  async storeImage(buffer: Buffer) {
    try {
      return { url: await this.images.store(buffer) };
    } catch (error) {
      if (error instanceof InvalidImageError) throw new BadRequestException('ملف الصورة مش صالح.');
      throw error;
    }
  }

  async storeVideo(buffer: Buffer) {
    if (!this.cloud) throw new ServiceUnavailableException('رفع الفيديو مش متاح دلوقتي.');
    try {
      return await this.cloud.storeVideo(buffer);
    } catch (error) {
      if (error instanceof InvalidVideoError) throw new BadRequestException('ملف الفيديو مش صالح.');
      if (error instanceof VideoUploadUnconfirmedError) {
        throw new ServiceUnavailableException(
          'لسه ما قدرناش نأكد جاهزية الفيديو. حاول تحفظ تاني بنفس الملف.',
        );
      }
      throw error;
    }
  }

  async openAsset(
    filename: string,
    method: string,
    range: string | undefined,
    signal: AbortSignal,
  ) {
    const match = cloudFilename.exec(filename);
    if (!match || !this.cloud) return;
    const [, id, extension] = match;
    if (!id || (extension !== 'webp' && extension !== 'mp4')) return;

    const headers = new Headers({ 'Accept-Encoding': 'identity' });
    if (extension === 'mp4' && range && /^bytes=(?:\d{1,16}-\d{0,16}|-\d{1,16})$/.test(range)) {
      headers.set('Range', range);
    }
    const upstream = await fetch(this.cloud.deliveryUrl(id, extension), {
      method,
      headers,
      redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(60_000)]),
    });
    return {
      upstream,
      ranged: headers.has('Range'),
      type: extension === 'webp' ? 'image/webp' : 'video/mp4',
    };
  }
}
