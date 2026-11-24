import { BadRequestException, type PipeTransform } from '@nestjs/common';

export class UploadFilePipe implements PipeTransform<Express.Multer.File | undefined, Buffer> {
  constructor(
    private readonly allowedTypes: string[],
    private readonly message: string,
  ) {}

  transform(file?: Express.Multer.File) {
    if (!file || !this.allowedTypes.includes(file.mimetype))
      throw new BadRequestException(this.message);
    return file.buffer;
  }
}
