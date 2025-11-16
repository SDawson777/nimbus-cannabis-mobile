// Demo seed script for JARS Cannabis Mobile App
// Creates comprehensive fake data for testing and demonstration

import { PrismaClient, ProductCategory, StrainType, OrderStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Check for demo mode
const isDemoMode = process.env.DEMO_MODE === 'true' || process.argv.includes('--demo');
const isVerbose = process.env.DEBUG === 'true' || process.argv.includes('--verbose');

function log(message: string) {
  if (isVerbose) {
    console.log(`🌱 ${message}`);
  }
}

async function seedDemoBrands() {
  log('Creating demo brands...');

  const demoBrand1 = await prisma.brand.upsert({
    where: { slug: 'green-leaf-demo' },
    update: {},
    create: {
      name: 'Green Leaf Demo',
      slug: 'green-leaf-demo',
      primaryColor: '#22C55E',
      secondaryColor: '#16A34A',
      logoUrl: 'https://via.placeholder.com/200x200/22C55E/FFFFFF?text=GL',
    },
  });

  const demoBrand2 = await prisma.brand.upsert({
    where: { slug: 'sample-dispensary' },
    update: {},
    create: {
      name: 'Sample Dispensary',
      slug: 'sample-dispensary',
      primaryColor: '#8B5CF6',
      secondaryColor: '#7C3AED',
      logoUrl: 'https://via.placeholder.com/200x200/8B5CF6/FFFFFF?text=SD',
    },
  });

  return { demoBrand1, demoBrand2 };
}

async function seedDemoStores(brands: any) {
  log('Creating demo stores...');

  const stores = [];

  // Green Leaf Demo stores
  const glStore1 = await prisma.store.upsert({
    where: { slug: 'green-leaf-downtown-demo' },
    update: { brandId: brands.demoBrand1.id },
    create: {
      name: 'Green Leaf Downtown (Demo)',
      slug: 'green-leaf-downtown-demo',
      brandId: brands.demoBrand1.id,
      address1: '123 Demo Street',
      address2: 'Suite 100',
      city: 'Demo City',
      state: 'CA',
      postalCode: '90210',
      country: 'US',
      latitude: 34.0522,
      longitude: -118.2437,
      phone: '(555) 123-DEMO',
      hours: {
        monday: [{ open: '08:00', close: '22:00' }],
        tuesday: [{ open: '08:00', close: '22:00' }],
        wednesday: [{ open: '08:00', close: '22:00' }],
        thursday: [{ open: '08:00', close: '22:00' }],
        friday: [{ open: '08:00', close: '23:00' }],
        saturday: [{ open: '09:00', close: '23:00' }],
        sunday: [{ open: '10:00', close: '21:00' }],
      },
    },
  });

  const glStore2 = await prisma.store.upsert({
    where: { slug: 'green-leaf-westside-demo' },
    update: { brandId: brands.demoBrand1.id },
    create: {
      name: 'Green Leaf Westside (Demo)',
      slug: 'green-leaf-westside-demo',
      brandId: brands.demoBrand1.id,
      address1: '456 Sample Avenue',
      city: 'Sample City',
      state: 'CA',
      postalCode: '90211',
      country: 'US',
      latitude: 34.0622,
      longitude: -118.2537,
      phone: '(555) 456-DEMO',
      hours: {
        monday: [{ open: '09:00', close: '21:00' }],
        tuesday: [{ open: '09:00', close: '21:00' }],
        wednesday: [{ open: '09:00', close: '21:00' }],
        thursday: [{ open: '09:00', close: '21:00' }],
        friday: [{ open: '09:00', close: '22:00' }],
        saturday: [{ open: '10:00', close: '22:00' }],
        sunday: [{ open: '11:00', close: '20:00' }],
      },
    },
  });

  // Sample Dispensary stores
  const sdStore1 = await prisma.store.upsert({
    where: { slug: 'sample-dispensary-main-demo' },
    update: { brandId: brands.demoBrand2.id },
    create: {
      name: 'Sample Dispensary Main (Demo)',
      slug: 'sample-dispensary-main-demo',
      brandId: brands.demoBrand2.id,
      address1: '789 Test Boulevard',
      city: 'Test Town',
      state: 'AZ',
      postalCode: '85001',
      country: 'US',
      latitude: 33.4484,
      longitude: -112.074,
      phone: '(555) 789-TEST',
      hours: {
        monday: [{ open: '07:00', close: '21:00' }],
        tuesday: [{ open: '07:00', close: '21:00' }],
        wednesday: [{ open: '07:00', close: '21:00' }],
        thursday: [{ open: '07:00', close: '21:00' }],
        friday: [{ open: '07:00', close: '22:00' }],
        saturday: [{ open: '08:00', close: '22:00' }],
        sunday: [{ open: '09:00', close: '20:00' }],
      },
    },
  });

  stores.push(glStore1, glStore2, sdStore1);
  return stores;
}

async function seedDemoProducts() {
  log('Creating demo products...');

  const products = [];

  // Flower products
  const flowerProducts = [
    {
      name: 'Blue Dream Demo',
      slug: 'blue-dream-demo',
      brand: 'Green Leaf Demo',
      category: ProductCategory.Flower,
      strainType: StrainType.Sativa,
      description:
        'A balanced sativa-dominant hybrid with sweet berry aroma. Perfect for daytime use. (Demo Product)',
      defaultPrice: 35,
      thcPercent: 18.5,
      cbdPercent: 0.8,
      thcMgPerUnit: 648, // 3.5g * 18.5% = 648mg
      terpenes: ['myrcene', 'pinene', 'limonene'],
    },
    {
      name: 'OG Kush Sample',
      slug: 'og-kush-sample',
      brand: 'Sample Dispensary',
      category: ProductCategory.Flower,
      strainType: StrainType.Indica,
      description:
        'Classic indica with earthy pine flavors and relaxing effects. Great for evening use. (Sample Product)',
      defaultPrice: 40,
      thcPercent: 22.3,
      cbdPercent: 0.5,
      thcMgPerUnit: 780, // 3.5g * 22.3% = 780mg
      terpenes: ['myrcene', 'caryophyllene', 'limonene'],
    },
    {
      name: 'Girl Scout Cookies Demo',
      slug: 'gsc-demo',
      brand: 'Green Leaf Demo',
      category: ProductCategory.Flower,
      strainType: StrainType.Hybrid,
      description: 'Sweet and earthy hybrid with euphoric and relaxing effects. (Demo Product)',
      defaultPrice: 42,
      thcPercent: 20.1,
      cbdPercent: 0.7,
      thcMgPerUnit: 704, // 3.5g * 20.1% = 704mg
      terpenes: ['caryophyllene', 'limonene', 'myrcene'],
    },
  ];

  // Pre-roll products
  const preRollProducts = [
    {
      name: 'Sativa Sunrise Pre-Roll (Demo)',
      slug: 'sativa-sunrise-preroll-demo',
      brand: 'Green Leaf Demo',
      category: ProductCategory.PreRoll,
      strainType: StrainType.Sativa,
      description:
        'Energizing sativa blend perfect for starting your day. 1g pre-roll. (Demo Product)',
      defaultPrice: 12,
      thcPercent: 19.2,
      cbdPercent: 0.3,
      thcMgPerUnit: 192, // 1g * 19.2% = 192mg
      terpenes: ['limonene', 'pinene'],
    },
    {
      name: 'Indica Night Cap (Sample)',
      slug: 'indica-nightcap-sample',
      brand: 'Sample Dispensary',
      category: ProductCategory.PreRoll,
      strainType: StrainType.Indica,
      description: 'Relaxing indica for winding down. 1g premium pre-roll. (Sample Product)',
      defaultPrice: 14,
      thcPercent: 21.5,
      cbdPercent: 0.9,
      thcMgPerUnit: 215, // 1g * 21.5% = 215mg
      terpenes: ['myrcene', 'caryophyllene'],
    },
  ];

  // Edibles products
  const edibleProducts = [
    {
      name: 'Berry Blast Gummies (Demo)',
      slug: 'berry-blast-gummies-demo',
      brand: 'Green Leaf Demo',
      category: ProductCategory.Edibles,
      strainType: StrainType.Hybrid,
      description: 'Delicious mixed berry gummies. 10mg THC each, 10-pack. (Demo Product)',
      defaultPrice: 25,
      thcPercent: null,
      cbdPercent: null,
      thcMgPerUnit: 100, // 10mg * 10 pieces = 100mg
      terpenes: [],
    },
    {
      name: 'Chocolate Chip Cookies (Sample)',
      slug: 'choc-chip-cookies-sample',
      brand: 'Sample Dispensary',
      category: ProductCategory.Edibles,
      strainType: StrainType.Indica,
      description:
        'Homestyle chocolate chip cookies infused with premium cannabis. 25mg each. (Sample Product)',
      defaultPrice: 18,
      thcPercent: null,
      cbdPercent: null,
      thcMgPerUnit: 50, // 25mg * 2 cookies = 50mg
      terpenes: [],
    },
  ];

  // Vape products
  const vapeProducts = [
    {
      name: 'Citrus Haze Cart (Demo)',
      slug: 'citrus-haze-cart-demo',
      brand: 'Green Leaf Demo',
      category: ProductCategory.Vape,
      strainType: StrainType.Sativa,
      description:
        'Uplifting citrus flavored vape cartridge. 0.5g premium distillate. (Demo Product)',
      defaultPrice: 45,
      thcPercent: 87.5,
      cbdPercent: 2.1,
      thcMgPerUnit: 437.5, // 0.5g * 87.5% = 437.5mg
      terpenes: ['limonene', 'pinene', 'terpinolene'],
    },
    {
      name: 'Purple Punch Vape (Sample)',
      slug: 'purple-punch-vape-sample',
      brand: 'Sample Dispensary',
      category: ProductCategory.Vape,
      strainType: StrainType.Indica,
      description: 'Relaxing grape and berry flavored indica vape. 1g cartridge. (Sample Product)',
      defaultPrice: 65,
      thcPercent: 84.2,
      cbdPercent: 1.8,
      thcMgPerUnit: 842, // 1g * 84.2% = 842mg
      terpenes: ['myrcene', 'caryophyllene', 'pinene'],
    },
  ];

  // Concentrate products
  const concentrateProducts = [
    {
      name: 'Live Resin Dab (Demo)',
      slug: 'live-resin-dab-demo',
      brand: 'Green Leaf Demo',
      category: ProductCategory.Concentrate,
      strainType: StrainType.Hybrid,
      description:
        'Fresh frozen live resin with full terpene profile. 1g premium concentrate. (Demo Product)',
      defaultPrice: 80,
      thcPercent: 78.9,
      cbdPercent: 3.2,
      thcMgPerUnit: 789, // 1g * 78.9% = 789mg
      terpenes: ['myrcene', 'limonene', 'caryophyllene', 'pinene'],
    },
  ];

  const allProducts = [
    ...flowerProducts,
    ...preRollProducts,
    ...edibleProducts,
    ...vapeProducts,
    ...concentrateProducts,
  ];

  for (const productData of allProducts) {
    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {},
      create: productData,
    });
    products.push(product);
  }

  return products;
}

