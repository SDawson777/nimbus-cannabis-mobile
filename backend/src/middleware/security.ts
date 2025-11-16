import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Security headers middleware for enhanced security
 */
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Strict transport security (HTTPS only)
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy (formerly Feature Policy)
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), accelerometer=()'
    );

    // Don't leak server information
    res.removeHeader('X-Powered-By');

    next();
  };
}

/**
 * Input sanitization middleware to prevent injection attacks
 */
export function sanitizeInput() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize query parameters
      if (req.query) {
        for (const key in req.query) {
          if (typeof req.query[key] === 'string') {
            req.query[key] = sanitizeString(req.query[key] as string);
          }
        }
      }

      // Sanitize body parameters (for form data)
      if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
      }

      next();
    } catch (error) {
      logger.error('Input sanitization error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
      });
      next(); // Continue even if sanitization fails
    }
  };
}

/**
 * Sanitize a string by removing potentially dangerous characters
 */
function sanitizeString(str: string): string {
  if (!str) return str;

  return (
    str
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove potential SQL injection patterns
      .replace(/['";\\]/g, '')
      // Remove script tags and other HTML
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      // Limit length to prevent DoS
      .substring(0, 1000)
  );
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): void {
  if (!obj || typeof obj !== 'object') return;

  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeString(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

/**
 * Request size limiting middleware
 */
export function requestSizeLimit(maxSizeBytes: number = 10 * 1024 * 1024) {
  // 10MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];

    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      logger.warn('Request size limit exceeded', {
        contentLength: parseInt(contentLength),
        maxSize: maxSizeBytes,
        path: req.path,
        ip: req.ip,
      });

      return res.status(413).json({
        error: 'Payload Too Large',
        message: `Request size exceeds ${Math.round(maxSizeBytes / 1024 / 1024)}MB limit`,
      });
    }

    next();
  };
}

/**
 * Suspicious activity detection middleware
 */
export function suspiciousActivityDetection() {
  const suspiciousPatterns = [
    // SQL injection patterns - more specific
    /(\b(select|insert|update|delete|drop|union|exec|execute)\s+.*\bfrom\b)/i,
    // XSS patterns - more specific
    /<script[^>]*>|javascript:|onload\s*=|onerror\s*=/i,
    // Path traversal
    /\.\.[/\\]/,
    // Command injection - exclude JSON context
    /[;&|`]\s*[a-zA-Z]/,
  ];

  return (req: Request, res: Response, next: NextFunction) => {
    // Only check URL and query params, not JSON body content
    const checkString = `${req.url} ${req.query ? Object.values(req.query).join(' ') : ''}`;

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(checkString)) {
        logger.warn('Suspicious activity detected', {
          pattern: pattern.toString(),
          url: req.url,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          method: req.method,
        });

        return res.status(400).json({
          error: 'Bad Request',
          message: 'Request contains potentially malicious content',
        });
      }
    }

    next();
  };
}

/**
 * API key validation middleware
 */
export function validateApiKey(validKeys?: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if no API keys are configured
    if (!validKeys || validKeys.length === 0) {
      return next();
    }

    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required',
      });
    }

    if (!validKeys.includes(apiKey)) {
      logger.warn('Invalid API key attempt', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
      });

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key',
      });
    }

    next();
  };
}

/**
 * CORS security enhancement
 */
export function enhancedCors(allowedOrigins: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      logger.warn('CORS violation attempt', {
        origin,
        ip: req.ip,
        path: req.path,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Origin not allowed',
      });
    }

    next();
  };
}

/**
 * Request logging for security analysis
 */
export function securityLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log potentially sensitive endpoints
    const sensitiveEndpoints = ['/auth/', '/admin/', '/api/v1/orders', '/api/v1/profile'];

    if (sensitiveEndpoints.some(endpoint => req.path.includes(endpoint))) {
      logger.info('Sensitive endpoint access', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
}
