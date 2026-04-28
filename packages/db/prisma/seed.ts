/**
 * Makayeel — database seed
 *
 * Populates a fresh Postgres with:
 *   • 1 admin user (email from ADMIN_EMAIL env)
 *   • 8 feed commodities
 *   • 4 sources (2 ports, 1 wholesale, 1 factory zone)
 *   • 30 days of realistic mock prices (EGP/ton) per commodity × source
 *
 * Price ranges below reflect the Egyptian market in early 2026. They are mocks
 * — NOT to be used as real trading references. Adjust the `basePrice` table
 * and keep a comment when ranges shift in reality.
 *
 * Run: `pnpm db:seed`
 */

import { PrismaClient, CommodityCategory, SourceType, Role } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@makayeel.com';
const DAYS_OF_HISTORY = 30;

// Realistic Egyptian feed-grain market ranges, EGP/ton, early 2026.
// Format: [basePriceMidpoint, dailyVolatility] — price wanders ±volatility/2 per day.
const COMMODITIES = [
  {
    slug: 'yellow-corn',
    nameAr: 'ذرة صفراء',
    nameEn: 'Yellow Corn',
    category: CommodityCategory.GRAINS,
    iconKey: 'corn',
    displayOrder: 1,
    basePrice: 14200, // imported yellow corn landed Alex, Apr 2026 ballpark
    volatility: 180,
  },
  {
    slug: 'white-corn',
    nameAr: 'ذرة بيضاء',
    nameEn: 'White Corn',
    category: CommodityCategory.GRAINS,
    iconKey: 'corn',
    displayOrder: 2,
    basePrice: 14800,
    volatility: 200,
  },
  {
    slug: 'soybean-meal-46',
    nameAr: 'كسب فول الصويا 46%',
    nameEn: 'Soybean Meal 46%',
    category: CommodityCategory.PROTEINS,
    iconKey: 'soy',
    displayOrder: 3,
    basePrice: 29500,
    volatility: 350,
  },
  {
    slug: 'soybean-meal-48',
    nameAr: 'كسب فول الصويا 48%',
    nameEn: 'Soybean Meal 48%',
    category: CommodityCategory.PROTEINS,
    iconKey: 'soy',
    displayOrder: 4,
    basePrice: 31200,
    volatility: 400,
  },
  {
    slug: 'wheat-bran',
    nameAr: 'نخالة قمح',
    nameEn: 'Wheat Bran',
    category: CommodityCategory.BYPRODUCTS,
    iconKey: 'wheat',
    displayOrder: 5,
    basePrice: 8200,
    volatility: 120,
  },
  {
    slug: 'barley',
    nameAr: 'شعير',
    nameEn: 'Barley',
    category: CommodityCategory.GRAINS,
    iconKey: 'barley',
    displayOrder: 6,
    basePrice: 12400,
    volatility: 160,
  },
  {
    slug: 'sunflower-meal',
    nameAr: 'كسب عباد الشمس',
    nameEn: 'Sunflower Meal',
    category: CommodityCategory.PROTEINS,
    iconKey: 'sunflower',
    displayOrder: 7,
    basePrice: 13600,
    volatility: 220,
  },
  {
    slug: 'ddgs',
    nameAr: 'مخلفات توزيع الذرة (DDGS)',
    nameEn: 'DDGS (Distillers Grains)',
    category: CommodityCategory.BYPRODUCTS,
    iconKey: 'ddgs',
    displayOrder: 8,
    basePrice: 16800,
    volatility: 250,
  },
] as const;

