import { z } from 'zod';
import { logger } from './utils/logger';

// Check if we're in test environment
const isTestEnvironment =
  process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

const rateLimitDefaults = {
  windowMs: '60000',
  max: '60',
  blockSeconds: '60',
} as const;
const externalApiDefaults = {
  timeoutMs: '5000',
} as const;

const weakJwtSecrets = new Set(
  [
    'changeme',
    'default',
    'secret',
    'jwtsecret',
    'password',
    'test-jwt-secret-at-least-32-characters-long',
  ].map(entry => entry.toLowerCase())
);

// Zod schema for environment validation (production/development)
const prodEnvSchema = z.object({
  // Critical API Keys
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENWEATHER_API_KEY: z.string().min(1, 'OPENWEATHER_API_KEY is required'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // JWT Secret
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),

  // Firebase
  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().min(1, 'FIREBASE_SERVICE_ACCOUNT_BASE64 is required'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),

  // Weather API (with defaults)
  WEATHER_API_URL: z.string().url().optional().default('https://api.openweathermap.org/data/2.5'),
  WEATHER_API_KEY: z.string().optional(),
  WEATHER_CACHE_TTL_MS: z
    .string()
    .regex(/^\d+$/, 'WEATHER_CACHE_TTL_MS must be a number')
    .optional()
    .default('300000'),
  EXTERNAL_API_TIMEOUT_MS: z
    .string()
    .regex(/^\d+$/, 'EXTERNAL_API_TIMEOUT_MS must be a number')
    .optional()
    .default(externalApiDefaults.timeoutMs),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .regex(/^\d+$/, 'RATE_LIMIT_WINDOW_MS must be a number')
    .optional()
    .default(rateLimitDefaults.windowMs),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .regex(/^\d+$/, 'RATE_LIMIT_MAX_REQUESTS must be a number')
    .optional()
    .default(rateLimitDefaults.max),
  RATE_LIMIT_BLOCK_SECONDS: z
    .string()
    .regex(/^\d+$/, 'RATE_LIMIT_BLOCK_SECONDS must be a number')
    .optional()
    .default(rateLimitDefaults.blockSeconds),

  // Optional configurations
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number').optional().default('8080'),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  DEBUG_DIAG: z.enum(['0', '1']).optional().default('0'),
  CORS_ORIGIN: z.string().optional(),
});

// Test schema with relaxed validation and defaults
const testEnvSchema = z.object({
  // Critical API Keys (with test defaults)
  OPENAI_API_KEY: z.string().min(1).optional().default('test-openai-key'),
  OPENWEATHER_API_KEY: z.string().min(1).optional().default('test-weather-key'),

  // Database (optional for tests, skip validation)
  DATABASE_URL: z.string().optional().default('postgresql://test:test@localhost:5432/testdb'),

  // JWT Secret (with test default)
  JWT_SECRET: z.string().min(1).optional().default('test-jwt-secret-at-least-32-characters-long'),

  // Firebase (with test defaults)
  FIREBASE_PROJECT_ID: z.string().min(1).optional().default('test-project'),
  FIREBASE_SERVICE_ACCOUNT_BASE64: z
    .string()
    .min(1)
    .optional()
    .default('dGVzdC1zZXJ2aWNlLWFjY291bnQ='),

  // Stripe (with test defaults)
  STRIPE_SECRET_KEY: z.string().min(1).optional().default('sk_test_test'),

  // Weather API (with defaults)
  WEATHER_API_URL: z.string().url().optional().default('https://api.openweathermap.org/data/2.5'),
  WEATHER_API_KEY: z.string().optional(),
  WEATHER_CACHE_TTL_MS: z
    .string()
    .regex(/^\d+$/, 'WEATHER_CACHE_TTL_MS must be a number')
    .optional()
    .default('300000'),

  // Optional configurations
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number').optional().default('8080'),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('test'),
  DEBUG_DIAG: z.enum(['0', '1']).optional().default('0'),
  CORS_ORIGIN: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().optional().default(rateLimitDefaults.windowMs),
  RATE_LIMIT_MAX_REQUESTS: z.string().optional().default(rateLimitDefaults.max),
  RATE_LIMIT_BLOCK_SECONDS: z.string().optional().default(rateLimitDefaults.blockSeconds),
  EXTERNAL_API_TIMEOUT_MS: z
    .string()
    .regex(/^\d+$/, 'EXTERNAL_API_TIMEOUT_MS must be a number')
    .optional()
    .default(externalApiDefaults.timeoutMs),
});

// Use appropriate schema based on environment
const envSchema = isTestEnvironment ? testEnvSchema : prodEnvSchema;

export type EnvConfig = z.infer<typeof prodEnvSchema>;

/**
 * Validates environment variables using Zod schema
 * Throws descriptive error if validation fails
 */
function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);

      logger.error('❌ Environment validation failed:');
      missingVars.forEach(msg => logger.error(`  • ${msg}`));

      const criticalError = new Error(
        `Missing or invalid environment variables:\n${missingVars
          .map(msg => `  • ${msg}`)
          .join('\n')}\n\nPlease check your .env file and ensure all required variables are set.`
      );

      // Set a clear error name for debugging
      criticalError.name = 'EnvironmentValidationError';
      throw criticalError;
    }
    throw error;
  }
}

/**
 * Validated environment configuration
 * Will throw on startup if any required variables are missing
 */
const validatedEnv = validateEnv();

function ensureJwtSecretStrength(config: EnvConfig) {
  const secret = config.JWT_SECRET.trim();
  const isProd = config.NODE_ENV === 'production';
  const missingPatterns: string[] = [];
  if (!/[a-z]/.test(secret)) missingPatterns.push('a lowercase letter');
  if (!/[A-Z]/.test(secret)) missingPatterns.push('an uppercase letter');
  if (!/[0-9]/.test(secret)) missingPatterns.push('a number');
  if (!/[^A-Za-z0-9]/.test(secret)) missingPatterns.push('a symbol');

  const isForbidden = weakJwtSecrets.has(secret.toLowerCase());
  if (!missingPatterns.length && !isForbidden) return;

  let message = '';
  if (missingPatterns.length) {
    message = `JWT_SECRET must include ${missingPatterns.join(', ')}`;
  }
  if (isForbidden) {
    message = message
      ? `${message} and cannot use placeholder secrets`
      : 'JWT_SECRET cannot use placeholder secrets';
  }

  if (isProd) {
    const error = new Error(message);
    error.name = 'EnvironmentValidationError';
    throw error;
  }

  logger.warn('Weak JWT_SECRET detected', { reason: message, nodeEnv: config.NODE_ENV });
}

ensureJwtSecretStrength(validatedEnv);

export const env = validatedEnv;

/**
 * Helper to check if running in development mode
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Helper to check if running in production mode
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Helper to check if running in test mode
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * Helper to check if debug diagnostics are enabled
 */
export const isDebugEnabled = env.DEBUG_DIAG === '1';

export const resolvedRateLimitConfig = {
  windowMs: Number(env.RATE_LIMIT_WINDOW_MS),
  max: Number(env.RATE_LIMIT_MAX_REQUESTS),
  blockSeconds: Number(env.RATE_LIMIT_BLOCK_SECONDS),
};

export const externalApiTimeoutMs = Number(env.EXTERNAL_API_TIMEOUT_MS);