async function seedDemoUsers() {
  log('Creating demo users...');

  const users = [];
  const passwordHash = await bcrypt.hash('demo123', 10);

  // Admin demo user
  const adminUser = await prisma.user.upsert({
    where: { email: 'demo+admin@example.com' },
    update: {},
    create: {
      email: 'demo+admin@example.com',
      name: 'Demo Admin',
      phone: '(555) 000-ADMIN',
      passwordHash,
      dateOfBirth: new Date('1985-06-15'),
      ageVerified: true,
    },
  });

  // Regular demo users
  const demoUsers = [
    {
      email: 'demo+user@example.com',
      name: 'Demo User',
      phone: '(555) 000-USER',
      dateOfBirth: new Date('1990-03-22'),
    },
    {
      email: 'demo+sarah@example.com',
      name: 'Sarah Demo',
      phone: '(555) 000-SARAH',
      dateOfBirth: new Date('1988-11-08'),
    },
    {
      email: 'demo+mike@example.com',
      name: 'Mike Demo',
      phone: '(555) 000-MIKE',
      dateOfBirth: new Date('1992-07-14'),
    },
    {
      email: 'demo+jessica@example.com',
      name: 'Jessica Demo',
      phone: '(555) 000-JESS',
      dateOfBirth: new Date('1987-12-03'),
    },
  ];

  for (const userData of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        passwordHash,
        ageVerified: true,
      },
    });
    users.push(user);
  }

  users.push(adminUser);
  return users;
}

