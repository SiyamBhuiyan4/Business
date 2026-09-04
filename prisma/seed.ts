import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean database
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.adminPermission.deleteMany();
  await prisma.adminBusinessAccess.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  const superAdminPasswordHash = await bcrypt.hash('Siy@m@123', 10);
  const sampleAdminPasswordHash = await bcrypt.hash('Admin@123', 10);

  // 1. Create Users
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin (Owner)',
      email: 'myempire.rise',
      passwordHash: superAdminPasswordHash,
      role: 'SUPER_ADMIN',
    },
  });

  const mushroomAdmin = await prisma.user.create({
    data: {
      name: 'Rahim (Mushroom Admin)',
      email: 'mushroom.admin@example.com',
      passwordHash: sampleAdminPasswordHash,
      role: 'ADMIN',
    },
  });


  // 2. Create Businesses
  const mushroomBiz = await prisma.business.create({
    data: {
      name: 'Mushroom Farm & Supply',
      slug: 'mushroom',
      icon: 'sprout',
      color: 'emerald',
    },
  });

  const potatoBiz = await prisma.business.create({
    data: {
      name: 'Potato Agribusiness',
      slug: 'potato',
      icon: 'package',
      color: 'amber',
    },
  });

  // 3. Assign Admin Business Access & Permissions
  // Mushroom Admin Access
  await prisma.adminBusinessAccess.create({
    data: {
      userId: mushroomAdmin.id,
      businessId: mushroomBiz.id,
    },
  });

  const permKeys = ['orders:view', 'sales:view'];

  for (const key of permKeys) {
    await prisma.adminPermission.create({
      data: {
        userId: mushroomAdmin.id,
        businessId: mushroomBiz.id,
        permissionKey: key,
        enabled: true,
      },
    });
  }


  // 4. Create Products
  const mushroomProducts = await Promise.all([
    prisma.product.create({
      data: {
        businessId: mushroomBiz.id,
        name: 'Fresh Oyster Mushroom',
        unitPrice: 250,
        sku: 'MUSH-OYSTER-01',
      },
    }),
    prisma.product.create({
      data: {
        businessId: mushroomBiz.id,
        name: 'Button Mushroom (White)',
        unitPrice: 400,
        sku: 'MUSH-BTN-02',
      },
    }),
    prisma.product.create({
      data: {
        businessId: mushroomBiz.id,
        name: 'Organic Shiitake Mushroom',
        unitPrice: 850,
        sku: 'MUSH-SHI-03',
      },
    }),
    prisma.product.create({
      data: {
        businessId: mushroomBiz.id,
        name: 'King Oyster Mushroom',
        unitPrice: 650,
        sku: 'MUSH-KING-04',
      },
    }),
  ]);

  const potatoProducts = await Promise.all([
    prisma.product.create({
      data: {
        businessId: potatoBiz.id,
        name: 'Granola Potato (Standard Grade)',
        unitPrice: 45,
        sku: 'POT-GRANOLA-01',
      },
    }),
    prisma.product.create({
      data: {
        businessId: potatoBiz.id,
        name: 'Red Asterix Potato',
        unitPrice: 55,
        sku: 'POT-RED-02',
      },
    }),
    prisma.product.create({
      data: {
        businessId: potatoBiz.id,
        name: 'Organic Sweet Potato',
        unitPrice: 90,
        sku: 'POT-SWEET-03',
      },
    }),
    prisma.product.create({
      data: {
        businessId: potatoBiz.id,
        name: 'Yukon Gold Premium Potato',
        unitPrice: 75,
        sku: 'POT-YUKON-04',
      },
    }),
  ]);

  // 5. Generate Orders for Mushroom Business
  const customers = [
    { name: 'Dhanmondi Super Shop', contact: '01711223344', address: 'Road 8A, Dhanmondi, Dhaka' },
    { name: 'Gulshan Gourmet Grocer', contact: '01899887766', address: 'Avenue 2, Gulshan 1, Dhaka' },
    { name: 'Uttara Agro Market', contact: '01912345678', address: 'Sector 4, Uttara, Dhaka' },
    { name: 'Banani Chef Supplies', contact: '01655443322', address: 'Block C, Banani, Dhaka' },
    { name: 'Chittagong Fresh Market', contact: '01511224466', address: 'GEC Circle, Chattogram' },
    { name: 'Sylhet Organic Hub', contact: '01700998877', address: 'Zindabazar, Sylhet' },
    { name: 'Mirpur Wholesale Depot', contact: '01311223355', address: 'Section 10, Mirpur, Dhaka' },
  ];

  const now = new Date();

  // We create orders across the last 14 days and upcoming 3 days
  for (let dayOffset = -14; dayOffset <= 3; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + dayOffset);

    // Make day -3 a HIGH VOLUME day (>10 orders) for Mushroom to show the 🔥 icon overlay!
    const orderCountForDay = dayOffset === -3 ? 12 : Math.floor(Math.random() * 4) + 1;

    for (let i = 0; i < orderCountForDay; i++) {
      const cust = customers[Math.floor(Math.random() * customers.length)];
      const isMixed = i % 2 === 0;
      const status = dayOffset < 0 ? (i % 5 === 0 ? 'CANCELLED' : 'DELIVERED') : (i % 2 === 0 ? 'PENDING' : 'IN_PROGRESS');

      const expectedDelDate = new Date(targetDate);
      expectedDelDate.setHours(10 + (i % 8), 30, 0, 0);

      const createdDate = new Date(targetDate);
      createdDate.setHours(8 + (i % 6), 15, 0, 0);

      let items = [];
      let totalAmount = 0;

      if (!isMixed) {
        // Single product
        const prod = mushroomProducts[i % mushroomProducts.length];
        const qty = Math.floor(Math.random() * 15) + 5;
        const price = prod.unitPrice;
        items.push({ productId: prod.id, quantity: qty, priceAtOrder: price });
        totalAmount = qty * price;
      } else {
        // Mixed products
        const p1 = mushroomProducts[0];
        const p2 = mushroomProducts[1];
        const qty1 = Math.floor(Math.random() * 10) + 2;
        const qty2 = Math.floor(Math.random() * 8) + 2;
        items.push({ productId: p1.id, quantity: qty1, priceAtOrder: p1.unitPrice });
        items.push({ productId: p2.id, quantity: qty2, priceAtOrder: p2.unitPrice });
        totalAmount = qty1 * p1.unitPrice + qty2 * p2.unitPrice;
      }

      await prisma.order.create({
        data: {
          businessId: mushroomBiz.id,
          createdByUserId: i % 2 === 0 ? mushroomAdmin.id : superAdmin.id,
          customerName: cust.name,
          customerContact: cust.contact,
          deliveryAddress: cust.address,
          expectedDeliveryDate: expectedDelDate,
          status,
          orderType: isMixed ? 'MIXED' : 'SINGLE',
          totalAmount,
          notes: i % 3 === 0 ? 'Deliver before 12 PM please' : 'Handle with care',
          createdAt: createdDate,
          items: {
            create: items,
          },
        },
      });
    }
  }

  // 6. Generate Orders for Potato Business
  for (let dayOffset = -14; dayOffset <= 3; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + dayOffset);

    // Make day -5 a HIGH VOLUME day (>10 orders) for Potato to show the 🔥 icon overlay!
    const orderCountForDay = dayOffset === -5 ? 11 : Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < orderCountForDay; i++) {
      const cust = customers[Math.floor(Math.random() * customers.length)];
      const isMixed = i % 3 === 0;
      const status = dayOffset < 0 ? 'DELIVERED' : 'PENDING';

      const expectedDelDate = new Date(targetDate);
      expectedDelDate.setHours(9 + (i % 9), 0, 0, 0);

      const createdDate = new Date(targetDate);
      createdDate.setHours(7 + (i % 5), 0, 0, 0);

      let items = [];
      let totalAmount = 0;

      if (!isMixed) {
        const prod = potatoProducts[i % potatoProducts.length];
        const qty = Math.floor(Math.random() * 100) + 20; // kg
        items.push({ productId: prod.id, quantity: qty, priceAtOrder: prod.unitPrice });
        totalAmount = qty * prod.unitPrice;
      } else {
        const p1 = potatoProducts[0];
        const p2 = potatoProducts[2];
        const q1 = 50;
        const q2 = 30;
        items.push({ productId: p1.id, quantity: q1, priceAtOrder: p1.unitPrice });
        items.push({ productId: p2.id, quantity: q2, priceAtOrder: p2.unitPrice });
        totalAmount = q1 * p1.unitPrice + q2 * p2.unitPrice;
      }

      await prisma.order.create({
        data: {
          businessId: potatoBiz.id,
          createdByUserId: superAdmin.id,
          customerName: cust.name,
          customerContact: cust.contact,
          deliveryAddress: cust.address,
          expectedDeliveryDate: expectedDelDate,
          status,
          orderType: isMixed ? 'MIXED' : 'SINGLE',
          totalAmount,
          notes: 'Standard sack packaging',
          createdAt: createdDate,
          items: {
            create: items,
          },
        },
      });
    }
  }

  console.log('✅ Seeding complete!');
  console.log('------------------------------------------------');
  console.log('SUPER ADMIN CREDENTIALS:');
  console.log('Email: myempire.rise');
  console.log('Password: Siy@m@123');
  console.log('------------------------------------------------');
  console.log('SAMPLE ADMIN CREDENTIALS:');
  console.log('Mushroom Admin: mushroom.admin@example.com / Admin@123');
  console.log('------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
