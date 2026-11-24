import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { fileURLToPath } from 'node:url';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe.js';
import { screenKey } from '../screens/screens.dto.js';

export const publicDirectory = fileURLToPath(new URL('../../../public/', import.meta.url));

@Controller()
export class PagesController {
  @Get()
  home(@Res() response: Response) {
    response.redirect('/admin');
  }

  @Get('admin')
  admin(@Res() response: Response) {
    response.sendFile('admin.html', { root: publicDirectory, cacheControl: false });
  }

  @Get('screen/:key')
  screen(@Param('key', new ZodValidationPipe(screenKey)) _key: string, @Res() response: Response) {
    response.sendFile('screen.html', { root: publicDirectory, cacheControl: false });
  }
}
