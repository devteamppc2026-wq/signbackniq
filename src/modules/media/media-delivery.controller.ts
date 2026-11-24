import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { pipeline } from 'node:stream/promises';
import { MediaService } from './media.service.js';

@Controller('uploads/cloud')
export class MediaDeliveryController {
  constructor(private readonly media: MediaService) {}

  @Get(':filename')
  async download(
    @Param('filename') filename: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const abort = new AbortController();
    const cancel = () => abort.abort();
    response.once('close', cancel);
    try {
      const asset = await this.media.openAsset(
        filename,
        request.method,
        request.get('range'),
        abort.signal,
      );
      if (!asset) {
        response.sendStatus(404);
        return;
      }
      const { upstream, type, ranged } = asset;
      if (upstream.status === 416 && ranged) {
        await upstream.body?.cancel();
        const contentRange = upstream.headers.get('content-range');
        if (contentRange) response.setHeader('Content-Range', contentRange);
        response.status(416).end();
        return;
      }
      if (upstream.status === 404) {
        await upstream.body?.cancel();
        response.sendStatus(404);
        return;
      }
      const contentType = upstream.headers.get('content-type')?.split(';')[0];
      const encoding = upstream.headers.get('content-encoding');
      if (
        ![200, 206].includes(upstream.status) ||
        contentType !== type ||
        (encoding && encoding !== 'identity')
      ) {
        await upstream.body?.cancel();
        response.sendStatus(502);
        return;
      }
      response.status(upstream.status);
      response.setHeader('Content-Type', type);
      response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      for (const name of ['content-length', 'content-range', 'accept-ranges']) {
        const value = upstream.headers.get(name);
        if (value) response.setHeader(name, value);
      }
      if (request.method === 'HEAD' || !upstream.body) response.end();
      else await pipeline(upstream.body, response);
    } catch (error) {
      if (!abort.signal.aborted) {
        if (response.headersSent) response.destroy();
        else throw error;
      }
    } finally {
      response.off('close', cancel);
    }
  }
}
