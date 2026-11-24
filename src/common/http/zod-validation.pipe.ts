import type { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

export class ZodValidationPipe<Value> implements PipeTransform<unknown, Value> {
  constructor(private readonly schema: ZodType<Value>) {}

  transform(value: unknown): Value {
    return this.schema.parse(value);
  }
}
