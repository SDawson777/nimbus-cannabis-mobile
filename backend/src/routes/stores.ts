import { Router } from 'express';
import { prisma } from '../prismaClient';
import { haversineMeters } from '../utils/geo';
import { cacheService, CacheKeys } from '../services/cacheService';
import { createHash } from 'crypto';

export const storesRouter = Router();
const STORES_CACHE_TTL = 120; // seconds

function buildStoresCacheKey(params: Record<string, string | undefined>) {
  const hash = createHash('sha1').update(JSON.stringify(params)).digest('hex');
  return CacheKeys.storesList(hash);
}

storesRouter.get('/stores', async (req, res) => {
  const { lat, lng, radius, q } = req.query as Record<string, string>;
  const cacheKey = buildStoresCacheKey({ lat, lng, radius, q });
  const cached = await cacheService.get<any[]>(cacheKey);
  if (cached) return res.json(cached);
  const where: any = { isActive: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { state: { contains: q, mode: 'insensitive' } },
    ];
  }
  const all = await prisma.store.findMany({ where, orderBy: { name: 'asc' } });
  let filtered = all;
  if (lat && lng && radius) {
    const L = parseFloat(lat),
      G = parseFloat(lng),
      R = parseFloat(radius);
    if (Number.isFinite(L) && Number.isFinite(G) && Number.isFinite(R)) {
      filtered = all.filter(
        s =>
          s.latitude &&
          s.longitude &&
          haversineMeters(
            { lat: L, lng: G },
            { lat: Number(s.latitude), lng: Number(s.longitude) }
          ) <= R
      );
    } else {
      return res.status(400).json({ error: 'lat/lng/radius must be numbers' });
    }
  }
  await cacheService.set(cacheKey, filtered, STORES_CACHE_TTL);
  res.json(filtered);
});

storesRouter.get('/stores/:id', async (req, res) => {
  const store = await prisma.store.findUnique({ where: { id: req.params.id } });
  if (!store) return res.status(404).json({ error: 'Store not found' });
  const includeHours = String(req.query.includeHours || 'false') === 'true';
  return res.json(includeHours ? store : { ...store, hours: undefined });
});
