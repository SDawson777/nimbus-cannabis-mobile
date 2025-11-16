// Integration tests for the Cannabis Compliance Engine
// Tests age verification, THC limits, and state-specific rules

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ComplianceService } from '../../src/services/complianceService';
import { prisma } from '../../src/prismaClient';

describe('Cannabis Compliance Engine Integration Tests', () => {
  let complianceService: ComplianceService;
  let testUserId: string;
  let testStoreId: string;
  let highTHCProductId: string;
  let lowTHCProductId: string;

  beforeEach(async () => {
    complianceService = new ComplianceService(prisma);

    // Clean database
    await prisma.$transaction([
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.storeProduct.deleteMany(),
      prisma.product.deleteMany(),
      prisma.store.deleteMany(),
      prisma.brand.deleteMany(),
      prisma.user.deleteMany(),
      prisma.complianceRule.deleteMany(),
    ]);

    // Create compliance rule for California
    await prisma.complianceRule.create({
      data: {
        stateCode: 'CA',
        minAge: 21,
        maxDailyTHCMg: 1000, // 1000mg THC per day limit
        mustVerifyAge: true,
      },
    });

    // Create test user (of legal age)
    const testUser = await prisma.user.create({
      data: {
        email: 'compliance-test@example.com',
        name: 'Compliance Test User',
        passwordHash: 'hashedpassword123',
        dateOfBirth: new Date('1990-01-01'),
        ageVerified: true,
      },
    });
    testUserId = testUser.id;

    // Create test brand and store
    const testBrand = await prisma.brand.create({
      data: {
        name: 'Compliance Test Brand',
        slug: 'compliance-test-brand',
      },
    });

    const testStore = await prisma.store.create({
      data: {
        name: 'CA Test Dispensary',
        slug: 'ca-test-dispensary',
        brandId: testBrand.id,
        state: 'CA',
        city: 'Los Angeles',
      },
    });
    testStoreId = testStore.id;

    // Create high THC product
    const highTHCProduct = await prisma.product.create({
      data: {
        name: 'High THC Flower',
        slug: 'high-thc-flower-compliance',
        description: 'High potency flower for testing',
        category: 'Flower',
        thcMgPerUnit: 800, // 800mg per unit
        defaultPrice: 50.0,
      },
    });
    highTHCProductId = highTHCProduct.id;

    // Create low THC product
    const lowTHCProduct = await prisma.product.create({
      data: {
        name: 'Low THC Edible',
        slug: 'low-thc-edible-compliance',
        description: 'Low dose edible for testing',
        category: 'Edibles',
        thcMgPerUnit: 10, // 10mg per unit
        defaultPrice: 15.0,
      },
    });
    lowTHCProductId = lowTHCProduct.id;

    // Create StoreProduct relationships
    await prisma.storeProduct.createMany({
      data: [
        {
          storeId: testStoreId,
          productId: highTHCProductId,
          price: 50.0,
          stock: 10,
        },
        {
          storeId: testStoreId,
          productId: lowTHCProductId,
          price: 15.0,
          stock: 100,
        },
      ],
    });
  });

  afterEach(async () => {
    await prisma.$transaction([
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.storeProduct.deleteMany(),
      prisma.product.deleteMany(),
      prisma.store.deleteMany(),
      prisma.brand.deleteMany(),
      prisma.user.deleteMany(),
      prisma.complianceRule.deleteMany(),
    ]);
  });

  describe('Age Verification Compliance', () => {
    it('should allow orders for verified users over 21', async () => {
      const result = await complianceService.checkOrderCompliance(testUserId, testStoreId, [
        { productId: lowTHCProductId, quantity: 1 },
      ]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject orders for unverified users', async () => {
      // Create unverified user
      const unverifiedUser = await prisma.user.create({
        data: {
          email: 'unverified@example.com',
          name: 'Unverified User',
          passwordHash: 'hashedpassword123',
          dateOfBirth: new Date('1990-01-01'),
          ageVerified: false, // Not verified
        },
      });

      const result = await complianceService.checkOrderCompliance(unverifiedUser.id, testStoreId, [
        { productId: lowTHCProductId, quantity: 1 },
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('AGE_NOT_VERIFIED');
    });

    it('should reject orders for underage users', async () => {
      // Create underage user
      const underageUser = await prisma.user.create({
        data: {
          email: 'underage@example.com',
          name: 'Underage User',
          passwordHash: 'hashedpassword123',
          dateOfBirth: new Date('2010-01-01'), // 15 years old
          ageVerified: true,
        },
      });

      const result = await complianceService.checkOrderCompliance(underageUser.id, testStoreId, [
        { productId: lowTHCProductId, quantity: 1 },
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('UNDERAGE');
    });
  });

  describe('THC Limit Compliance', () => {
    it('should allow orders within daily THC limit', async () => {
      // Order 500mg THC (within 1000mg limit)
      const result = await complianceService.checkOrderCompliance(
        testUserId,
        testStoreId,
        [{ productId: lowTHCProductId, quantity: 50 }] // 50 x 10mg = 500mg
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject orders exceeding daily THC limit', async () => {
      // Order 1600mg THC (exceeds 1000mg limit)
      const result = await complianceService.checkOrderCompliance(
        testUserId,
        testStoreId,
        [{ productId: highTHCProductId, quantity: 2 }] // 2 x 800mg = 1600mg
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DAILY_THC_LIMIT_EXCEEDED');
    });

    it('should track cumulative THC from existing orders', async () => {
      // Create existing order for 600mg THC today
      await prisma.order.create({
        data: {
          userId: testUserId,
          storeId: testStoreId,
          status: 'CONFIRMED',
          paymentMethod: 'pay_at_pickup',
          total: 30.0,
          createdAt: new Date(), // Today
          items: {
            create: {
              productId: lowTHCProductId,
              quantity: 60, // 60 x 10mg = 600mg THC
              unitPrice: 15.0,
            },
          },
        },
      });

      // Try to order another 500mg THC (total would be 1100mg, over 1000mg limit)
      const result = await complianceService.checkOrderCompliance(
        testUserId,
        testStoreId,
        [{ productId: lowTHCProductId, quantity: 50 }] // 50 x 10mg = 500mg
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DAILY_THC_LIMIT_EXCEEDED');
    });

    it('should allow orders with mixed products within limit', async () => {
      // Order mix: 1x high THC (800mg) + 19x low THC (190mg) = 990mg total
      const result = await complianceService.checkOrderCompliance(testUserId, testStoreId, [
        { productId: highTHCProductId, quantity: 1 }, // 800mg
        { productId: lowTHCProductId, quantity: 19 }, // 190mg
      ]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('State-Specific Rules', () => {
    it('should handle states without compliance rules', async () => {
      // Create store in a state without rules
      const texasBrand = await prisma.brand.create({
        data: {
          name: 'Texas Brand',
          slug: 'texas-brand-test',
        },
      });

      const texasStore = await prisma.store.create({
        data: {
          name: 'TX Test Store',
          slug: 'tx-test-store',
          brandId: texasBrand.id,
          state: 'TX', // No compliance rule for TX
          city: 'Austin',
        },
      });

      // Should allow the order (permissive default)
      const result = await complianceService.checkOrderCompliance(testUserId, texasStore.id, [
        { productId: lowTHCProductId, quantity: 1 },
      ]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should enforce different rules for different states', async () => {
      // Create strict compliance rule for Washington (lower THC limit)
      await prisma.complianceRule.create({
        data: {
          stateCode: 'WA',
          minAge: 21,
          maxDailyTHCMg: 500, // Stricter 500mg limit
          mustVerifyAge: true,
        },
      });

      const waBrand = await prisma.brand.create({
        data: {
          name: 'WA Brand',
          slug: 'wa-brand-test',
        },
      });

      const waStore = await prisma.store.create({
        data: {
          name: 'WA Test Store',
          slug: 'wa-test-store',
          brandId: waBrand.id,
          state: 'WA',
          city: 'Seattle',
        },
      });

      // Order that would be valid in CA (1000mg limit) but not WA (500mg limit)
      const result = await complianceService.checkOrderCompliance(
        testUserId,
        waStore.id,
        [{ productId: highTHCProductId, quantity: 1 }] // 800mg - exceeds WA limit
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DAILY_THC_LIMIT_EXCEEDED');
    });
  });

  describe('Error Handling', () => {
    it('should handle nonexistent user', async () => {
      const result = await complianceService.checkOrderCompliance(
        'nonexistent-user-id',
        testStoreId,
        [{ productId: lowTHCProductId, quantity: 1 }]
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('USER_NOT_FOUND');
    });

    it('should handle nonexistent store', async () => {
      const result = await complianceService.checkOrderCompliance(
        testUserId,
        'nonexistent-store-id',
        [{ productId: lowTHCProductId, quantity: 1 }]
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('STORE_STATE_UNKNOWN');
    });
  });
});
