export const IMAGE_STORAGE = Symbol('ImageStorage');
export const CLOUD_MEDIA_STORAGE = Symbol('CloudMediaStorage');

export type MediaExtension = 'webp' | 'mp4';
export type UploadedVideo = { url: string; duration: number };

export interface ImageStorage {
  store(buffer: Buffer): Promise<string>;
}

export interface CloudMediaStorage extends ImageStorage {
  storeVideo(buffer: Buffer): Promise<UploadedVideo>;
  deliveryUrl(id: string, extension: MediaExtension): string;
}

export class InvalidImageError extends Error {}
export class InvalidVideoError extends Error {}
export class VideoUploadUnconfirmedError extends Error {}
