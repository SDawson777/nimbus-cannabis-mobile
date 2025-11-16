import request from 'supertest';
import express from 'express';
import {
  securityHeaders,
  sanitizeInput,
  requestSizeLimit,
  suspiciousActivityDetection,
  validateApiKey,
  enhancedCors,
  securityLogger,
} from '../../middleware/security';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Security Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    jest.clearAllMocks();
  });

  describe('securityHeaders middleware', () => {
    it('should add security headers to responses', async () => {
      app.use(securityHeaders());
      app.get('/test', (req, res) => res.json({ test: 'ok' }));

      const response = await request(app).get('/test');

      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['permissions-policy']).toContain('geolocation=()');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should add HSTS header for HTTPS requests', async () => {
      app.use(securityHeaders());
      app.get('/test', (req, res) => res.json({ test: 'ok' }));

      const response = await request(app).get('/test').set('x-forwarded-proto', 'https');

      expect(response.headers['strict-transport-security']).toBe(
        'max-age=31536000; includeSubDomains; preload'
      );
    });
  });

  describe('sanitizeInput middleware', () => {
    beforeEach(() => {
      app.use(express.json());
      app.use(sanitizeInput());
    });

    it('should sanitize query parameters', async () => {
      app.get('/test', (req, res) => {
        res.json({ query: req.query });
      });

      const response = await request(app).get(
        '/test?name=<script>alert("xss")</script>&email=test@example.com'
      );

      expect(response.body.query.name).not.toContain('<script>');
      expect(response.body.query.email).toBe('test@example.com');
    });

    it('should sanitize request body', async () => {
      app.post('/test', (req, res) => {
        res.json({ body: req.body });
      });

      const response = await request(app).post('/test').send({
        comment: '<script>alert("xss")</script>',
        name: 'John Doe',
      });

      expect(response.body.body.comment).not.toContain('<script>');
      expect(response.body.body.name).toBe('John Doe');
    });

    it('should handle nested objects', async () => {
      app.post('/test', (req, res) => {
        res.json({ body: req.body });
      });

      const response = await request(app)
        .post('/test')
        .send({
          user: {
            profile: {
              bio: '<script>alert("nested")</script>',
            },
          },
        });

      expect(response.body.body.user.profile.bio).not.toContain('<script>');
    });

    it('should limit string length', async () => {
      app.post('/test', (req, res) => {
        res.json({ body: req.body });
      });

      const longString = 'a'.repeat(2000);
      const response = await request(app).post('/test').send({ text: longString });

      expect(response.body.body.text.length).toBe(1000);
    });
  });

  describe('requestSizeLimit middleware', () => {
    it('should reject requests exceeding size limit', async () => {
      app.use(requestSizeLimit(100)); // 100 bytes limit
      app.post('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app)
        .post('/test')
        .set('Content-Length', '200')
        .send({ data: 'test' });

      expect(response.status).toBe(413);
      expect(response.body.error).toBe('Payload Too Large');
    });

    it('should allow requests within size limit', async () => {
      app.use(requestSizeLimit(1000)); // 1KB limit
      app.use(express.json());
      app.post('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).post('/test').send({ data: 'small payload' });

      expect(response.status).toBe(200);
    });
  });

  describe('suspiciousActivityDetection middleware', () => {
    beforeEach(() => {
      app.use(express.json());
      app.use(suspiciousActivityDetection());
    });

    it('should block SQL injection attempts', async () => {
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test?id=1; DROP TABLE users;');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Bad Request');
    });

    it('should block XSS attempts', async () => {
      app.post('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app)
        .post('/test')
        .send({ comment: '<script>alert("xss")</script>' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('malicious content');
    });

    it('should block path traversal attempts', async () => {
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test?file=../../etc/passwd');

      expect(response.status).toBe(400);
    });

    it('should block command injection attempts', async () => {
      app.post('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).post('/test').send({ command: 'ls -la && rm -rf /' });

      expect(response.status).toBe(400);
    });

    it('should allow clean requests', async () => {
      app.post('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app)
        .post('/test')
        .send({ name: 'John Doe', email: 'john@example.com' });

      expect(response.status).toBe(200);
    });
  });

  describe('validateApiKey middleware', () => {
    it('should allow requests when no API keys are configured', async () => {
      app.use(validateApiKey());
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
    });

    it('should require API key when keys are configured', async () => {
      app.use(validateApiKey(['valid-key-123']));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('API key required');
    });

    it('should accept valid API key', async () => {
      app.use(validateApiKey(['valid-key-123']));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test').set('x-api-key', 'valid-key-123');

      expect(response.status).toBe(200);
    });

    it('should reject invalid API key', async () => {
      app.use(validateApiKey(['valid-key-123']));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test').set('x-api-key', 'invalid-key');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid API key');
    });
  });

  describe('enhancedCors middleware', () => {
    it('should allow requests when no origins are configured', async () => {
      app.use(enhancedCors());
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test').set('Origin', 'https://evil.com');

      expect(response.status).toBe(200);
    });

    it('should block requests from non-allowed origins', async () => {
      app.use(enhancedCors(['https://example.com']));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test').set('Origin', 'https://evil.com');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Origin not allowed');
    });

    it('should allow requests from allowed origins', async () => {
      app.use(enhancedCors(['https://example.com']));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test').set('Origin', 'https://example.com');

      expect(response.status).toBe(200);
    });
  });

  describe('securityLogger middleware', () => {
    it('should log access to sensitive endpoints', async () => {
      const { logger } = require('../../utils/logger');

      app.use(securityLogger());
      app.get('/auth/login', (req, res) => res.json({ ok: true }));

      await request(app).get('/auth/login');

      expect(logger.info).toHaveBeenCalledWith(
        'Sensitive endpoint access',
        expect.objectContaining({
          path: '/auth/login',
          method: 'GET',
        })
      );
    });

    it('should not log access to non-sensitive endpoints', async () => {
      const { logger } = require('../../utils/logger');

      app.use(securityLogger());
      app.get('/public/info', (req, res) => res.json({ ok: true }));

      await request(app).get('/public/info');

      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('middleware integration', () => {
    it('should work together without conflicts', async () => {
      app.use(securityHeaders());
      app.use(requestSizeLimit());
      app.use(express.json());
      app.use(sanitizeInput());
      app.use(suspiciousActivityDetection());
      app.use(securityLogger());

      app.post('/test', (req, res) => {
        res.json({ body: req.body, headers: req.headers });
      });

      const response = await request(app)
        .post('/test')
        .send({ name: 'John Doe', comment: 'This is a clean comment' });

      expect(response.status).toBe(200);
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.body.body.name).toBe('John Doe');
    });

    it('should handle errors gracefully', async () => {
      // Test that if one middleware fails, others still work
      app.use(securityHeaders());
      app.use((req, res, next) => {
        // Simulate a middleware error
        if (req.query.error) {
          throw new Error('Test error');
        }
        next();
      });
      app.use(sanitizeInput());

      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test?name=test');

      expect(response.status).toBe(200);
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });
});
