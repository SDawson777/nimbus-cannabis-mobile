import { Router } from 'express';
import { prisma } from '../prismaClient';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import { rateLimit } from '../middleware/rateLimit';
import { getCachedPrice, setCachedPrice } from '../utils/lruCache';
import { ComplianceService } from '../services/complianceService';

export const ordersRouter = Router();

// Schema for optional contact fields (light validation now, can extend later)
const contactSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().min(7).max(20).optional(),
    email: z.string().email().optional(),
  })
  .partial();

// Apply stricter rate limit: ordering is a high-value operation
ordersRouter.post(
  '/orders',
  requireAuth,
  rateLimit('orders:create', { max: 10, windowMs: 60_000 }),
  async (req, res) => {
    const uid = (req as any).user.userId as string;
    let {
      storeId,
      contact,
      paymentMethod = 'pay_at_pickup',
      notes,
      idempotencyKey,
    } = req.body || {};

    // Idempotency check: if key provided, ensure we don't duplicate orders
    if (idempotencyKey) {
      const existing = await prisma.order.findFirst({
        where: {
          userId: uid,
          notes: `idempotency:${idempotencyKey}`,
        },
        include: { items: true },
      });

      if (existing) {
        // Return the existing order to prevent duplicate
        const store = await prisma.store.findUnique({ where: { id: existing.storeId } });
        const hydratedItems = await Promise.all(
          (existing.items || []).map(async (it: any) => {
            const _productPrice = getCachedPrice(`product:${it.productId}`) ?? it.unitPrice ?? 0;
            const _variantPrice = it.variantId
              ? getCachedPrice(`variant:${it.variantId}`)
              : undefined;
            return {
              id: it.id,
              name: 'Item', // Would need product lookup for real name
              quantity: it.quantity,
              price: it.unitPrice,
            };
          })
        );

        return res.status(200).json({
          order: {
            id: existing.id,
            createdAt: existing.createdAt,
            total: existing.total,
            status: 'pending',
            deliveryMethod: 'pickup', // Would need to store this
            deliveryAddress: null,
            paymentMethod: existing.paymentMethod || 'pay_at_pickup',
            store: store?.name || '',
            items: hydratedItems,
            subtotal: existing.subtotal,
            taxes: existing.tax ?? 0,
            fees: 0,
          },
          idempotent: true,
        });
      }
    }

    // Basic payload validation (non-fatal): validate contact shape if provided
    if (contact) {
      const parsed = contactSchema.safeParse(contact);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_payload', details: parsed.error.flatten() });
      }
      contact = parsed.data;
    }

    // If storeId not provided, try to infer from the user's cart
    const preCart = await prisma.cart.findFirst({
      where: { userId: uid },
      include: { items: true },
    });
    if (!storeId) {
      if (preCart && preCart.storeId) storeId = preCart.storeId;
      else return res.status(400).json({ error: 'storeId required' });
    }

    // Validate delivery address when deliveryMethod is delivery
    const { deliveryMethod } = req.body || {};
    if (deliveryMethod === 'delivery') {
      const addr = req.body?.deliveryAddress || {};
      if (!addr.city || !addr.state || !addr.zipCode)
        return res.status(400).json({ error: 'invalid address' });
    }

    // Validate payment method
    const allowedPayments = ['card', 'pay_at_pickup'];
    if (req.body?.paymentMethod && !allowedPayments.includes(req.body.paymentMethod)) {
      return res.status(400).json({ error: 'invalid payment method' });
    }

    const cart =
      preCart ||
      (await prisma.cart.findFirst({ where: { userId: uid }, include: { items: true } }));
    if (!cart || cart.items.length === 0) return res.status(400).json({ error: 'cart is empty' });

    // Pricing integrity: batch fetch all products and variants to avoid N+1 queries
    // Use cache for frequently accessed prices to reduce DB load
    const productIds = [...new Set(cart.items.map(ci => ci.productId))];
    const variantIds = cart.items.map(ci => ci.variantId).filter(Boolean) as string[];

    // Check cache first for products and variants
    const uncachedProductIds: string[] = [];
    const uncachedVariantIds: string[] = [];
    const priceCache = new Map<string, number>();

    for (const pid of productIds) {
      const cached = getCachedPrice(`product:${pid}`);
      if (cached !== undefined) {
        priceCache.set(`product:${pid}`, cached);
      } else {
        uncachedProductIds.push(pid);
      }
    }

    for (const vid of variantIds) {
      const cached = getCachedPrice(`variant:${vid}`);
      if (cached !== undefined) {
        priceCache.set(`variant:${vid}`, cached);
      } else {
        uncachedVariantIds.push(vid);
      }
    }

    // Fetch uncached items from DB
    const [products, variants] = await Promise.all([
      uncachedProductIds.length > 0
        ? prisma.product.findMany({ where: { id: { in: uncachedProductIds } } })
        : [],
      uncachedVariantIds.length > 0
        ? prisma.productVariant.findMany({ where: { id: { in: uncachedVariantIds } } })
        : [],
    ]);

    // Update cache with fetched data
    for (const p of products) {
      const price = (p as any).defaultPrice as number;
      priceCache.set(`product:${p.id}`, price);
      setCachedPrice(`product:${p.id}`, price);
    }

    for (const v of variants) {
      const price = (v as any).price as number;
      priceCache.set(`variant:${v.id}`, price);
      setCachedPrice(`variant:${v.id}`, price);
    }

    // Validate pricing using cached data
    for (const ci of cart.items) {
      const productPrice = priceCache.get(`product:${ci.productId}`) ?? 0;
      const variantPrice = ci.variantId ? priceCache.get(`variant:${ci.variantId}`) : undefined;
      const currentPrice = variantPrice ?? productPrice;

      // Allow minor floating drift (<= 0.005) but not material changes
      if (Math.abs((ci.unitPrice ?? 0) - currentPrice) > 0.005) {
        return res.status(409).json({
          error: 'pricing_changed',
          details: {
            productId: ci.productId,
            variantId: ci.variantId,
            previous: ci.unitPrice,
            current: currentPrice,
          },
        });
      }
    }

    const itemsToCreate = cart.items.map(ci => {
      // Use cached pricing data
      const productPrice = priceCache.get(`product:${ci.productId}`) ?? 0;
      const variantPrice = ci.variantId ? priceCache.get(`variant:${ci.variantId}`) : undefined;
      const price = variantPrice ?? productPrice ?? ci.unitPrice ?? 0;

      return {
        productId: ci.productId,
        variantId: ci.variantId || undefined,
        quantity: ci.quantity,
        unitPrice: price,
        lineTotal: price * ci.quantity,
      };
    });
    const subtotal = itemsToCreate.reduce((s, i) => s + (i.lineTotal || 0), 0);
    const taxes = Math.round(subtotal * 0.06 * 100) / 100;
    const fees = 0;
    const total = Math.round((subtotal + taxes + fees) * 100) / 100;

    // Compliance check before creating order
    const complianceService = new ComplianceService(prisma);
    const orderItems = cart.items.map(ci => ({
      productId: ci.productId,
      quantity: ci.quantity,
    }));

    const complianceResult = await complianceService.checkOrderCompliance(uid, storeId, orderItems);

    if (!complianceResult.isValid) {
      return res.status(400).json({
        error: 'compliance_violation',
        message: 'Order violates compliance requirements',
        violations: complianceResult.errors,
      });
    }

    const created = await prisma.order.create({
      data: {
        userId: uid,
        storeId,
        status: 'CREATED',
        paymentMethod,
        notes: idempotencyKey ? `idempotency:${idempotencyKey}` : notes,
        contactName: contact?.name,
        contactPhone: contact?.phone,
        contactEmail: contact?.email,
        subtotal,
        tax: taxes, // keep DB column name `tax` but we'll expose `taxes` to clients
        total,
        items: { create: itemsToCreate },
      },
      include: { items: true },
    });

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Hydrate response: populate store name and item names/prices
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    const hydratedItems = await Promise.all(
      (created.items || []).map(async (it: any) => {
        const product = await prisma.product.findUnique({ where: { id: it.productId } });
        const variant = it.variantId
          ? await prisma.productVariant.findUnique({ where: { id: it.variantId } })
          : null;
        return {
          id: it.id,
          name: variant?.name || product?.name || 'Item',
          quantity: it.quantity,
          price: it.unitPrice,
        };
      })
    );

    res.status(201).json({
      order: {
        id: created.id,
        createdAt: created.createdAt,
        total: created.total,
        // present friendly lowercase status and echo delivery/payment info
        status: 'pending',
        deliveryMethod: req.body?.deliveryMethod || deliveryMethod || 'pickup',
        deliveryAddress: req.body?.deliveryAddress || null,
        paymentMethod: req.body?.paymentMethod || paymentMethod,
        store: store?.name || '',
        items: hydratedItems,
        subtotal: created.subtotal,
        taxes,
        fees,
      },
    });
  }
);

