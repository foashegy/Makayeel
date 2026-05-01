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
  const lookbackFloor = cairoDaysAgo(14);

  const baseWhere = {
    archivedAt: null as Date | null,
    commodity: {
      isActive: true,
      ...(options?.category ? { category: options.category } : {}),
    },
    source: { isActive: true },
  };

  // Per-commodity-source fallback: a single fetch of the last 14 days, then
  // pick the latest row per (commodity × source). This way a commodity that
  // hasn't been updated today STILL renders with its last known price (and
  // a "stale" indicator), instead of disappearing entirely. Fixes the bug
  // where one new photo for a single commodity blanked out everything else.
  // 5K-row cap — with current 30 commodities × ~5 sources × 14 days the
  // upper bound is ~2.1K rows. The cap is a safety net for when commodity
  // count grows; well past that we should switch to a window-function SQL
  // query that picks DISTINCT ON (commodityId, sourceId).
  const recent = await prisma.price.findMany({
    where: {
      ...baseWhere,
      date: { gte: lookbackFloor, lte: today },
    },
    include: { commodity: true, source: true },
    orderBy: { date: 'desc' },
    take: 5000,
  });

  if (recent.length === 0) return [];

  // Keep the latest row per (commodityId, sourceId).
  const latestByPair = new Map<string, (typeof recent)[number]>();
  for (const r of recent) {
    const key = `${r.commodityId}|${r.sourceId}`;
    if (!latestByPair.has(key)) latestByPair.set(key, r);
  }
  const rows = [...latestByPair.values()].sort((a, b) => {
    const order = a.commodity.displayOrder - b.commodity.displayOrder;
    if (order !== 0) return order;
    return a.source.slug.localeCompare(b.source.slug);
  });

  // Per-pair previous: the second-most-recent row in the lookback window for
  // that pair. Cleaner than "yesterday" because the delta now reflects the
  // ACTUAL previous reading the user saw, not a calendar-yesterday that may
  // not exist for this source.
  const prevByPair = new Map<string, number>();
  const seenForPrev = new Set<string>();
  for (const r of recent) {
    const key = `${r.commodityId}|${r.sourceId}`;
    if (!seenForPrev.has(key)) {
      seenForPrev.add(key); // skip the latest
      continue;
    }
    if (!prevByPair.has(key)) prevByPair.set(key, Number(r.value));
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
    previous: prevByPair.get(`${r.commodityId}|${r.sourceId}`) ?? null,
    unit: r.commodity.unit,
    date: r.date.toISOString(),
    isEstimated: r.isEstimated,
    sourceRef: r.sourceRef,
  }));
}

export async function getCommodityBySlug(slug: string) {
  return prisma.commodity.findUnique({ where: { slug }, include: { prices: false } });
}

/**
 * Bulk-fetch the last `days` of canonical (alex-port) prices for every commodity
 * that has data in the window. Used to render sparkline arrays on the prices
 * board. Returns a Map keyed by commodity slug — each value is the median price
 * per date sorted asc, so a falling sparkline visually means "trending down".
 *
 * Single round-trip Postgres query (no N+1).
 */
/**
 * Aggregate today's mill quotes per commodity. Returns the median + range +
 * count of FACTORY-type sources for every commodity that has at least one
 * mill-attributed price today. The "crowd consensus" researcher's plan calls
 * for, surfaced as a separate view on /prices.
 */
export async function getMillQuotesForToday() {
  const today = cairoToday();
  const rows = await prisma.price.findMany({
    where: {
      date: today,
      archivedAt: null,
      source: { type: 'FACTORY' },
    },
    include: { commodity: true, source: true },
  });

  type Row = (typeof rows)[number];
  const grouped = new Map<string, Row[]>();
  for (const r of rows) {
    const slug = r.commodity.slug;
    const existing = grouped.get(slug) ?? [];
    existing.push(r);
    grouped.set(slug, existing);
  }

  const median = (xs: number[]): number => {
    if (xs.length === 0) return 0;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m]! : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
  };

  return [...grouped.entries()]
    .map(([slug, gs]) => {
      const head = gs[0]!;
      const values = gs.map((g) => Number(g.value));
      return {
        slug,
        nameAr: head.commodity.nameAr,
        nameEn: head.commodity.nameEn,
        unit: head.commodity.unit,
        category: head.commodity.category,
        iconKey: head.commodity.iconKey,
        millCount: gs.length,
        median: median(values),
        min: Math.min(...values),
        max: Math.max(...values),
      };
    })
    .sort((a, b) => b.millCount - a.millCount);
}
export async function getRecentSparklines(days: number): Promise<Map<string, number[]>> {
  const from = cairoDaysAgo(days);
  const rows = await prisma.price.findMany({
    where: { date: { gte: from }, archivedAt: null },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      value: true,
      commodity: { select: { slug: true } },
    },
  });

  // Group by commodity → date → value (collapse multi-source into median).
  const byCommodity = new Map<string, Map<string, number[]>>();
  for (const r of rows) {
    const slug = r.commodity.slug;
    const dateKey = r.date.toISOString().slice(0, 10);
    let dateMap = byCommodity.get(slug);
    if (!dateMap) {
      dateMap = new Map();
      byCommodity.set(slug, dateMap);
    }
    const existing = dateMap.get(dateKey) ?? [];
    existing.push(Number(r.value));
    dateMap.set(dateKey, existing);
  }

  const out = new Map<string, number[]>();
  for (const [slug, dateMap] of byCommodity) {
    const series: number[] = [];
    for (const [, values] of [...dateMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const sorted = [...values].sort((a, b) => a - b);
      const m = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[m]! : ((sorted[m - 1] ?? 0) + (sorted[m] ?? 0)) / 2;
      series.push(median);
    }
    out.set(slug, series);
  }
  return out;
}

export async function getCommodityHistory(slug: string, days: number) {
  const from = cairoDaysAgo(days);
  const commodity = await prisma.commodity.findUnique({ where: { slug } });
  if (!commodity) return null;

  // Use Alexandria Port as the canonical series for charts.
  const alex = await prisma.source.findUnique({ where: { slug: 'alex-port' } });
  if (!alex) return null;

  const prices = await prisma.price.findMany({
    where: { commodityId: commodity.id, sourceId: alex.id, date: { gte: from }, archivedAt: null },
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
    where: { commodityId: commodity.id, date: today, archivedAt: null },
    include: { source: true },
    orderBy: { source: { slug: 'asc' } },
  });
  return rows.map((r) => ({
    sourceSlug: r.source.slug,
    sourceNameAr: r.source.nameAr,
    sourceNameEn: r.source.nameEn,
    sourceType: r.source.type,
    value: Number(r.value),
    updatedAt: r.updatedAt,
    sourceRef: r.sourceRef,
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
