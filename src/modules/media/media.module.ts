import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../core/config/app-config.js';
import { ConfigModule } from '../../core/config/config.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CloudinaryMedia } from './cloudinary.storage.js';
import { MediaDeliveryController } from './media-delivery.controller.js';
import { MediaService } from './media.service.js';
import { CLOUD_MEDIA_STORAGE, IMAGE_STORAGE, type CloudMediaStorage } from './media.storage.js';
import { SharpImageStorage } from './sharp-image.storage.js';
import { UploadController } from './upload.controller.js';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [UploadController, MediaDeliveryController],
  providers: [
    MediaService,
    {
      provide: CLOUD_MEDIA_STORAGE,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        config.cloudinary ? new CloudinaryMedia(config.cloudinary) : null,
    },
    {
      provide: IMAGE_STORAGE,
      inject: [APP_CONFIG, CLOUD_MEDIA_STORAGE],
      useFactory: (config: AppConfig, cloud: CloudMediaStorage | null) =>
        cloud ?? new SharpImageStorage(config.uploads),
    },
  ],
})
export class MediaModule {}