ordersRouter.get('/orders', requireAuth, async (req, res) => {
  const uid = (req as any).user.userId as string;
  const { status, page = '1', limit = '24' } = req.query as Record<string, string>;
  const where: any = { userId: uid };
  if (status) where.status = status as any;
  const take = Math.min(100, parseInt(limit));
  const pageNum = Math.max(1, parseInt(page));
  const skip = (pageNum - 1) * take;
  const items = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    skip,
    include: { items: true },
  });

  // Hydrate each order
  const orders = await Promise.all(
    items.map(async (o: any) => {
      const store = await prisma.store.findUnique({ where: { id: o.storeId } });
      const hydratedItems = await Promise.all(
        (o.items || []).map(async (it: any) => {
          const product = await prisma.product.findUnique({ where: { id: it.productId } });
          const variant = it.variantId
            ? await prisma.productVariant.findUnique({ where: { id: it.variantId } })
            : null;
          return {
            id: it.id,
            name: variant?.name || product?.name || 'Item',
            quantity: it.quantity,
            price: it.unitPrice,
          };
        })
      );
      return {
        id: o.id,
        createdAt: o.createdAt,
        total: o.total,
        status: (o.status || '').toLowerCase(),
        store: store?.name || '',
        items: hydratedItems,
        subtotal: o.subtotal,
        taxes: o.tax ?? 0,
        fees: 0,
      };
    })
  );

  const nextPage = items.length === take ? pageNum + 1 : undefined;
  res.json({ orders, pagination: { page: pageNum, limit: take, nextPage } });
});

