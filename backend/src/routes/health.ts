import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { HealthCheckManager, MetricsCollector } from '../middleware/monitoring';
import { logger, StructuredLogger } from '../utils/logger';

interface HealthRouterDeps {
  prisma: PrismaClient;
  redis: Redis;
}

export function createHealthRoutes({ prisma, redis }: HealthRouterDeps): Router {
  const router = Router();
  const healthChecker = new HealthCheckManager(prisma, redis);

  // Basic health check endpoint
  router.get('/health', async (req, res) => {
    try {
      const healthResult = await healthChecker.performHealthCheck();

      // Log health check result for monitoring
      StructuredLogger.logPerformanceMetric(
        'health_check_status',
        healthResult.status === 'healthy' ? 1 : 0,
        'boolean',
        {
          status: healthResult.status,
          services: healthResult.services,
          uptime: healthResult.uptime,
        }
      );

      const statusCode =
        healthResult.status === 'healthy' ? 200 : healthResult.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(healthResult);
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  });

  // Readiness probe for Kubernetes/Docker
  router.get('/ready', async (req, res) => {
    try {
      const [dbHealth, redisHealth] = await Promise.all([
        healthChecker.checkDatabase(),
        healthChecker.checkRedis(),
      ]);

      const isReady = dbHealth.status === 'healthy' && redisHealth.status === 'healthy';

      if (isReady) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
          services: { database: dbHealth, redis: redisHealth },
        });
      } else {
        res.status(503).json({
          status: 'not-ready',
          timestamp: new Date().toISOString(),
          services: { database: dbHealth, redis: redisHealth },
        });
      }
    } catch (error) {
      logger.error('Readiness check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(503).json({
        status: 'not-ready',
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
      });
    }
  });

  // Liveness probe for Kubernetes/Docker
  router.get('/live', (req, res) => {
    // Simple liveness check - just confirm the process is running
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      pid: process.pid,
    });
  });

  // Detailed health check with extended information
  router.get('/health/detailed', async (req, res) => {
    try {
      const healthResult = await healthChecker.performHealthCheck();
      const metrics = MetricsCollector.getMetrics();

      const detailedHealth = {
        ...healthResult,
        metrics: {
          requestCounts: metrics.requestCounts,
          averageResponseTime: metrics.averageResponseTime,
          errorCounts: metrics.errorCounts,
          totalRequests: metrics.totalRequests,
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          architecture: process.arch,
          cpuUsage: process.cpuUsage(),
          memoryUsage: process.memoryUsage(),
          loadAverage: process.platform !== 'win32' ? require('os').loadavg() : null,
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const statusCode =
        healthResult.status === 'healthy' ? 200 : healthResult.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(detailedHealth);
    } catch (error) {
      logger.error('Detailed health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Detailed health check failed',
      });
    }
  });

  // Metrics endpoint for monitoring systems
  router.get('/metrics', (req, res) => {
    try {
      const metrics = MetricsCollector.getMetrics();
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const metricsData = {
        application: {
          uptime: Math.floor(process.uptime()),
          totalRequests: metrics.totalRequests,
          averageResponseTime: metrics.averageResponseTime,
          requestsByEndpoint: metrics.requestCounts,
          errorsByStatusCode: metrics.errorCounts,
        },
        system: {
          memoryUsage: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memUsage.external / 1024 / 1024), // MB
            rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          },
          cpuUsage: {
            user: cpuUsage.user,
            system: cpuUsage.system,
          },
        },
        timestamp: new Date().toISOString(),
      };

      res.json(metricsData);
    } catch (error) {
      logger.error('Metrics collection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        error: 'Metrics collection failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Reset metrics (useful for testing or maintenance)
  router.post('/metrics/reset', (req, res) => {
    try {
      MetricsCollector.resetMetrics();

      StructuredLogger.logBusinessEvent('metrics_reset', {
        requestedBy: req.ip,
        timestamp: new Date().toISOString(),
      });

      res.json({
        message: 'Metrics reset successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Metrics reset failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        error: 'Metrics reset failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
