import { Express } from 'express';
import { logger, StructuredLogger, logAppStart, logAppShutdown } from '../utils/logger';
import { RequestLogger, ErrorMonitor, metricsMiddleware } from './monitoring';

export interface MonitoringConfig {
  enableRequestLogging: boolean;
  enableMetricsCollection: boolean;
  enableErrorTracking: boolean;
  enableGracefulShutdown: boolean;
}

export class ApplicationMonitoring {
  private app: Express;
  private config: MonitoringConfig;

  constructor(app: Express, config: Partial<MonitoringConfig> = {}) {
    this.app = app;
    this.config = {
      enableRequestLogging: true,
      enableMetricsCollection: true,
      enableErrorTracking: true,
      enableGracefulShutdown: true,
      ...config,
    };
  }

  setupMonitoring(): void {
    // Request ID middleware (should be first)
    this.app.use((req, res, next) => {
      req.headers['x-request-id'] =
        req.headers['x-request-id'] ||
        `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      next();
    });

    // Request logging middleware
    if (this.config.enableRequestLogging) {
      this.app.use(RequestLogger.logRequest);
    }

    // Metrics collection middleware
    if (this.config.enableMetricsCollection) {
      this.app.use(metricsMiddleware);
    }

    // Error handling middleware (should be last)
    if (this.config.enableErrorTracking) {
      this.setupErrorHandling();
    }

    // Graceful shutdown handling
    if (this.config.enableGracefulShutdown) {
      this.setupGracefulShutdown();
    }

    logger.info('Application monitoring initialized', {
      config: this.config,
      timestamp: new Date().toISOString(),
    });
  }

  private setupErrorHandling(): void {
    // Handle 404 errors
    this.app.use('*', ErrorMonitor.handle404);

    // Handle all other errors
    this.app.use(ErrorMonitor.handleError);

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection', {
        reason:
          reason instanceof Error
            ? {
                message: reason.message,
                stack: reason.stack,
              }
            : reason,
        promise: promise.toString(),
        timestamp: new Date().toISOString(),
      });

      // In production, you might want to exit the process
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', error => {
      logger.error('Uncaught Exception', {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        timestamp: new Date().toISOString(),
      });

      // Exit the process as the application state is unreliable
      process.exit(1);
    });

    logger.info('Error handling configured');
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string) => {
      return () => {
        logAppShutdown(signal);

        logger.info(`Received ${signal}. Shutting down gracefully...`);

        // Close the HTTP server
        const server = (this.app as any).server;
        if (server) {
          server.close((err?: Error) => {
            if (err) {
              logger.error('Error during server shutdown', {
                error: err.message,
                signal,
              });
              process.exit(1);
            }

            logger.info('HTTP server closed');
            process.exit(0);
          });

          // Force exit if graceful shutdown takes too long (30 seconds)
          setTimeout(() => {
            logger.error('Graceful shutdown timeout exceeded, forcing exit');
            process.exit(1);
          }, 30000);
        } else {
          process.exit(0);
        }
      };
    };

    // Listen for termination signals
    process.on('SIGTERM', gracefulShutdown('SIGTERM'));
    process.on('SIGINT', gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', gracefulShutdown('SIGUSR2')); // nodemon restart

    logger.info('Graceful shutdown handlers configured');
  }

  // Method to start application with monitoring
  startServer(port: number): any {
    const server = this.app.listen(port, () => {
      logAppStart(port);
    });

    // Store server reference for graceful shutdown
    (this.app as any).server = server;

    // Handle server errors
    server.on('error', (error: Error & { code?: string; syscall?: string }) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    return server;
  }
}

// Security monitoring utilities
export class SecurityMonitoring {
  static logFailedLogin(email: string, ip: string, reason: string): void {
    StructuredLogger.logSecurityEvent('failed_login', undefined, ip, {
      email,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  static logSuspiciousActivity(
    userId: string,
    activity: string,
    ip: string,
    details?: Record<string, any>
  ): void {
    StructuredLogger.logSecurityEvent('suspicious_activity', userId, ip, {
      activity,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  static logPasswordReset(email: string, ip: string, success: boolean): void {
    StructuredLogger.logSecurityEvent('password_reset', undefined, ip, {
      email,
      success,
      timestamp: new Date().toISOString(),
    });
  }

  static logTokenValidation(userId: string, tokenType: string, valid: boolean, ip: string): void {
    StructuredLogger.logSecurityEvent('token_validation', userId, ip, {
      tokenType,
      valid,
      timestamp: new Date().toISOString(),
    });
  }

  static logPermissionDenied(userId: string, resource: string, action: string, ip: string): void {
    StructuredLogger.logSecurityEvent('permission_denied', userId, ip, {
      resource,
      action,
      timestamp: new Date().toISOString(),
    });
  }
}

// Performance monitoring utilities
export class PerformanceMonitoring {
  static trackDatabaseQuery(query: string, startTime: number, rowCount?: number): void {
    const duration = Date.now() - startTime;
    StructuredLogger.logPerformanceMetric('database_query_duration', duration, 'ms', {
      query: query.substring(0, 100), // Truncate long queries
      rowCount,
    });

    // Alert on slow queries (>1000ms)
    if (duration > 1000) {
      logger.warn('Slow database query detected', {
        query: query.substring(0, 100),
        duration,
        rowCount,
      });
    }
  }

  static trackAPIResponse(
    endpoint: string,
    method: string,
    startTime: number,
    statusCode: number
  ): void {
    const duration = Date.now() - startTime;
    StructuredLogger.logPerformanceMetric('api_response_time', duration, 'ms', {
      endpoint,
      method,
      statusCode,
    });

    // Alert on slow API responses (>5000ms)
    if (duration > 5000) {
      logger.warn('Slow API response detected', {
        endpoint,
        method,
        duration,
        statusCode,
      });
    }
  }

  static trackCacheHitRate(operation: string, hit: boolean): void {
    StructuredLogger.logPerformanceMetric('cache_hit_rate', hit ? 1 : 0, 'boolean', {
      operation,
    });
  }
}