async function seedDemoOrders(users: any[], stores: any[], products: any[]) {
  log('Creating demo orders...');

  // Create some sample orders for demo users
  const orders = [];

  for (let i = 0; i < 8; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomStore = stores[Math.floor(Math.random() * stores.length)];
    const randomProducts = products
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 3) + 1);

    let subtotal = 0;
    const orderItems = randomProducts.map(product => {
      const quantity = Math.floor(Math.random() * 2) + 1;
      const price = product.defaultPrice || 25;
      const lineTotal = price * quantity;
      subtotal += lineTotal;

      return {
        productId: product.id,
        quantity,
        unitPrice: price,
        lineTotal,
      };
    });

    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const order = await prisma.order.create({
      data: {
        userId: randomUser.id,
        storeId: randomStore.id,
        status: i < 6 ? OrderStatus.COMPLETED : OrderStatus.READY,
        paymentMethod: 'pay_at_pickup',
        contactName: randomUser.name,
        contactPhone: randomUser.phone,
        contactEmail: randomUser.email,
        subtotal,
        tax,
        total,
        items: {
          create: orderItems,
        },
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      },
    });

    orders.push(order);
  }

  return orders;
}

async function seedDemoCompliance() {
  log('Creating demo compliance rules...');

  // Demo compliance rules for the states where our demo stores are located
  await prisma.complianceRule.upsert({
    where: { stateCode: 'CA' },
    update: {},
    create: {
      stateCode: 'CA',
      maxDailyTHCMg: 8000, // California demo limit
      mustVerifyAge: true,
      minAge: 21,
    },
  });

  await prisma.complianceRule.upsert({
    where: { stateCode: 'AZ' },
    update: {},
    create: {
      stateCode: 'AZ',
      maxDailyTHCMg: 2500, // Arizona demo limit
      mustVerifyAge: true,
      minAge: 21,
    },
  });
}

