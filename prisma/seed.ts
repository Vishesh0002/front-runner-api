import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Prices are stored in rupees (matching the frontend shop).
// Razorpay conversion to paise happens at payment creation time only.
const SHOP_PRODUCTS = [
  { slug: 'ps-product-1', title: 'Body Mass Gainer', image: '/image/muscle/mf2.png', price: 3700, mrp: 4180, tag: 'Bulk Up', badge: 'Best Seller' },
  { slug: 'ps-product-2', title: 'Whey Protein 100%', image: '/image/athletic/2.png', price: 4100, mrp: 4200, tag: 'Recovery', badge: 'Limited' },
  { slug: 'ps-product-3', title: 'Weight Gainer', image: '/image/biomax/bm2.png', price: 3200, mrp: 3795, tag: 'Bulk Up', badge: 'New' },
  { slug: 'ps-product-4', title: 'Body Mass Gainer', image: '/image/muscle/mf1.png', price: 3700, mrp: 4180, tag: 'Bulk Up', badge: 'Best Seller' },
  { slug: 'ps-product-5', title: 'Pre Workout', image: '/image/athletic/3.png', price: 1650, mrp: 1880, tag: 'Performance', badge: 'New' },
  { slug: 'ps-product-6', title: 'Ultra Pre Workout', image: '/image/muscle/mf3.png', price: 2000, mrp: 2150, tag: 'Performance' },
  { slug: 'ps-product-7', title: 'Premium Body Mass Gainer', image: '/image/muscle/mf4.png', price: 3500, mrp: 3960, tag: 'Bulk Up', badge: 'Premium' },
  { slug: 'ps-product-8', title: 'Nitric Oxide Capsules', image: '/image/biomax/bm1.png', price: 2200, mrp: 2230, tag: 'Daily Health' },
  { slug: 'ps-product-9', title: 'Black Spider Capsule', image: '/image/biomax/bm3.png', price: 1700, mrp: 1880, tag: 'Performance', badge: 'New' },
  { slug: 'ps-product-10', title: 'Body Mass Gainer', image: '/image/athletic/1.png', price: 3650, mrp: 3795, tag: 'Bulk Up', badge: 'Best Seller' },
  { slug: 'ps-product-11', title: 'XXL Mass Gainer', image: '/image/athletic/4.png', price: 3800, mrp: 3995, tag: 'Bulk Up' },
  { slug: 'ps-product-12', title: 'Whey Protein Isolate 100%', image: '/image/Fitnesstech/fn1.png', price: 5450, mrp: 5500, tag: 'Recovery', badge: 'Trending' },
  { slug: 'ps-product-13', title: 'Whey Protein 100%', image: '/image/Fitnesstech/fn3.png', price: 4200, mrp: 4200, tag: 'Recovery', badge: 'New' },
  { slug: 'ps-product-14', title: 'Premium Max Gainer', image: '/image/maximum/mn1.png', price: 3800, mrp: 3996, tag: 'Bulk Up', badge: 'Best Seller' },
  { slug: 'ps-product-15', title: 'Premium Mass Gainer', image: '/image/maximum/mn2.png', price: 4158, mrp: 4158, tag: 'Bulk Up', badge: 'Best Seller' },
];

async function main() {
  const products = SHOP_PRODUCTS.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: `${p.title} - premium quality supplement.`,
    image: p.image,
    price: p.price,
    mrp: p.mrp,
    stock: 100,
    tag: p.tag,
    badge: p.badge,
    active: true,
  }));

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }

  // Deactivate any legacy products not in the current shop list
  const slugs = products.map((p) => p.slug);
  const deactivated = await prisma.product.updateMany({
    where: { slug: { notIn: slugs } },
    data: { active: false, stock: 0 },
  });

  console.log('Seeded', products.length, 'products; deactivated', deactivated.count, 'legacy products');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
