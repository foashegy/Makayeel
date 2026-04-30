import { prisma } from '@makayeel/db';
import type { Commodity } from '@makayeel/db/types';
import { formatInTimeZone } from 'date-fns-tz';

const TZ = 'Africa/Cairo';

export function cairoToday(): Date {
  const isoDay = formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd');
  return new Date(`${isoDay}T00:00:00.000Z`);
}

export function cairoDaysAgo(n: number): Date {
  return new Date(cairoToday().getTime() - n * 86_400_000);
}

export async function getCommodities(): Promise<Commodity[]> {
  return prisma.commodity.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });
}

export interface CommodityPriceSnapshot {
  commodity: Commodity;
  current: number;
  previous: number | null;
  sourceAr: string;
  sourceEn: string;
  date: Date;
}

export async function getCommoditySnapshot(
  commoditySlug: string,
): Promise<CommodityPriceSnapshot | null> {
  const commodity = await prisma.commodity.findUnique({ where: { slug: commoditySlug } });
  if (!commodity) return null;
  const today = cairoToday();
  const yesterday = cairoDaysAgo(1);

  // Prefer Alexandria Port; fall back to most recent today across any source.
  const todayRow = await prisma.price.findFirst({
    where: { commodityId: commodity.id, date: today },
    include: { source: true },
    orderBy: [
      { source: { slug: 'asc' } },
      { updatedAt: 'desc' },
    ],
  });
  if (!todayRow) return null;

  const yRow = await prisma.price.findFirst({
    where: { commodityId: commodity.id, sourceId: todayRow.sourceId, date: yesterday },
  });

  return {
    commodity,
    current: Number(todayRow.value),
    previous: yRow ? Number(yRow.value) : null,
    sourceAr: todayRow.source.nameAr,
    sourceEn: todayRow.source.nameEn,
    date: todayRow.createdAt,
  };
}

export async function getCommodityHistory(commoditySlug: string, days: number) {
  const from = cairoDaysAgo(days);
  const commodity = await prisma.commodity.findUnique({ where: { slug: commoditySlug } });
  if (!commodity) return null;
  const alex = await prisma.source.findUnique({ where: { slug: 'alex-port' } });
  if (!alex) return null;
  const prices = await prisma.price.findMany({
    where: { commodityId: commodity.id, sourceId: alex.id, date: { gte: from } },
    orderBy: { date: 'asc' },
    select: { date: true, value: true },
  });
  return {
    commodity,
    series: prices.map((p) => ({ date: p.date, value: Number(p.value) })),
  };
}

export async function getWatchlistForUser(userId: string): Promise<Commodity[]> {
  const rows = await prisma.watchlist.findMany({
    where: { userId },
    include: { commodity: true },
    orderBy: { position: 'asc' },
  });
  if (rows.length === 0) {
    // Fallback: top 6 commodities by displayOrder
    return (await getCommodities()).slice(0, 6);
  }
  return rows.map((r) => r.commodity);
}

export async function getLinkedUser(chatId: string) {
  const link = await prisma.botLink.findUnique({
    where: { telegramChatId: chatId },
    include: { user: true },
  });
  return link?.user ?? null;
}

export interface PriceUpsert {
  commoditySlug: string;
  value: number;
}

export interface ScrapedProductUpsert {
  nameAr: string;
  nameEn: string;
  slug: string;
  category: 'GRAINS' | 'PROTEINS' | 'BYPRODUCTS' | 'ADDITIVES' | 'OILS' | 'FINISHED_FEED';
  unit: string;
  value: number;
}

export async function ensureSource(
  slug: string,
  nameAr: string,
  nameEn: string,
  type: 'PORT' | 'WHOLESALER' | 'EXCHANGE' | 'FACTORY',
): Promise<{ id: string }> {
  return prisma.source.upsert({
    where: { slug },
    create: { slug, nameAr, nameEn, type },
    update: {},
    select: { id: true },
  });
}

export async function upsertScrapedProducts(
  products: ScrapedProductUpsert[],
  sourceId: string,
  sourceRef?: string,
): Promise<{ written: number; createdCommodities: string[] }> {
  const date = cairoToday();
  const createdCommodities: string[] = [];
  let written = 0;

  for (const p of products) {
    let commodity = await prisma.commodity.findUnique({ where: { slug: p.slug } });
    if (!commodity) {
      const max = await prisma.commodity.aggregate({ _max: { displayOrder: true } });
      commodity = await prisma.commodity.create({
        data: {
          slug: p.slug,
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          category: p.category,
          unit: p.unit,
          displayOrder: (max._max.displayOrder ?? 0) + 1,
        },
      });
      createdCommodities.push(p.slug);
    }
    await prisma.price.upsert({
      where: {
        commodityId_sourceId_date: { commodityId: commodity.id, sourceId, date },
      },
      create: { commodityId: commodity.id, sourceId, date, value: p.value, sourceRef },
      update: { value: p.value, sourceRef, isEstimated: false },
    });
    written++;
  }
  return { written, createdCommodities };
}

export async function upsertPricesForToday(
  prices: PriceUpsert[],
  sourceSlug = 'alex-port',
  sourceRef?: string,
): Promise<{ written: number; skipped: string[] }> {
  const date = cairoToday();
  const source = await prisma.source.findUnique({ where: { slug: sourceSlug } });
  if (!source) throw new Error(`Source not found: ${sourceSlug}`);

  const slugs = prices.map((p) => p.commoditySlug);
  const commodities = await prisma.commodity.findMany({ where: { slug: { in: slugs } } });
  const bySlug = new Map(commodities.map((c) => [c.slug, c]));

  const skipped: string[] = [];
  let written = 0;
  for (const p of prices) {
    const c = bySlug.get(p.commoditySlug);
    if (!c) { skipped.push(p.commoditySlug); continue; }
    await prisma.price.upsert({
      where: { commodityId_sourceId_date: { commodityId: c.id, sourceId: source.id, date } },
      create: { commodityId: c.id, sourceId: source.id, date, value: p.value, sourceRef },
      update: { value: p.value, sourceRef, isEstimated: false },
    });
    written++;
  }
  return { written, skipped };
}
