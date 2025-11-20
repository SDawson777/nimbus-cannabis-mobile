// backend/src/services/weatherProvider.ts
// Minimal weather provider abstraction so we can later plug in a real external API
// without changing the recommendations route logic. For now we derive a pseudo
// condition from provided query params (temp, clouds, precip) or fall back to
// time-of-day logic similar to the mobile placeholder.

import { cacheService, CacheKeys } from './cacheService';
import { logger } from '../utils/logger';

export type WeatherObservation = {
  tempC?: number; // temperature in Celsius
  cloudCoverPct?: number; // 0-100
  precipitationMm?: number; // last hour
  thunder?: boolean;
  snow?: boolean;
  time?: Date;
};

function bucketCoordinate(value: number) {
  return value.toFixed(2);
}

async function fetchWithTimeout(url: string, init: Record<string, any>, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Normalize an observation into one of our supported condition keys.
export function normalizeObservationToCondition(obs: WeatherObservation): string {
  // thunder has highest precedence
  if (obs.thunder) return 'thunderstorm';
  if (obs.snow) return 'snow';
  const precip = obs.precipitationMm ?? 0;
  if (precip > 0.2) return 'rain';
  const clouds = obs.cloudCoverPct ?? 0;
  if (clouds < 10) return 'clear';
  if (clouds < 35) return 'sunny';
  if (clouds < 60) return 'partly cloudy';
  if (clouds < 85) return 'cloudy';
  return 'overcast';
}

// Fallback: time-of-day mapping used when no numeric data provided.
export function deriveConditionFromTime(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 6 && hour < 11) return 'partly cloudy';
  if (hour >= 11 && hour < 16) return 'sunny';
  if (hour >= 16 && hour < 20) return 'cloudy';
  return 'overcast';
}

// Public API for route: Accept partial observation (maybe derived from a still-to-be-implemented
// external fetch) and return normalized condition. If no meaningful fields, fallback to time.
export async function getCurrentWeatherCondition(
  _lat?: number,
  _lon?: number,
  partial?: WeatherObservation
): Promise<string> {
  // 1) Use external API if configured (guarded by env) with simple in-memory caching.
  //    This is best-effort only. Any failure should gracefully fall back to local inference.
  try {
    // Lazy import to avoid circulars for tests
    const { env } = await import('../env');
    const url = env.WEATHER_API_URL;
    const apiKey = env.WEATHER_API_KEY;
    const ttlMs = Number(env.WEATHER_CACHE_TTL_MS || '300000');
    const timeoutMs = Number(env.EXTERNAL_API_TIMEOUT_MS || '5000');
    if (url && _lat != null && _lon != null) {
      const latBucket = bucketCoordinate(_lat);
      const lonBucket = bucketCoordinate(_lon);
      const cacheKey = CacheKeys.weatherCondition(latBucket, lonBucket);
      const cached = await getWeatherCache(cacheKey);
      if (cached) return cached;

      const qs = url.includes('?') ? `&lat=${_lat}&lon=${_lon}` : `?lat=${_lat}&lon=${_lon}`;
      const fetchUrl = `${url}${qs}`;
      const headers: Record<string, string> = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const fetchImpl: any = (global as any).fetch;
      if (typeof fetchImpl === 'function') {
        const resp = await fetchWithTimeout(fetchUrl, { headers }, timeoutMs);
        if (resp && typeof resp.json === 'function') {
          const data = await resp.json();
          // Adapter: prefer explicit string condition when available
          let condition: string | undefined = (data && data.condition) || (data && data.weather);
          if (typeof condition === 'string') {
            condition = String(condition).toLowerCase();
          } else if (data && typeof data === 'object') {
            // Try to map common field names into our observation shape
            const obs: WeatherObservation = {
              cloudCoverPct:
                data.cloudCoverPct ??
                data.cloud_cover ??
                data.clouds ??
                data.clouds_pct ??
                undefined,
              precipitationMm:
                data.precipitationMm ?? data.precip_mm ?? data.rain_mm ?? data.precip ?? undefined,
              thunder: data.thunder ?? data.thunderstorm ?? false,
              snow: data.snow ?? !!data.snowfall,
            };
            condition = normalizeObservationToCondition(obs);
          }
          if (condition && typeof condition === 'string') {
            await setWeatherCache(cacheKey, condition, ttlMs);
            return condition;
          }
        }
      }
    }
  } catch (error) {
    logger.warn('weatherProvider.external_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
  }

  // 2) If caller supplied a partial observation, infer condition from it.
  if (
    partial &&
    (partial.cloudCoverPct != null ||
      partial.precipitationMm != null ||
      partial.thunder ||
      partial.snow)
  ) {
    return normalizeObservationToCondition(partial);
  }
  // 3) Final fallback to time-of-day heuristic.
  return deriveConditionFromTime();
}

// Very small in-memory cache (future-proof). For now not used by getCurrentWeatherCondition
// but retained for extension.
const memoryCache = new Map<string, { value: string; expires: number }>();
export function cacheCondition(key: string, value: string, ttlMs = 5 * 60 * 1000) {
  memoryCache.set(key, { value, expires: Date.now() + ttlMs });
}
export function getCachedCondition(key: string): string | undefined {
  const hit = memoryCache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    memoryCache.delete(key);
    return undefined;
  }
  return hit.value;
}

async function getWeatherCache(key: string): Promise<string | undefined> {
  if (cacheService.isAvailable()) {
    const cached = await cacheService.get<string>(key);
    if (cached) return cached;
  }
  return getCachedCondition(key);
}

async function setWeatherCache(key: string, value: string, ttlMs: number) {
  const ttlSeconds = Math.max(30, Math.floor(ttlMs / 1000));
  if (cacheService.isAvailable()) {
    await cacheService.set(key, value, ttlSeconds);
    return;
  }
  cacheCondition(key, value, ttlMs);
}
