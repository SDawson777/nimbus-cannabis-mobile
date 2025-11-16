interface LogContext {
  [k: string]: any;
}
type LogFn = (msg: string, ctx?: LogContext) => void;

// Simple sampling for noisy log categories in production
const samplingRates: Record<string, number> = {
  'req.start': 0.1, // Only log 10% of request starts
  'req.complete': 0.1, // Only log 10% of successful completions
  'analytics.event': 0.05, // Very low sampling for analytics
  '[analytics] event tracked': 0.05, // Also catch the formatted message
  'readiness.db_fail': 1.0, // Always log readiness failures
  'req.slow': 1.0, // Always log slow requests
};

function shouldSample(msg: string): boolean {
  // In test or debug mode, never sample
  if (process.env.NODE_ENV === 'test' || process.env.DEBUG === 'true') return true;

  // Check for exact matches or partial matches
  for (const [pattern, rate] of Object.entries(samplingRates)) {
    if (msg === pattern || msg.includes(pattern)) {
      return Math.random() <= rate;
    }
  }

  return true; // Default: log everything not explicitly sampled
}

function fmt(msg: string, ctx?: LogContext) {
  if (!ctx || Object.keys(ctx).length === 0) return msg;
  // Attach serialized context at end for simple parsing
  return `${msg} ${JSON.stringify(ctx)}`;
}

function baseLogger(baseCtx?: LogContext) {
  const buildCtx = (ctx?: LogContext) => ({ ...(baseCtx || {}), ...(ctx || {}) });
  const l: any = {
    debug: (msg: string, ctx?: LogContext) => {
      if (process.env.DEBUG === 'true' && shouldSample(msg)) {
        console.debug(fmt(msg, buildCtx(ctx)));
      }
    },
    info: (msg: string, ctx?: LogContext) => {
      if (shouldSample(msg)) console.info(fmt(msg, buildCtx(ctx)));
    },
    warn: (msg: string, ctx?: LogContext) => {
      if (shouldSample(msg)) console.warn(fmt(msg, buildCtx(ctx)));
    },
    error: (msg: string, ctx?: LogContext) => {
      // Always log errors regardless of sampling
      console.error(fmt(msg, buildCtx(ctx)));
    },
    child: (ctx: LogContext) => baseLogger(buildCtx(ctx)),
  };
  return l as {
    debug: LogFn;
    info: LogFn;
    warn: LogFn;
    error: LogFn;
    child: (c: LogContext) => any;
  };
}

export const logger = baseLogger();

// Enhanced structured logging utilities
export class StructuredLogger {
  static logUserAction(userId: string, action: string, details?: Record<string, any>): void {
    logger.info('User action', {
      userId,
      action,
      details,
      category: 'user_action',
      timestamp: new Date().toISOString(),
    });
  }

  static logBusinessEvent(event: string, data: Record<string, any>): void {
    logger.info('Business event', {
      event,
      data,
      category: 'business_event',
      timestamp: new Date().toISOString(),
    });
  }

  static logSecurityEvent(
    event: string,
    userId?: string,
    ip?: string,
    details?: Record<string, any>
  ): void {
    logger.warn('Security event', {
      event,
      userId,
      ip,
      details,
      category: 'security_event',
      timestamp: new Date().toISOString(),
    });
  }

  static logPerformanceMetric(
    metric: string,
    value: number,
    unit: string,
    details?: Record<string, any>
  ): void {
    logger.info('Performance metric', {
      metric,
      value,
      unit,
      details,
      category: 'performance_metric',
      timestamp: new Date().toISOString(),
    });
  }

  static logAPICall(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    userId?: string
  ): void {
    logger.info('API call', {
      method,
      endpoint,
      statusCode,
      duration,
      userId,
      category: 'api_call',
      timestamp: new Date().toISOString(),
    });
  }

  static logError(error: Error, context?: Record<string, any>): void {
    logger.error('Application error', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context,
      category: 'application_error',
      timestamp: new Date().toISOString(),
    });
  }

  static logDatabaseQuery(query: string, duration: number, rowCount?: number): void {
    logger.debug('Database query', {
      query,
      duration,
      rowCount,
      category: 'database_query',
      timestamp: new Date().toISOString(),
    });
  }

  static logCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'delete',
    key: string,
    duration?: number
  ): void {
    logger.debug('Cache operation', {
      operation,
      key,
      duration,
      category: 'cache_operation',
      timestamp: new Date().toISOString(),
    });
  }
}

// Application lifecycle logging
export function logAppStart(port: number): void {
  logger.info('Application started', {
    port,
    nodeEnv: process.env.NODE_ENV,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
    category: 'application_lifecycle',
  });
}

export function logAppShutdown(signal?: string): void {
  logger.info('Application shutting down', {
    signal,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    category: 'application_lifecycle',
  });
}