// Return a single order wrapped in { order }
ordersRouter.get('/orders/:id', requireAuth, async (req, res) => {
  const uid = (req as any).user.userId as string;
  const id = req.params.id;
  const o = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!o) return res.status(404).json({ error: 'Order not found' });
  if (o.userId !== uid) return res.status(403).json({ error: 'No access to order' });
  const store = await prisma.store.findUnique({ where: { id: o.storeId } });
  const hydratedItems = await Promise.all(
    (o.items || []).map(async (it: any) => {
      const product = await prisma.product.findUnique({ where: { id: it.productId } });
      const variant = it.variantId
        ? await prisma.productVariant.findUnique({ where: { id: it.variantId } })
        : null;
      return {
        id: it.id,
        name: variant?.name || product?.name || 'Item',
        quantity: it.quantity,
        price: it.unitPrice,
      };
    })
  );
  res.json({
    order: {
      id: o.id,
      createdAt: o.createdAt,
      total: o.total,
      status: (o.status || '').toLowerCase(),
      store: store?.name || '',
      items: hydratedItems,
      subtotal: o.subtotal,
      taxes: o.tax ?? 0,
      fees: 0,
    },
  });
});

// Cancel an order
ordersRouter.put('/orders/:id/cancel', requireAuth, async (req, res) => {
  const uid = (req as any).user.userId as string;
  const id = req.params.id;
  const o = await prisma.order.findUnique({ where: { id } });
  if (!o) return res.status(404).json({ error: 'Order not found' });
  if (o.userId !== uid) return res.status(403).json({ error: 'No access to order' });
  if (String(o.status) !== 'PENDING' && String(o.status) !== 'CREATED')
    return res.status(400).json({ error: 'cannot cancel' });
  const updated = await prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } });
  // normalize status to lowercase in API payload
  res.json({ order: { ...updated, status: 'cancelled' }, message: 'Order cancelled' });
});

// Order tracking (simple mock)
ordersRouter.get('/orders/:id/tracking', requireAuth, async (req, res) => {
  const id = req.params.id;
  const o = await prisma.order.findUnique({ where: { id } });
  if (!o) return res.status(404).json({ error: 'not found' });
  res.json({
    tracking: {
      status: (o.status || 'unknown').toLowerCase(),
      estimatedDelivery: new Date(Date.now() + 3600000).toISOString(),
      updates: [],
    },
  });
});

// Rate an order
ordersRouter.post('/orders/:id/rate', requireAuth, async (req, res) => {
  const id = req.params.id;
  const o = await prisma.order.findUnique({ where: { id } });
  if (!o) return res.status(404).json({ error: 'Order not found' });
  if (String(o.status) !== 'COMPLETED')
    return res.status(400).json({ error: 'Order must be completed to rate' });
  // simple echo back
  res.status(201).json({ rating: { rating: req.body.rating }, message: 'Thanks' });
});
