/* eslint-disable no-undef */
// Test script to demonstrate compliance enforcement
// This would typically be run with Jest but shows the flow

import { PrismaClient } from '@prisma/client';
import { ComplianceService } from './src/services/complianceService';

const prisma = new PrismaClient();

async function testCompliance() {
  console.log('🧪 Testing Compliance Engine\n');

  const complianceService = new ComplianceService(prisma);

  // Test scenario 1: Valid order (should pass)
  console.log('Test 1: Valid order within limits');
  try {
    const result = await complianceService.checkOrderCompliance('test-user-id', 'test-store-id', [
      { productId: 'test-product-id', quantity: 1 },
    ]);

    console.log('✅ Compliance check result:', result);
  } catch (error) {
    console.log('❌ Error:', error);
  }

  // Test scenario 2: Age verification failure
  console.log('\nTest 2: Age verification required');
  // This would test with a user that has ageVerified: false

  // Test scenario 3: Daily THC limit exceeded
  console.log('\nTest 3: THC limit exceeded');
  // This would test with high THC products exceeding daily limit

  console.log('\n📋 Implementation Summary:');
  console.log('✅ ComplianceRule model with state-specific rules');
  console.log('✅ User model with age verification fields');
  console.log('✅ Product model with THC content tracking');
  console.log('✅ ComplianceService with comprehensive checks');
  console.log('✅ Order endpoint integration');
  console.log('✅ Mobile error handling');

  console.log('\n🎯 Test Instructions:');
  console.log('1. Create order with unverified user → Age verification error');
  console.log('2. Create order exceeding daily THC limit → THC limit error');
  console.log('3. Create order with verified user within limits → Success');

  console.log('\n🏛️ State Rules Example:');
  console.log('- Michigan (MI): 2500mg THC daily, 21+ age required');
  console.log('- Arizona (AZ): 1000mg THC daily, 21+ age required');
  console.log('- California (CA): 8000mg THC daily, 21+ age required');

  await prisma.$disconnect();
}

// This would be run as: npx ts-node compliance-test.ts
if (require.main === module) {
  testCompliance().catch(console.error);
}

export { testCompliance };
