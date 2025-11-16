// Integration test for the complete checkout flow
// Tests the entire user journey from cart to order completion

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/prismaClient';
import { ComplianceService } from '../../src/services/complianceService';

describe('Checkout Flow Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let storeId: string;
  let productId: string;

  beforeEach(async () => {
    // Clean database
    await prisma.$transaction([
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.cartItem.deleteMany(),
      prisma.cart.deleteMany(),
      prisma.product.deleteMany(),
      prisma.store.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    // Create test user with age verification
    const testUser = await prisma.user.create({
      data: {
        email: 'checkout-test@example.com',
        name: 'Checkout Test User',
        passwordHash: 'hashedpassword123',
        dateOfBirth: new Date('1990-01-01'),
        ageVerified: true,
      },
    });
    userId = testUser.id;

    // Create test brand first (required for store)
    const testBrand = await prisma.brand.create({
      data: {
        name: 'Test Brand',
        slug: 'test-brand-checkout',
      },
    });

    // Create test store
    const testStore = await prisma.store.create({
      data: {
        name: 'Test Dispensary',
        slug: 'test-dispensary-checkout',
        brandId: testBrand.id,
        address1: '123 Test St',
        city: 'Test City',
        state: 'CA',
        postalCode: '12345',
        phone: '555-0123',
        latitude: 34.0522,
        longitude: -118.2437,
      },
    });
    storeId = testStore.id;

    // Create test product
    const testProduct = await prisma.product.create({
      data: {
        name: 'Test Flower',
        slug: 'test-flower-checkout',
        description: 'Test product for checkout',
        category: 'Flower',
        defaultPrice: 25.0,
        thcPercent: 20.0,
        thcMgPerUnit: 200,
      },
    });

    // Create StoreProduct relationship with pricing
    await prisma.storeProduct.create({
      data: {
        storeId: storeId,
        productId: testProduct.id,
        price: 25.0,
        stock: 100,
        active: true,
      },
    });
    productId = testProduct.id;

    // Mock auth token (in real test, would go through auth flow)
    authToken = 'mock-jwt-token';
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.$transaction([
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.cartItem.deleteMany(),
      prisma.cart.deleteMany(),
      prisma.product.deleteMany(),
      prisma.store.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  });

  describe('Complete Checkout Flow', () => {
    it('should complete full checkout flow from cart to order', async () => {
      // Step 1: Add item to cart
      const addToCartResponse = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: productId,
          quantity: 1,
          storeId: storeId,
        });

      expect(addToCartResponse.status).toBe(200);
      expect(addToCartResponse.body.success).toBe(true);

      // Step 2: Get cart contents
      const getCartResponse = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(getCartResponse.status).toBe(200);
      expect(getCartResponse.body.items).toHaveLength(1);
      expect(getCartResponse.body.items[0].product.name).toBe('Test Flower');

      // Step 3: Create order from cart
      const createOrderResponse = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storeId: storeId,
          paymentMethod: 'pay_at_pickup',
          items: [
            {
              productId: productId,
              quantity: 1,
            },
          ],
        });

      expect(createOrderResponse.status).toBe(201);
      expect(createOrderResponse.body.order).toBeDefined();
      expect(createOrderResponse.body.order.status).toBe('CREATED');
      expect(createOrderResponse.body.order.totalAmount).toBe(2500);

      // Step 4: Verify order was created in database
      const createdOrder = await prisma.order.findUnique({
        where: { id: createOrderResponse.body.order.id },
        include: { items: true },
      });

      expect(createdOrder).toBeDefined();
      expect(createdOrder?.items).toHaveLength(1);
      expect(createdOrder?.items[0].productId).toBe(productId);

      // Step 5: Verify cart was cleared
      const clearedCartResponse = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(clearedCartResponse.body.items).toHaveLength(0);
    });

    it('should handle checkout with multiple items', async () => {
      // Create second product
      const secondProduct = await prisma.product.create({
        data: {
          name: 'Test Edible',
          slug: 'test-edible-checkout',
          description: 'Test edible for checkout',
          category: 'Edibles',
          defaultPrice: 15.0,
          thcMgPerUnit: 10,
        },
      });

      // Create StoreProduct relationship for second product
      await prisma.storeProduct.create({
        data: {
          storeId: storeId,
          productId: secondProduct.id,
          price: 15.0,
          stock: 50,
          active: true,
        },
      });

      // Add multiple items to cart
      await request(app).post('/api/v1/cart/add').set('Authorization', `Bearer ${authToken}`).send({
        productId: productId,
        quantity: 2,
        storeId: storeId,
      });

      await request(app).post('/api/v1/cart/add').set('Authorization', `Bearer ${authToken}`).send({
        productId: secondProduct.id,
        quantity: 1,
        storeId: storeId,
      });

      // Create order with multiple items
      const createOrderResponse = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storeId: storeId,
          paymentMethod: 'pay_at_pickup',
          items: [
            { productId: productId, quantity: 2 },
            { productId: secondProduct.id, quantity: 1 },
          ],
        });

      expect(createOrderResponse.status).toBe(201);

      const order = createOrderResponse.body.order;
      expect(order.totalAmount).toBe(6500); // (25 * 2) + 15 = $65

      // Verify order items
      const createdOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });

      expect(createdOrder?.items).toHaveLength(2);
    });
  });

  describe('Checkout Error Handling', () => {
    it('should reject checkout for underage user', async () => {
      // Create underage user
      const underageUser = await prisma.user.create({
        data: {
          email: 'underage@example.com',
          name: 'Underage User',
          passwordHash: 'hashedpassword123',
          dateOfBirth: new Date('2010-01-01'), // 15 years old
          ageVerified: false,
        },
      });

      // Mock token for underage user
      const underageToken = 'mock-underage-token';

      const createOrderResponse = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${underageToken}`)
        .send({
          storeId: storeId,
          paymentMethod: 'pay_at_pickup',
          items: [{ productId: productId, quantity: 1 }],
        });

      expect(createOrderResponse.status).toBe(400);
      expect(createOrderResponse.body.errors).toBeDefined();
      expect(createOrderResponse.body.errors[0].code).toBe('AGE_NOT_VERIFIED');
    });

    it('should reject checkout with invalid product', async () => {
      const createOrderResponse = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storeId: storeId,
          paymentMethod: 'pay_at_pickup',
          items: [{ productId: 'invalid-product-id', quantity: 1 }],
        });

      expect(createOrderResponse.status).toBe(400);
      expect(createOrderResponse.body.error).toBeDefined();
    });

    it('should reject checkout with zero quantity', async () => {
      const createOrderResponse = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storeId: storeId,
          paymentMethod: 'pay_at_pickup',
          items: [{ productId: productId, quantity: 0 }],
        });

      expect(createOrderResponse.status).toBe(400);
      expect(createOrderResponse.body.error).toBeDefined();
    });
  });
});
