import { Router } from 'express';
import { prisma } from '../prismaClient';
import { admin, initFirebase } from '../bootstrap/firebase-admin';
import { env } from '../env';

export const qaRouter = Router();

function guard(req: any, res: any) {
  if (process.env.DEBUG_DIAG !== '1') {
    res.status(403).json({ error: 'Diagnostics disabled' });
    return false;
  }
  return true;
}

// 1) Quick env visibility (no secrets)
qaRouter.get('/diag/env', (_req, res) => {
  const k = env.OPENAI_API_KEY || '';
  res.json({
    node: process.version,
    has_OPENAI_API_KEY: !!k,
    openai_prefix: k ? k.slice(0, 8) + '…' : null,
    has_FIREBASE_PROJECT_ID: !!env.FIREBASE_PROJECT_ID,
    has_FIREBASE_SERVICE_ACCOUNT_BASE64: !!env.FIREBASE_SERVICE_ACCOUNT_BASE64,
    debug_diag: process.env.DEBUG_DIAG === '1',
  });
});

// 2) OpenAI ping
qaRouter.post('/diag/openai', async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const r = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
      temperature: 0,
    });
    res.json({ ok: true, id: (r as any).id || null });
  } catch (e: any) {
    res.json({
      ok: false,
      status: e?.status || 500,
      code: e?.code || e?.error?.type || null,
      message: e?.message || String(e),
    });
  }
});

// 3) Firebase write test
qaRouter.post('/diag/firebase', async (req, res) => {
  if (!guard(req, res)) return;
  try {
    initFirebase();
    const bucket = admin.storage().bucket();
    const path = `diag/${Date.now()}.txt`;
    await bucket.file(path).save('ok', { contentType: 'text/plain' });
    const [url] = await bucket
      .file(path)
      .getSignedUrl({ action: 'read', expires: Date.now() + 60_000 });
    res.json({ ok: true, file: path, url });
  } catch (e: any) {
    res.status(500).json({ ok: false, message: e?.message || String(e) });
  }
});

// 4) QA bootstrap: ensures store + product(+variant); returns fresh email for Register
qaRouter.post('/diag/bootstrap', async (req, res) => {
  if (!guard(req, res)) return;
  const ts = Date.now();
  const email = `qa+${ts}@example.com`;
  const password = 'Passw0rd!@#';

  // ensure a store
  const store = await prisma.store.upsert({
    where: { slug: 'detroit' },
    update: {},
    create: {
      name: 'JARS Detroit',
      slug: 'detroit',
      city: 'Detroit',
      state: 'MI',
      latitude: 42.3314,
      longitude: -83.0458,
      brand: {
        connectOrCreate: {
          where: { slug: 'jars' },
          create: { name: 'JARS', slug: 'jars' },
        },
      },
    },
  });

  // ensure a product + variant
  const product = await prisma.product.upsert({
    where: { slug: 'blue-dream-eighth' },
    update: {},
    create: {
      name: 'Blue Dream',
      slug: 'blue-dream-eighth',
      brand: 'House',
      category: 'Flower' as any,
      strainType: 'Sativa' as any,
      defaultPrice: 30,
      variants: { create: [{ name: '3.5g', sku: `BD-35`, price: 30 }] },
    },
  });
  const variant = await prisma.productVariant.findFirst({ where: { productId: product.id } });

  // ensure in-stock at store
  if (variant) {
    await prisma.storeProduct.upsert({
      where: {
        storeId_productId_variantId: {
          storeId: store.id,
          productId: product.id,
          variantId: variant.id,
        },
      },
      update: { price: 28, stock: 50 },
      create: {
        storeId: store.id,
        productId: product.id,
        variantId: variant.id,
        price: 28,
        stock: 50,
      },
    });
  }

  res.json({
    ok: true,
    testEmail: email,
    testPassword: password,
    storeId: store.id,
    productId: product.id,
    variantId: variant?.id || null,
    note: 'Use testEmail for /auth/register; then login → set token; then add-to-cart → create order.',
  });
});
