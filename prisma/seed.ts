import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a demo company
  const company = await prisma.company.create({
    data: {
      name: 'Demo Corp',
    },
  });

  // Create a demo user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      password: hashedPassword,
      companyId: company.id,
      role: 'admin',
    },
  });

  // Create a demo product
  const product = await prisma.product.create({
    data: {
      name: 'Classic T-Shirt',
      brand: 'InventoryTailor',
      category: 'Apparel',
      description: 'A high-quality cotton t-shirt.',
      companyId: company.id,
    },
  });

  // Create variations
  const variation1 = await prisma.variation.create({
    data: {
      productId: product.id,
      companyId: company.id,
      sku: 'TSHIRT-L-BLUE',
      size: 'Large',
      color: 'Blue',
      price: 29.99,
      cost: 12.50,
      stockCurrent: 50,
      stockMin: 10,
    },
  });

  const variation2 = await prisma.variation.create({
    data: {
      productId: product.id,
      companyId: company.id,
      sku: 'TSHIRT-M-RED',
      size: 'Medium',
      color: 'Red',
      price: 29.99,
      cost: 12.50,
      stockCurrent: 5,
      stockMin: 10,
    },
  });

  // Create initial movements
  await prisma.movement.createMany({
    data: [
      {
        companyId: company.id,
        variationId: variation1.id,
        type: 'in',
        quantity: 50,
        performedBy: user.id,
      },
      {
        companyId: company.id,
        variationId: variation2.id,
        type: 'in',
        quantity: 5,
        performedBy: user.id,
      },
    ],
  });

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
