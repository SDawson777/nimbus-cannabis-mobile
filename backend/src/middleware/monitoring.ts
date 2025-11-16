import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: HealthStatus;
    redis: HealthStatus;
    memory: HealthStatus;
  };
  version?: string;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  details?: string;
}

export class HealthCheckManager {
  private prisma: PrismaClient;
  private redis: Redis;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
  }

  async checkDatabase(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: `Connected to database (${responseTime}ms)`,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async checkRedis(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      await this.redis.ping();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: `Redis connection healthy (${responseTime}ms)`,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  checkMemoryUsage(): HealthStatus {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const usagePercent = Math.round((heapUsedMB / heapTotalMB) * 100);

    // Consider memory unhealthy if using more than 90% of available heap
    const isHealthy = usagePercent < 90;

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`,
    };
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const [database, redis, memory] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      Promise.resolve(this.checkMemoryUsage()),
    ]);

    const allHealthy =
      database.status === 'healthy' && redis.status === 'healthy' && memory.status === 'healthy';

    const anyUnhealthy =
      database.status === 'unhealthy' ||
      redis.status === 'unhealthy' ||
      memory.status === 'unhealthy';

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    if (allHealthy) {
      overallStatus = 'healthy';
    } else if (anyUnhealthy) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      services: {
        database,
        redis,
        memory,
      },
      version: process.env.npm_package_version,
    };
  }
}

export class RequestLogger {
  static logRequest(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, url, ip, headers } = req;

    // Log request start
    logger.info('Request started', {
      method,
      url,
      ip,
      userAgent: headers['user-agent'],
      requestId: req.headers['x-request-id'] || 'unknown',
      timestamp: new Date().toISOString(),
    });

    // Capture response details
    const originalSend = res.send;
    res.send = function (body) {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      // Log request completion
      logger.info('Request completed', {
        method,
        url,
        ip,
        statusCode,
        duration,
        requestId: req.headers['x-request-id'] || 'unknown',
        timestamp: new Date().toISOString(),
        responseSize: Buffer.byteLength(body || '', 'utf8'),
      });

      // Log errors for 4xx and 5xx responses
      if (statusCode >= 400) {
        logger.error('Request failed', {
          method,
          url,
          ip,
          statusCode,
          duration,
          error: body,
          requestId: req.headers['x-request-id'] || 'unknown',
        });
      }

      return originalSend.call(this, body);
    };

    next();
  }
}

export class ErrorMonitor {
  static handleError(error: Error, req: Request, res: Response, _next: NextFunction): void {
    const { method, url, ip, headers } = req;
    const requestId = headers['x-request-id'] || 'unknown';

    // Log the error with full context
    logger.error('Unhandled error', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      request: {
        method,
        url,
        ip,
        userAgent: headers['user-agent'],
        requestId,
        body: req.body,
        params: req.params,
        query: req.query,
      },
      timestamp: new Date().toISOString(),
    });

    // Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === 'production';
    const errorResponse = {
      error: 'Internal server error',
      requestId,
      timestamp: new Date().toISOString(),
      ...(isProduction ? {} : { details: error.message, stack: error.stack }),
    };

    res.status(500).json(errorResponse);
  }

  static handle404(req: Request, res: Response): void {
    const { method, url, ip } = req;
    const requestId = req.headers['x-request-id'] || 'unknown';

    logger.warn('Route not found', {
      method,
      url,
      ip,
      requestId,
      timestamp: new Date().toISOString(),
    });

    res.status(404).json({
      error: 'Route not found',
      path: url,
      method,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}

export class MetricsCollector {
  private static requestCounts = new Map<string, number>();
  private static responseTimes: number[] = [];
  private static errorCounts = new Map<number, number>();

  static recordRequest(method: string, path: string, statusCode: number, duration: number): void {
    // Count requests by endpoint
    const endpoint = `${method} ${path}`;
    this.requestCounts.set(endpoint, (this.requestCounts.get(endpoint) || 0) + 1);

    // Track response times (keep last 1000 for memory efficiency)
    this.responseTimes.push(duration);
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    // Count errors by status code
    if (statusCode >= 400) {
      this.errorCounts.set(statusCode, (this.errorCounts.get(statusCode) || 0) + 1);
    }
  }

  static getMetrics(): {
    requestCounts: Record<string, number>;
    averageResponseTime: number;
    errorCounts: Record<number, number>;
    totalRequests: number;
  } {
    const totalRequests = Array.from(this.requestCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const averageResponseTime =
      this.responseTimes.length > 0
        ? Math.round(
            this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
          )
        : 0;

    return {
      requestCounts: Object.fromEntries(this.requestCounts),
      averageResponseTime,
      errorCounts: Object.fromEntries(this.errorCounts),
      totalRequests,
    };
  }

  static resetMetrics(): void {
    this.requestCounts.clear();
    this.responseTimes.length = 0;
    this.errorCounts.clear();
  }
}

// Middleware to collect metrics
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    MetricsCollector.recordRequest(
      req.method,
      req.route?.path || req.path,
      res.statusCode,
      duration
    );
  });

  next();
}
