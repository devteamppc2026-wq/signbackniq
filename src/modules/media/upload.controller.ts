import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SessionGuard } from '../auth/session.guard.js';
import { PermissionsGuard, RequireAnyPermission } from '../auth/permissions.guard.js';
import { MediaService } from './media.service.js';
import { UploadFilePipe } from './upload-file.pipe.js';

const imageFile = new UploadFilePipe(
  ['image/jpeg', 'image/png', 'image/webp'],
  'اختار صورة JPEG أو PNG أو WebP.',
);
const videoFile = new UploadFilePipe(
  ['video/mp4', 'video/quicktime', 'video/webm'],
  'اختار فيديو MP4 أو MOV أو WebM.',
);

@Controller('api/admin/uploads')
@UseGuards(SessionGuard)
export class UploadController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequireAnyPermission(['news.create', 'news.update'])
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } }),
  )
  photo(@UploadedFile(imageFile) buffer: Buffer) {
    return this.media.storeImage(buffer);
  }

  @Post('video')
  @UseGuards(PermissionsGuard)
  @RequireAnyPermission(['news.create', 'news.update'])
  @UseInterceptors(
    FileInterceptor('video', { limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 0 } }),
  )
  video(@UploadedFile(videoFile) buffer: Buffer) {
    return this.media.storeVideo(buffer);
  }
}