// Per-source multiplier — ports typically cheapest (bulk), wholesale +3–5%,
// factory zone +6–8% (extra handling), exchange ≈ port.
const SOURCES = [
  {
    slug: 'alex-port',
    nameAr: 'ميناء الإسكندرية',
    nameEn: 'Alexandria Port',
    type: SourceType.PORT,
    multiplier: 1.0,
  },
  {
    slug: 'damietta-port',
    nameAr: 'ميناء دمياط',
    nameEn: 'Damietta Port',
    type: SourceType.PORT,
    multiplier: 1.008,
  },
  {
    slug: 'cairo-wholesale',
    nameAr: 'تجارة الجملة — القاهرة',
    nameEn: 'Cairo Wholesale',
    type: SourceType.WHOLESALER,
    multiplier: 1.042,
  },
  {
    slug: 'sadat-city',
    nameAr: 'مدينة السادات',
    nameEn: 'Sadat City',
    type: SourceType.FACTORY,
    multiplier: 1.068,
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic pseudo-random in [-1, 1] from a seed string — keeps seed reproducible. */
function rand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // map to [-1, 1]
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

function toDateOnly(d: Date): Date {
  // Strip time — stored as @db.Date
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function roundToNearest(v: number, step = 25): number {
  return Math.round(v / step) * step;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n🌾  Makayeel — seeding database\n');

  // 1. Admin user --------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: Role.ADMIN },
    create: {
      email: ADMIN_EMAIL,
      name: 'Makayeel Admin',
      role: Role.ADMIN,
      locale: 'ar',
      emailVerified: new Date(),
    },
  });
  console.log(`✅ admin user: ${admin.email}`);

  // 2. Commodities -------------------------------------------------------
  const commodityRows = await Promise.all(
    COMMODITIES.map((c) =>
      prisma.commodity.upsert({
        where: { slug: c.slug },
        update: {
          nameAr: c.nameAr,
          nameEn: c.nameEn,
          category: c.category,
          iconKey: c.iconKey,
          displayOrder: c.displayOrder,
          isActive: true,
        },
        create: {
          slug: c.slug,
          nameAr: c.nameAr,
          nameEn: c.nameEn,
          category: c.category,
          iconKey: c.iconKey,
          displayOrder: c.displayOrder,
          unit: 'EGP/ton',
          isActive: true,
        },
      }),
    ),
  );
  console.log(`✅ ${commodityRows.length} commodities`);

  // 3. Sources -----------------------------------------------------------
  const sourceRows = await Promise.all(
    SOURCES.map((s) =>
      prisma.source.upsert({
        where: { slug: s.slug },
        update: { nameAr: s.nameAr, nameEn: s.nameEn, type: s.type, isActive: true },
        create: {
          slug: s.slug,
          nameAr: s.nameAr,
          nameEn: s.nameEn,
          type: s.type,
          isActive: true,
        },
      }),
    ),
  );
  console.log(`✅ ${sourceRows.length} sources`);

  // 4. 30 days of prices ------------------------------------------------
  // Use Cairo-local "today" so the API's cairoToday() query matches.
  const cairoIsoDay = new Date().toLocaleString('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const today = new Date(`${cairoIsoDay}T00:00:00.000Z`);
  const priceInserts: Prisma.PriceCreateManyInput[] = [];

  for (const commodity of COMMODITIES) {
    const commodityRow = commodityRows.find((c) => c.slug === commodity.slug);
    if (!commodityRow) continue;

    // Start a random walk from base price — same seed across runs keeps history stable.
    let walking: number = commodity.basePrice;

    for (let daysAgo = DAYS_OF_HISTORY - 1; daysAgo >= 0; daysAgo--) {
      const date = toDateOnly(new Date(today.getTime() - daysAgo * 86400000));

      // Daily drift: ±half the commodity's volatility, deterministic per (slug, date).
      const seed = `${commodity.slug}-${date.toISOString().slice(0, 10)}`;
      const drift = rand(seed) * (commodity.volatility / 2);
      walking = Math.max(commodity.basePrice * 0.7, walking + drift);
      walking = Math.min(commodity.basePrice * 1.3, walking);

      for (const source of SOURCES) {
        const sourceRow = sourceRows.find((s) => s.slug === source.slug);
        if (!sourceRow) continue;

        // Per-source jitter so the 4 prices on the same day aren't identical.
        const jitterSeed = `${commodity.slug}-${source.slug}-${date.toISOString().slice(0, 10)}`;
        const jitter = rand(jitterSeed) * (commodity.volatility * 0.15);
        const value = roundToNearest(walking * source.multiplier + jitter, 25);

        priceInserts.push({
          commodityId: commodityRow.id,
          sourceId: sourceRow.id,
          value: value.toFixed(2),
          currency: 'EGP',
          date,
          enteredById: admin.id,
        });
      }
    }
  }

  // Wipe prior price rows for these (commodity, source, date) tuples before insert.
  // Using deleteMany scoped to the seeded universe is safer than a blind createMany
  // if the seed is re-run against an existing DB.
  await prisma.price.deleteMany({
    where: {
      commodityId: { in: commodityRows.map((c) => c.id) },
      sourceId: { in: sourceRows.map((s) => s.id) },
    },
  });
  const inserted = await prisma.price.createMany({ data: priceInserts });
  console.log(`✅ ${inserted.count} price rows (${DAYS_OF_HISTORY} days × ${commodityRows.length} commodities × ${sourceRows.length} sources)`);

  // 5. Default admin watchlist — first 6 commodities --------------------
  await prisma.watchlist.deleteMany({ where: { userId: admin.id } });
  await prisma.watchlist.createMany({
    data: commodityRows.slice(0, 6).map((c, i) => ({
      userId: admin.id,
      commodityId: c.id,
      position: i,
    })),
  });
  console.log(`✅ admin watchlist seeded (6 commodities)`);

  console.log('\n🎉  Seed complete.\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
