import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = [
    {
      slug: 'product-1',
      title: 'Body Mass Gainer',
      description: 'High-calorie mass gainer with 50g protein and complex carbs.',
      image: '/image/1.png',
      price: 459900, // ₹4599 in paise
      mrp: 459900,
      stock: 50,
      tag: 'Bulk Up',
      badge: 'Best Seller',
    },
    {
      slug: 'product-2',
      title: 'Whey Protein 100%',
      description: 'Premium whey protein isolate. 27g protein per scoop.',
      image: '/image/2.png',
      price: 119900,
      mrp: 149900,
      stock: 100,
      tag: 'Recovery',
      badge: 'Limited',
    },
    {
      slug: 'product-3',
      title: 'Pre Workout',
      description: 'Explosive energy and focus for intense training sessions.',
      image: '/image/3.png',
      price: 229900,
      mrp: 299900,
      stock: 75,
      tag: 'Performance',
    },
    {
      slug: 'product-4',
      title: 'Nitro Blast',
      description: 'Daily health booster with essential nutrients.',
      image: '/image/4.png',
      price: 79900,
      mrp: 99900,
      stock: 200,
      tag: 'Daily Health',
      badge: 'New',
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }

  console.log('Seeded', products.length, 'products');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
