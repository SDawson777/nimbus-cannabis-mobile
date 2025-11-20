import type { NextFunction, Request, Response } from 'express';
import type { AnyZodObject, ZodError, ZodTypeAny } from 'zod';
import { logger } from '../utils/logger';

export type RequestSegment = 'body' | 'query' | 'params';

export interface ValidationOptions {
  target?: RequestSegment;
  statusCode?: number;
  onError?: (error: ZodError) => { status?: number; body?: Record<string, any> } | void;
}

export function validateRequest(
  schema: AnyZodObject | ZodTypeAny,
  options: ValidationOptions = {}
) {
  const target = options.target ?? 'body';
  const statusCode = options.statusCode ?? 400;

  return (req: Request, res: Response, next: NextFunction) => {
    const value = (req as any)[target];
    const result = schema.safeParse(value);

    if (!result.success) {
      const [firstIssue] = result.error.issues;
      logger.warn('validation.failed', {
        path: firstIssue?.path?.join('.') ?? 'unknown',
        message: firstIssue?.message,
        target,
        method: req.method,
        url: req.originalUrl,
      });

      if (options.onError) {
        const custom = options.onError(result.error);
        if (custom && custom.body) {
          return res.status(custom.status ?? statusCode).json(custom.body);
        }
      }

      return res.status(statusCode).json({
        error: 'validation_error',
        message: firstIssue?.message ?? 'Invalid request payload',
        details: result.error.flatten(),
      });
    }

    (req as any)[target] = result.data;
    return next();
  };
}
