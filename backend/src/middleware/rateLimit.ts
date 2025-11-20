import type { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';
import { resolvedRateLimitConfig } from '../env';

interface RateBucket {
  count: number;
  first: number;
}

export interface RateLimitOptions {
  max?: number;
  windowMs?: number;
  blockSeconds?: number;
}

const rateMap = new Map<string, RateBucket>();

function key(ip: string, route: string, token?: string) {
  return `rate_limit:${ip}|${route}|${token || 'anon'}`;
}

function resolveConfig(maxOrOptions?: number | RateLimitOptions) {
  if (typeof maxOrOptions === 'number') {
    return {
      max: maxOrOptions,
      windowMs: resolvedRateLimitConfig.windowMs,
      blockSeconds: resolvedRateLimitConfig.blockSeconds,
    };
  }

  return {
    max: maxOrOptions?.max ?? resolvedRateLimitConfig.max,
    windowMs: maxOrOptions?.windowMs ?? resolvedRateLimitConfig.windowMs,
    blockSeconds: maxOrOptions?.blockSeconds ?? resolvedRateLimitConfig.blockSeconds,
  };
}

export function rateLimit(routeId: string, maxOrOptions?: number | RateLimitOptions) {
  const { max, windowMs, blockSeconds } = resolveConfig(maxOrOptions);

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.ip || (req as any).connection?.remoteAddress || 'unknown').replace(
      '::ffff:',
      ''
    );
    const auth = req.headers['authorization'];
    const tokenPart =
      typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
    const k = key(ip, routeId, tokenPart);
    const now = Date.now();

    // Try Redis first if available
    if (cacheService.isAvailable()) {
      try {
        const windowStart = Math.floor(now / windowMs) * windowMs;
        const windowKey = `${k}:${windowStart}`;

        const ttlSeconds = Math.max(1, Math.ceil(blockSeconds ?? windowMs / 1000));
        const count = await cacheService.increment(windowKey, ttlSeconds);

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
        res.setHeader('X-RateLimit-Reset', new Date(windowStart + windowMs).toISOString());

        if (count > max) {
          logger.warn('Rate limit exceeded (Redis)', {
            ip,
            route: routeId,
            count,
            max,
            windowMs,
          });
          const retryAfterSeconds = Math.ceil((windowStart + windowMs - now) / 1000);
          res.setHeader('Retry-After', retryAfterSeconds);
          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
            retryAfter: retryAfterSeconds,
          });
        }

        return next();
      } catch (error) {
        logger.error('Redis rate limit error, falling back to memory', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Fall through to memory-based rate limiting
      }
    }

    // Fallback to in-memory rate limiting
    let bucket = rateMap.get(k);
    if (!bucket || now - bucket.first > windowMs) {
      bucket = { count: 0, first: now };
      rateMap.set(k, bucket);
    }
    bucket.count++;
    if (bucket.count > max) {
      const retryAfterSeconds = Math.ceil(windowMs / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({ error: 'rate_limited', retryAfter: retryAfterSeconds });
    }
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('X-RateLimit-Reset', new Date(bucket.first + windowMs).toISOString());
    return next();
  };
}

// For tests to reset state if needed
export function _rateLimitReset() {
  rateMap.clear();
}
