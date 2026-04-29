import { prisma } from '@makayeel/db';
import type { CommodityCategory } from '@makayeel/db/types';
import { formatInTimeZone } from 'date-fns-tz';
import { timeZone } from '@makayeel/i18n';

/**
 * Returns "today" as a UTC midnight Date, derived from the current time in
 * Africa/Cairo. Price dates in DB are stored as @db.Date (midnight UTC).
 */
export function cairoToday(): Date {
  const isoDay = formatInTimeZone(new Date(), timeZone, 'yyyy-MM-dd');
  return new Date(`${isoDay}T00:00:00.000Z`);
}

export function cairoDaysAgo(n: number): Date {
  const today = cairoToday();
  return new Date(today.getTime() - n * 86_400_000);
}

export interface TodayPriceRow {
  priceId: string;
  commodityId: string;
  commoditySlug: string;
  commodityIconKey: string | null;
  commodityNameAr: string;
  commodityNameEn: string;
  commodityCategory: CommodityCategory;
  sourceSlug: string;
  sourceNameAr: string;
  sourceNameEn: string;
  sourceType: 'PORT' | 'WHOLESALER' | 'EXCHANGE' | 'FACTORY';
  value: number;
  previous: number | null;
  unit: string;
  date: string;
  isEstimated: boolean;
  sourceRef: string | null;
}

export async function getTodayPrices(options?: {
  category?: CommodityCategory;
}): Promise<TodayPriceRow[]> {
  const today = cairoToday();
  const yesterday = cairoDaysAgo(1);

  const where = {
    date: today,
    commodity: {
      isActive: true,
      ...(options?.category ? { category: options.category } : {}),
    },
    source: { isActive: true },
  };

  const rows = await prisma.price.findMany({
    where,
    include: { commodity: true, source: true },
    orderBy: [{ commodity: { displayOrder: 'asc' } }, { source: { slug: 'asc' } }],
  });

  if (rows.length === 0) return [];

  const commodityIds = [...new Set(rows.map((r) => r.commodityId))];
  const sourceIds = [...new Set(rows.map((r) => r.sourceId))];

  const prevRows = await prisma.price.findMany({
    where: {
      date: yesterday,
      commodityId: { in: commodityIds },
      sourceId: { in: sourceIds },
    },
    select: { commodityId: true, sourceId: true, value: true },
  });

  const prevMap = new Map<string, number>();
  for (const p of prevRows) {
    prevMap.set(`${p.commodityId}|${p.sourceId}`, Number(p.value));
  }

  return rows.map((r) => ({
    priceId: r.id,
    commodityId: r.commodityId,
    commoditySlug: r.commodity.slug,
    commodityIconKey: r.commodity.iconKey,
    commodityNameAr: r.commodity.nameAr,
    commodityNameEn: r.commodity.nameEn,
    commodityCategory: r.commodity.category,
    sourceSlug: r.source.slug,
    sourceNameAr: r.source.nameAr,
    sourceNameEn: r.source.nameEn,
    sourceType: r.source.type,
    value: Number(r.value),
    previous: prevMap.get(`${r.commodityId}|${r.sourceId}`) ?? null,
    unit: r.commodity.unit,
    date: r.date.toISOString(),
    isEstimated: r.isEstimated,
    sourceRef: r.sourceRef,
  }));
}

export async function getCommodityBySlug(slug: string) {
  return prisma.commodity.findUnique({ where: { slug }, include: { prices: false } });
}

export async function getCommodityHistory(slug: string, days: number) {
  const from = cairoDaysAgo(days);
  const commodity = await prisma.commodity.findUnique({ where: { slug } });
  if (!commodity) return null;

  // Use Alexandria Port as the canonical series for charts.
  const alex = await prisma.source.findUnique({ where: { slug: 'alex-port' } });
  if (!alex) return null;

  const prices = await prisma.price.findMany({
    where: { commodityId: commodity.id, sourceId: alex.id, date: { gte: from } },
    orderBy: { date: 'asc' },
    select: { date: true, value: true },
  });

  return {
    commodity,
    series: prices.map((p) => ({ date: p.date.toISOString().slice(0, 10), value: Number(p.value) })),
  };
}

export async function getCommoditySourceBreakdown(slug: string) {
  const today = cairoToday();
  const commodity = await prisma.commodity.findUnique({ where: { slug } });
  if (!commodity) return null;
  const rows = await prisma.price.findMany({
    where: { commodityId: commodity.id, date: today },
    include: { source: true },
    orderBy: { source: { slug: 'asc' } },
  });
  return rows.map((r) => ({
    sourceSlug: r.source.slug,
    sourceNameAr: r.source.nameAr,
    sourceNameEn: r.source.nameEn,
    sourceType: r.source.type,
    value: Number(r.value),
  }));
}

export async function getActiveCommodities() {
  return prisma.commodity.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });
}

export async function getActiveSources() {
  return prisma.source.findMany({
    where: { isActive: true },
    orderBy: { slug: 'asc' },
  });
}
