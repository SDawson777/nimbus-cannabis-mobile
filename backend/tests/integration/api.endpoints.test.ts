// Comprehensive API endpoint tests
// Tests all major API routes for functionality and error handling

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/prismaClient';

describe('API Endpoints Integration Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testStoreId: string;
  let testBrandId: string;

  beforeEach(async () => {
    // Clean database
    await prisma.$transaction([
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.cartItem.deleteMany(),
      prisma.cart.deleteMany(),
      prisma.storeProduct.deleteMany(),
      prisma.product.deleteMany(),
      prisma.store.deleteMany(),
      prisma.brand.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'api-test@example.com',
        name: 'API Test User',
        passwordHash: 'hashedpassword123',
        dateOfBirth: new Date('1990-01-01'),
        ageVerified: true,
      },
    });
    testUserId = testUser.id;

    // Create test brand
    const testBrand = await prisma.brand.create({
      data: {
        name: 'API Test Brand',
        slug: 'api-test-brand',
      },
    });
    testBrandId = testBrand.id;

    // Create test store
    const testStore = await prisma.store.create({
      data: {
        name: 'API Test Store',
        slug: 'api-test-store',
        brandId: testBrandId,
        state: 'CA',
        city: 'Los Angeles',
      },
    });
    testStoreId = testStore.id;

    // Mock auth token
    authToken = 'mock-jwt-token';
  });

  afterEach(async () => {
    await prisma.$transaction([
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.cartItem.deleteMany(),
      prisma.cart.deleteMany(),
      prisma.storeProduct.deleteMany(),
      prisma.product.deleteMany(),
      prisma.store.deleteMany(),
      prisma.brand.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  });

  describe('Health & Status Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return API version info', async () => {
      const response = await request(app).get('/api/v1');

      expect(response.status).toBe(200);
      expect(response.body.name).toBeDefined();
      expect(response.body.version).toBeDefined();
    });
  });

  describe('Stores API', () => {
    it('should list all stores', async () => {
      const response = await request(app).get('/api/v1/stores');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.stores)).toBe(true);
      expect(response.body.stores).toHaveLength(1);
      expect(response.body.stores[0].name).toBe('API Test Store');
    });

    it('should get store by ID', async () => {
      const response = await request(app).get(`/api/v1/stores/${testStoreId}`);

      expect(response.status).toBe(200);
      expect(response.body.store.id).toBe(testStoreId);
      expect(response.body.store.name).toBe('API Test Store');
    });

    it('should return 404 for nonexistent store', async () => {
      const response = await request(app).get('/api/v1/stores/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });

    it('should search stores by location', async () => {
      const response = await request(app).get('/api/v1/stores').query({ city: 'Los Angeles' });

      expect(response.status).toBe(200);
      expect(response.body.stores).toHaveLength(1);
      expect(response.body.stores[0].city).toBe('Los Angeles');
    });
  });

  describe('Products API', () => {
    let productId: string;

    beforeEach(async () => {
      // Create test product
      const product = await prisma.product.create({
        data: {
          name: 'API Test Product',
          slug: 'api-test-product',
          description: 'Test product for API',
          category: 'Flower',
          defaultPrice: 25.0,
          thcPercent: 20.0,
        },
      });
      productId = product.id;

      // Add to store
      await prisma.storeProduct.create({
        data: {
          storeId: testStoreId,
          productId: productId,
          price: 25.0,
          stock: 10,
        },
      });
    });

    it('should list all products', async () => {
      const response = await request(app).get('/api/v1/products');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.products)).toBe(true);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].name).toBe('API Test Product');
    });

    it('should get product by ID', async () => {
      const response = await request(app).get(`/api/v1/products/${productId}`);

      expect(response.status).toBe(200);
      expect(response.body.product.id).toBe(productId);
      expect(response.body.product.name).toBe('API Test Product');
    });

    it('should filter products by category', async () => {
      const response = await request(app).get('/api/v1/products').query({ category: 'Flower' });

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].category).toBe('Flower');
    });

    it('should search products by name', async () => {
      const response = await request(app).get('/api/v1/products').query({ search: 'API Test' });

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].name).toContain('API Test');
    });

    it('should return 404 for nonexistent product', async () => {
      const response = await request(app).get('/api/v1/products/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Cart API', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Cart Test Product',
          slug: 'cart-test-product',
          category: 'Flower',
          defaultPrice: 30.0,
        },
      });
      productId = product.id;

      await prisma.storeProduct.create({
        data: {
          storeId: testStoreId,
          productId: productId,
          price: 30.0,
          stock: 5,
        },
      });
    });

    it('should add item to cart', async () => {
      const response = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: productId,
          quantity: 2,
          storeId: testStoreId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should get cart contents', async () => {
      // Add item first
      await request(app).post('/api/v1/cart/add').set('Authorization', `Bearer ${authToken}`).send({
        productId: productId,
        quantity: 1,
        storeId: testStoreId,
      });

      const response = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].productId).toBe(productId);
      expect(response.body.items[0].quantity).toBe(1);
    });

    it('should update cart item quantity', async () => {
      // Add item first
      await request(app).post('/api/v1/cart/add').set('Authorization', `Bearer ${authToken}`).send({
        productId: productId,
        quantity: 1,
        storeId: testStoreId,
      });

      const response = await request(app)
        .put('/api/v1/cart/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: productId,
          quantity: 3,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify quantity updated
      const cartResponse = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(cartResponse.body.items[0].quantity).toBe(3);
    });

    it('should remove item from cart', async () => {
      // Add item first
      await request(app).post('/api/v1/cart/add').set('Authorization', `Bearer ${authToken}`).send({
        productId: productId,
        quantity: 1,
        storeId: testStoreId,
      });

      const response = await request(app)
        .delete('/api/v1/cart/remove')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: productId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify item removed
      const cartResponse = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(cartResponse.body.items).toHaveLength(0);
    });

    it('should clear entire cart', async () => {
      // Add multiple items
      await request(app).post('/api/v1/cart/add').set('Authorization', `Bearer ${authToken}`).send({
        productId: productId,
        quantity: 2,
        storeId: testStoreId,
      });

      const response = await request(app)
        .delete('/api/v1/cart/clear')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify cart is empty
      const cartResponse = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(cartResponse.body.items).toHaveLength(0);
    });
  });

  describe('Orders API', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Order Test Product',
          slug: 'order-test-product',
          category: 'Edibles',
          defaultPrice: 20.0,
          thcMgPerUnit: 10,
        },
      });
      productId = product.id;

      await prisma.storeProduct.create({
        data: {
          storeId: testStoreId,
          productId: productId,
          price: 20.0,
          stock: 20,
        },
      });
    });

    it('should create new order', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storeId: testStoreId,
          paymentMethod: 'pay_at_pickup',
          items: [
            {
              productId: productId,
              quantity: 2,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.order).toBeDefined();
      expect(response.body.order.status).toBe('CREATED');
    });

    it('should get user orders', async () => {
      // Create an order first
      await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storeId: testStoreId,
          paymentMethod: 'pay_at_pickup',
          items: [{ productId: productId, quantity: 1 }],
        });

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.orders)).toBe(true);
      expect(response.body.orders).toHaveLength(1);
    });

    it('should get order by ID', async () => {
      // Create order
      const createResponse = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storeId: testStoreId,
          paymentMethod: 'pay_at_pickup',
          items: [{ productId: productId, quantity: 1 }],
        });

      const orderId = createResponse.body.order.id;

      const response = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.order.id).toBe(orderId);
      expect(response.body.order.items).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthorized requests', async () => {
      const response = await request(app).get('/api/v1/cart');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid request data', async () => {
      const response = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          quantity: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should handle server errors gracefully', async () => {
      // Test with invalid UUID format
      const response = await request(app).get('/api/v1/products/invalid-uuid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });
});
