import { ArgumentsHost, Catch, HttpException, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent) return;
    if (error instanceof ZodError) {
      response
        .status(400)
        .json({ message: 'راجع البيانات اللي دخلتها.', errors: error.flatten().fieldErrors });
      return;
    }
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const body = error.getResponse();
      response
        .status(status)
        .json(
          status === 413
            ? { message: 'الملف أكبر من الحجم المسموح.' }
            : typeof body === 'string'
              ? { message: body }
              : body,
        );
      return;
    }
    const type = (error as { type?: string } | null)?.type;
    if (type === 'entity.too.large' || type === 'entity.parse.failed') {
      response
        .status(type === 'entity.too.large' ? 413 : 400)
        .json({ message: 'حجم الطلب أو صيغة البيانات غير صالحة.' });
      return;
    }
    response.status(503).json({ message: 'الخدمة مش متاحة دلوقتي. جرّب تاني بعد شوية.' });
  }
}
