// Performance optimization middleware and utilities
// Adds caching, query optimization, and performance monitoring

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

// Redis cache client (initialize in your app)
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
} as any);

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  PRODUCTS: 3600, // 1 hour
  STORES: 86400, // 24 hours
  USER_PROFILE: 1800, // 30 minutes
  STORE_PRODUCTS: 3600, // 1 hour
  BRANDS: 86400, // 24 hours
} as const;

/**
 * Redis caching middleware
 * Caches GET requests based on URL and query parameters
 */
export function cacheMiddleware(ttl: number = 300) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key from URL and query params
    const cacheKey = `cache:${req.originalUrl}`;

    try {
      // Check if cached data exists
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        // Return cached data with cache headers
        res.set({
          'X-Cache': 'HIT',
          'Cache-Control': `public, max-age=${ttl}`,
        });
        return res.json(JSON.parse(cachedData));
      }

      // Store original res.json to intercept response
      const originalJson = res.json;
      res.json = function (data: any) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.setex(cacheKey, ttl, JSON.stringify(data)).catch(console.error);
        }

        // Set cache headers
        res.set({
          'X-Cache': 'MISS',
          'Cache-Control': `public, max-age=${ttl}`,
        });

        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on Redis errors
      next();
    }
  };
}

/**
 * Performance monitoring middleware
 * Tracks response times and slow queries
 */
export function performanceMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    // Track request start
    (req as any).performanceStart = startTime;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const memoryUsage = process.memoryUsage();
      const memoryDelta = memoryUsage.heapUsed - startMemory.heapUsed;

      // Log slow requests (> 1 second)
      if (duration > 1000) {
        console.warn('Slow request detected:', {
          method: req.method,
          url: req.originalUrl,
          duration: `${duration}ms`,
          status: res.statusCode,
          memoryDelta: `${Math.round(memoryDelta / 1024)}KB`,
        });
      }

      // Add performance headers
      res.set({
        'X-Response-Time': `${duration}ms`,
        'X-Memory-Usage': `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      });
    });

    next();
  };
}

/**
 * Cache invalidation utilities
 */
export class CacheManager {
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(`cache:*${pattern}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`Invalidated ${keys.length} cache entries for pattern: ${pattern}`);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  static async invalidateStore(storeId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`/stores/${storeId}`),
      this.invalidatePattern('/stores?'),
      this.invalidatePattern('/products?'),
    ]);
  }

  static async invalidateProduct(productId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`/products/${productId}`),
      this.invalidatePattern('/products?'),
    ]);
  }

  static async invalidateUser(_userId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`/profile`),
      this.invalidatePattern(`/orders`),
      this.invalidatePattern(`/cart`),
    ]);
  }
}

/**
 * Database query optimization utilities
 */
export class QueryOptimizer {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Optimized product query with includes and pagination
   */
  async getProducts(options: {
    page?: number;
    limit?: number;
    category?: string;
    storeId?: string;
    search?: string;
  }) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 50); // Max 50 items per page
    const skip = (page - 1) * limit;

    const where: any = {};

    if (options.category) {
      where.category = options.category;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
        { brand: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options.storeId) {
      where.stores = {
        some: { storeId: options.storeId },
      };
    }

    // Use Promise.all for parallel queries
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          stores: {
            where: options.storeId ? { storeId: options.storeId } : {},
            select: {
              price: true,
              stock: true,
              active: true,
              store: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: { reviews: true },
          },
        },
        orderBy: [
          { purchasesLast30d: 'desc' }, // Popular items first
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Optimized store query with distance calculation
   */
  async getStoresNearby(options: {
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    limit?: number;
  }) {
    const limit = Math.min(options.limit || 10, 20);

    if (options.latitude && options.longitude) {
      // Use raw SQL for distance calculation (more efficient)
      const stores = await this.prisma.$queryRaw`
        SELECT 
          s.*,
          (
            6371 * acos(
              cos(radians(${options.latitude})) * cos(radians(s.latitude::float8)) * 
              cos(radians(s.longitude::float8) - radians(${options.longitude})) + 
              sin(radians(${options.latitude})) * sin(radians(s.latitude::float8))
            )
          ) AS distance
        FROM "Store" s
        WHERE s."isActive" = true
        AND s.latitude IS NOT NULL 
        AND s.longitude IS NOT NULL
        HAVING distance <= ${options.radiusKm || 50}
        ORDER BY distance
        LIMIT ${limit}
      `;

      return stores;
    }

    // Fallback to regular query
    return this.prisma.store.findMany({
      where: { isActive: true },
      include: {
        brand: {
          select: {
            name: true,
            primaryColor: true,
            logoUrl: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
      take: limit,
    });
  }

  /**
   * Optimized order history query
   */
  async getUserOrders(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              address1: true,
              city: true,
              state: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  defaultPrice: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

/**
 * Response compression middleware
 */
export function compressionMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set compression headers for JSON responses
    const originalJson = res.json;
    res.json = function (data: any) {
      // Only compress large responses (> 1KB)
      const jsonString = JSON.stringify(data);
      if (jsonString.length > 1024) {
        res.set('Content-Encoding', 'gzip');
      }
      return originalJson.call(this, data);
    };
    next();
  };
}

/**
 * Database connection pooling optimization
 */
export function optimizePrismaConnections() {
  return {
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pool settings
    connectionLimit: parseInt(process.env.DB_CONNECTION_POOL_MAX || '20'),
    // Query timeout
    transactionOptions: {
      timeout: 5000, // 5 seconds
    },
  };
}

/**
 * Memory usage monitoring
 */
export function memoryMonitor() {
  setInterval(() => {
    const usage = process.memoryUsage();
    const usageMB = {
      rss: Math.round(usage.rss / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
    };

    // Log warning if memory usage is high
    if (usageMB.heapUsed > 500) {
      // > 500MB
      console.warn('High memory usage detected:', usageMB);
    }
  }, 30000); // Check every 30 seconds
}

export default {
  cacheMiddleware,
  performanceMiddleware,
  CacheManager,
  QueryOptimizer,
  compressionMiddleware,
  optimizePrismaConnections,
  memoryMonitor,
};