async function main() {
  if (!isDemoMode) {
    console.log('🌱 Running standard seed...');

    // Run the original seed logic here
    // This would include the existing JARS brand, basic stores, etc.
    console.log('Standard seed completed. Use DEMO_MODE=true or --demo for demo data.');
    return;
  }

  console.log('🎭 Running DEMO seed...');
  console.log('Creating comprehensive demo data for testing...\n');

  try {
    // Clean existing demo data if it exists
    log('Cleaning existing demo data...');
    await prisma.order.deleteMany({
      where: {
        user: {
          email: { contains: 'demo' },
        },
      },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'demo' } },
    });

    // Create demo data
    const brands = await seedDemoBrands();
    const stores = await seedDemoStores(brands);
    const products = await seedDemoProducts();
    const users = await seedDemoUsers();
    await seedDemoCompliance();
    const orders = await seedDemoOrders(users, stores, products);

    console.log('\n🎉 Demo seed completed successfully!');
    console.log('\n📊 Demo Data Summary:');
    console.log(`   • 2 Demo Brands`);
    console.log(`   • ${stores.length} Demo Stores`);
    console.log(`   • ${products.length} Demo Products`);
    console.log(`   • ${users.length} Demo Users`);
    console.log(`   • ${orders.length} Demo Orders`);

    console.log('\n🔐 Demo Credentials:');
    console.log('   Admin: demo+admin@example.com / demo123');
    console.log('   User:  demo+user@example.com / demo123');
    console.log('   More:  demo+sarah@example.com / demo123');
    console.log('          demo+mike@example.com / demo123');
    console.log('          demo+jessica@example.com / demo123');

    console.log('\n🚀 Next Steps:');
    console.log('   1. Start your mobile app: npx expo start');
    console.log('   2. Set EXPO_PUBLIC_API_URL=http://localhost:3000');
    console.log('   3. Log in with any demo credentials above');
    console.log('   4. Explore the fully populated demo environment!');
  } catch (error) {
    console.error('Demo seed failed:', error);
    throw error;
  }
}

main()
  .catch(e => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
