/**
 * Makayeel — Baraka Feed seed
 *
 * Registers Baraka as a FACTORY source, creates 6 finished-feed commodities under
 * the FINISHED_FEED category, and inserts today's prices (EGP/ton).
 *
 * Re-runnable: upserts by slug and [commodityId, sourceId, date].
 *
 * Run: pnpm --filter @makayeel/db tsx prisma/seed_baraka.ts
 */
import { PrismaClient, CommodityCategory, SourceType } from '@prisma/client';

const prisma = new PrismaClient();

const SOURCE = {
  slug: 'baraka-feeds',
  nameAr: 'بركة للأعلاف',
  nameEn: 'Baraka Feeds',
  type: SourceType.FACTORY,
};

type BarakaProduct = {
  slug: string;
  nameAr: string;
  nameEn: string;
  price: number;
  displayOrder: number;
};

const PRODUCTS: BarakaProduct[] = [
  { slug: 'baraka-tasmeen-14',    nameAr: 'علف تسمين 14% بركة',           nameEn: 'Baraka Beef 14%',          price: 16_700, displayOrder: 101 },
  { slug: 'baraka-tasmeen-16',    nameAr: 'علف تسمين 16% بركة',           nameEn: 'Baraka Beef 16%',          price: 17_900, displayOrder: 102 },
  { slug: 'baraka-hallab-19',     nameAr: 'علف حلاب 19% بركة',             nameEn: 'Baraka Dairy 19%',         price: 18_500, displayOrder: 103 },
  { slug: 'baraka-hallab-21',     nameAr: 'علف حلاب 21% عالي الإدرار',    nameEn: 'Baraka Dairy 21% High-Yield', price: 19_200, displayOrder: 104 },
  { slug: 'baraka-sheep-16',      nameAr: 'علف أغنام 16% بركة',            nameEn: 'Baraka Sheep 16%',         price: 17_500, displayOrder: 105 },
  { slug: 'baraka-calves-18',     nameAr: 'علف عجول فطام 18% بركة',        nameEn: 'Baraka Weaner 18%',        price: 18_500, displayOrder: 106 },
];

function todayCairoDate(): Date {
  // Prisma @db.Date only needs Y-M-D. Construct at UTC midnight for the current Cairo calendar day.
  const now = new Date();
  const cairo = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
  return new Date(Date.UTC(cairo.getFullYear(), cairo.getMonth(), cairo.getDate()));
}

async function main() {
  const date = todayCairoDate();
  console.log(`Seeding Baraka prices for ${date.toISOString().slice(0, 10)}`);

  // 1) Source (upsert by slug)
  const source = await prisma.source.upsert({
    where: { slug: SOURCE.slug },
    create: SOURCE,
    update: { nameAr: SOURCE.nameAr, nameEn: SOURCE.nameEn, type: SOURCE.type, isActive: true },
  });
  console.log(`  source: ${source.slug} (${source.id})`);

  // 2) Commodities (upsert by slug)
  for (const p of PRODUCTS) {
    const commodity = await prisma.commodity.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        category: CommodityCategory.FINISHED_FEED,
        unit: 'EGP/ton',
        iconKey: 'cow',
        displayOrder: p.displayOrder,
        isActive: true,
      },
      update: {
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        category: CommodityCategory.FINISHED_FEED,
        displayOrder: p.displayOrder,
        isActive: true,
      },
    });

    // 3) Price (upsert by commodity×source×date)
    await prisma.price.upsert({
      where: {
        commodityId_sourceId_date: {
          commodityId: commodity.id,
          sourceId: source.id,
          date,
        },
      },
      create: {
        commodityId: commodity.id,
        sourceId: source.id,
        date,
        value: p.price,
        currency: 'EGP',
        notes: 'Baraka factory list price',
      },
      update: {
        value: p.price,
        notes: 'Baraka factory list price',
      },
    });

    console.log(`  ${p.slug}: ${p.price.toLocaleString('en-US')} EGP/ton`);
  }

  const total = await prisma.price.count({ where: { sourceId: source.id, date } });
  console.log(`\nDone. ${total} Baraka prices for ${date.toISOString().slice(0, 10)}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
