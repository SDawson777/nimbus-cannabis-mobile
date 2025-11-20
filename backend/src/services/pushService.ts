import { prisma } from '../prismaClient';
import { cacheService, CacheKeys } from './cacheService';
import { logger } from '../utils/logger';
import { getAdmin } from '../firebaseAdmin';

const TOKEN_BACKOFF_SECONDS = 60 * 5; // 5 minutes when token is invalid
const FAILURE_WINDOW_SECONDS = 10 * 60; // track failures for 10 minutes
const MAX_FAILURES_BEFORE_BACKOFF = 3;

const memoryStore = new Map<string, { value: number; expires: number }>();

function setMemory(key: string, value: number, ttlSeconds: number) {
  memoryStore.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

function getMemory(key: string): number | undefined {
  const entry = memoryStore.get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    memoryStore.delete(key);
    return undefined;
  }
  return entry.value;
}

async function setTemporalValue(key: string, value: number, ttlSeconds: number) {
  if (cacheService.isAvailable()) {
    await cacheService.set(key, value, ttlSeconds);
  } else {
    setMemory(key, value, ttlSeconds);
  }
}

async function getTemporalValue(key: string): Promise<number | undefined> {
  if (cacheService.isAvailable()) {
    return cacheService.get<number>(key);
  }
  return getMemory(key);
}

async function clearTemporalValue(key: string) {
  if (cacheService.isAvailable()) await cacheService.delete(key);
  memoryStore.delete(key);
}

export class PushTokenError extends Error {
  status: number;
  retryAfter?: number;
  constructor(message: string, status = 400, retryAfter?: number) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export async function registerPushToken(userId: string, token: string) {
  const normalized = String(token || '').trim();
  if (!normalized) throw new PushTokenError('Missing token', 400);
  if (normalized.length < 20 || normalized.length > 4096) {
    throw new PushTokenError('Invalid token length', 400);
  }

  const backoffKey = CacheKeys.pushTokenBackoff(userId);
  const blockedUntil = await getTemporalValue(backoffKey);
  if (blockedUntil && blockedUntil > Date.now()) {
    const retryAfter = Math.ceil((blockedUntil - Date.now()) / 1000);
    throw new PushTokenError('Push token recently rejected. Retry later.', 429, retryAfter);
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true },
  });
  if (existing?.fcmToken === normalized) {
    return { updated: false };
  }

  await prisma.user.update({ where: { id: userId }, data: { fcmToken: normalized } });
  await clearTemporalValue(CacheKeys.pushTokenFailures(userId));
  await clearTemporalValue(backoffKey);
  return { updated: true };
}

export interface PushPayload {
  userId: string;
  token?: string | null;
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
}

export async function sendPushNotification(payload: PushPayload): Promise<boolean> {
  const { userId } = payload;
  const token =
    payload.token ??
    (await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } }))?.fcmToken;
  if (!token) return false;

  try {
    const admin = getAdmin();
    await admin.messaging().send({
      token,
      notification: payload.notification,
      data: payload.data,
    });
    await clearTemporalValue(CacheKeys.pushTokenFailures(userId));
    return true;
  } catch (error: any) {
    logger.warn('push.send_failed', {
      userId,
      code: error?.code,
      message: error?.message,
    });
    const code = String(error?.code || '');
    if (
      code.includes('registration-token-not-registered') ||
      code.includes('invalid-registration-token')
    ) {
      await handleInvalidToken(userId);
      return false;
    }
    await recordFailure(userId);
    return false;
  }
}

async function recordFailure(userId: string) {
  const key = CacheKeys.pushTokenFailures(userId);
  let failures = (await getTemporalValue(key)) || 0;
  failures += 1;
  await setTemporalValue(key, failures, FAILURE_WINDOW_SECONDS);
  if (failures >= MAX_FAILURES_BEFORE_BACKOFF) {
    await setBackoff(userId, TOKEN_BACKOFF_SECONDS);
  }
}

async function handleInvalidToken(userId: string) {
  await prisma.user
    .update({ where: { id: userId }, data: { fcmToken: null } })
    .catch(() => undefined);
  await setBackoff(userId, TOKEN_BACKOFF_SECONDS);
}

async function setBackoff(userId: string, seconds: number) {
  const until = Date.now() + seconds * 1000;
  await setTemporalValue(CacheKeys.pushTokenBackoff(userId), until, seconds);
}
