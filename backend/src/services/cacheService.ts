import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class CacheService {
  private redis: Redis | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      logger.info('Redis not configured - cache service disabled');
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        reconnectOnError: err => {
          const targetErrors = ['READONLY', 'ECONNRESET'];
          return targetErrors.some(targetError => err.message.includes(targetError));
        },
      });

      this.redis.on('connect', () => {
        this.isEnabled = true;
        logger.info('Redis cache service connected');
      });

      this.redis.on('error', error => {
        this.isEnabled = false;
        logger.error('Redis connection error', { error: error.message });
      });

      this.redis.on('close', () => {
        this.isEnabled = false;
        logger.warn('Redis connection closed');
      });
    } catch (error) {
      logger.error('Failed to initialize Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.redis) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttlSeconds, serialized);
      return true;
    } catch (error) {
      logger.error('Cache set error', {
        key,
        ttl: ttlSeconds,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.isEnabled || !this.redis) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      return await this.redis.del(...keys);
    } catch (error) {
      logger.error('Cache delete pattern error', {
        pattern,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isEnabled && this.redis !== null;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    memoryUsage?: string;
    keyCount?: number;
    uptime?: number;
  }> {
    if (!this.redis) {
      return { connected: false };
    }

    try {
      const info = await this.redis.info('memory');
      const dbSize = await this.redis.dbsize();
      const uptime = await this.redis.info('server');

      const memoryUsage = info.match(/used_memory_human:(.+)/)?.[1]?.trim();
      const uptimeMatch = uptime.match(/uptime_in_seconds:(\d+)/);

      return {
        connected: this.isEnabled,
        memoryUsage,
        keyCount: dbSize,
        uptime: uptimeMatch ? parseInt(uptimeMatch[1]) : undefined,
      };
    } catch (error) {
      logger.error('Cache stats error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { connected: false };
    }
  }

  /**
   * Cache-aside pattern helper - get from cache or execute function and cache result
   */
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fetchFn();
    await this.set(key, result, ttlSeconds);
    return result;
  }

  /**
   * Increment a counter with TTL
   */
  async increment(key: string, ttlSeconds: number = 3600): Promise<number> {
    if (!this.isEnabled || !this.redis) {
      return 0;
    }

    try {
      const pipeline = this.redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, ttlSeconds);
      const results = await pipeline.exec();

      if (results && results[0] && results[0][1]) {
        return results[0][1] as number;
      }
      return 0;
    } catch (error) {
      logger.error('Cache increment error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValues: Record<string, any>, ttlSeconds: number = 300): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      const pipeline = this.redis.pipeline();

      Object.entries(keyValues).forEach(([key, value]) => {
        const serialized = JSON.stringify(value);
        pipeline.setex(key, ttlSeconds, serialized);
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Cache mset error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
    if (!this.redis) {
      return { status: 'unhealthy' };
    }

    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return {
        status: this.isEnabled ? 'healthy' : 'unhealthy',
        latency,
      };
    } catch (_error) {
      return { status: 'unhealthy' };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.isEnabled = false;
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Cache key builders for consistent naming
export const CacheKeys = {
  product: (id: string) => `product:${id}`,
  productPrice: (id: string) => `product_price:${id}`,
  variantPrice: (id: string) => `variant_price:${id}`,
  userSession: (userId: string) => `user_session:${userId}`,
  storeProducts: (storeId: string) => `store_products:${storeId}`,
  recommendations: (userId: string) => `recommendations:${userId}`,
  weatherRecommendations: (condition: string, city: string, state: string) =>
    `weather_rec:${condition}:${city}:${state}`,
  complianceRules: (stateCode: string) => `compliance:${stateCode}`,
  rateLimit: (userId: string, endpoint: string) => `rate_limit:${userId}:${endpoint}`,
  recommendationsForYou: (storeId: string | undefined, limit: number) =>
    `recs:for_you:${storeId || 'all'}:${limit}`,
  recommendationsRelated: (productId: string, limit: number) =>
    `recs:related:${productId}:${limit}`,
  weatherCondition: (latBucket: string, lonBucket: string) =>
    `weather:condition:${latBucket}:${lonBucket}`,
  storesList: (hash: string) => `stores:list:${hash}`,
  pushTokenBackoff: (userId: string) => `push:backoff:${userId}`,
  pushTokenFailures: (userId: string) => `push:failures:${userId}`,
  conciergeDegraded: () => 'concierge:degraded',
} as const;
