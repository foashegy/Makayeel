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

/** Per-user / per-Cairo-day Vision quota guard. Atomic check-and-increment
 * to avoid TOCTOU under concurrent extractions. Fails closed on DB error so
 * we never bill Anthropic without an enforced cap. */
export async function consumeVisionQuota(
  bucketKey: string,
  userId: string | null,
  cap: number,
): Promise<{ ok: boolean; used: number; cap: number }> {
  const todayIso = formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd');
  const date = new Date(`${todayIso}T00:00:00.000Z`);
  const key = `${bucketKey}:${todayIso}`;
  try {
    // First request of the day for this bucket: create the row at used=1.
    // We catch the unique-constraint conflict and fall through to UPDATE.
    try {
      await prisma.visionQuota.create({ data: { key, userId, used: 1, date } });
      return { ok: 1 <= cap, used: 1, cap };
    } catch {
      // Row exists — atomic conditional UPDATE. Postgres only writes the row
      // if used < cap, otherwise the update affects 0 rows and we know we hit
      // the ceiling. This sidesteps READ COMMITTED TOCTOU completely.
      const updated = await prisma.$executeRaw`
        UPDATE "VisionQuota"
        SET used = used + 1, "updatedAt" = NOW()
        WHERE key = ${key} AND used < ${cap}
      `;
      if (updated === 0) {
        return { ok: false, used: cap, cap };
      }
      const row = await prisma.visionQuota.findUnique({ where: { key }, select: { used: true } });
      return { ok: true, used: row?.used ?? cap, cap };
    }
  } catch (err) {
    console.error('[visionQuota] DB error, failing closed:', (err as Error).message);
    return { ok: false, used: cap, cap };
  }
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

/** Audit-log driver. Appends one PriceAudit row per price write — non-fatal
 * if it fails (we never block a price write on the audit table). The full
 * before/after pair is captured so disputes can be replayed historically. */
async function recordPriceAudit(args: {
  priceId: string | null;
  commoditySlug: string;
  sourceSlug: string;
  date: Date;
  oldValue: number | null;
  newValue: number;
  source: 'admin_bulk' | 'photo_extract' | 'mill_submit' | 'scraper_mazra3ty' | 'scraper_elmorshd';
  actorUserId: string | null;
  note?: string;
}): Promise<void> {
  try {
    await prisma.priceAudit.create({
      data: {
        priceId: args.priceId,
        commoditySlug: args.commoditySlug,
        sourceSlug: args.sourceSlug,
        date: args.date,
        oldValue: args.oldValue,
        newValue: args.newValue,
        source: args.source,
        actorUserId: args.actorUserId,
        note: args.note,
      },
    });
  } catch (err) {
    console.error('[audit] failed to record price write (non-fatal):', (err as Error).message);
  }
}

export type AuditSource =
  | 'admin_bulk'
  | 'photo_extract'
  | 'mill_submit'
  | 'scraper_mazra3ty'
  | 'scraper_elmorshd';

interface AuditMeta {
  source: AuditSource;
  actorUserId?: string | null;
}

export async function upsertScrapedProducts(
  products: ScrapedProductUpsert[],
  sourceId: string,
  sourceRef?: string,
  audit?: AuditMeta,
): Promise<{ written: number; createdCommodities: string[] }> {
  const date = cairoToday();
  const createdCommodities: string[] = [];
  let written = 0;

  // Resolve sourceSlug once for audit notes — sources are stable.
  const sourceRow = await prisma.source.findUnique({ where: { id: sourceId }, select: { slug: true } });
  const sourceSlug = sourceRow?.slug ?? sourceId;

  // Two batched lookups instead of N: existing commodities by slug, and
  // existing prices for this (source × date) tuple. Cuts scraper round-trips
  // from ~4N to ~2 + 2N. Auto-created commodities still happen one-at-a-time
  // because we need the inserted row, but that's bounded by createdCommodities.
  const slugs = products.map((p) => p.slug);
  const existingCommodities = await prisma.commodity.findMany({ where: { slug: { in: slugs } } });
  const commodityBySlug = new Map(existingCommodities.map((c) => [c.slug, c]));

  let displayOrderCursor: number | null = null;
  for (const p of products) {
    let commodity = commodityBySlug.get(p.slug);
    if (!commodity) {
      if (displayOrderCursor === null) {
        const max = await prisma.commodity.aggregate({ _max: { displayOrder: true } });
        displayOrderCursor = max._max.displayOrder ?? 0;
      }
      displayOrderCursor++;
      commodity = await prisma.commodity.create({
        data: {
          slug: p.slug,
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          category: p.category,
          unit: p.unit,
          displayOrder: displayOrderCursor,
        },
      });
      commodityBySlug.set(p.slug, commodity);
      createdCommodities.push(p.slug);
    }
  }

  // One round-trip for ALL existing prices in this batch.
  const commodityIds = [...commodityBySlug.values()].map((c) => c.id);
  const existingPrices = await prisma.price.findMany({
    where: { sourceId, date, commodityId: { in: commodityIds } },
    select: { id: true, commodityId: true, value: true },
  });
  const existingByCommodityId = new Map(
    existingPrices.map((e) => [e.commodityId, { id: e.id, value: Number(e.value) }]),
  );

  for (const p of products) {
    const commodity = commodityBySlug.get(p.slug);
    if (!commodity) continue;
    const prev = existingByCommodityId.get(commodity.id) ?? null;
    const upserted = await prisma.price.upsert({
      where: {
        commodityId_sourceId_date: { commodityId: commodity.id, sourceId, date },
      },
      create: { commodityId: commodity.id, sourceId, date, value: p.value, sourceRef },
      update: { value: p.value, sourceRef, isEstimated: false },
      select: { id: true },
    });
    if (audit) {
      await recordPriceAudit({
        priceId: upserted.id,
        commoditySlug: p.slug,
        sourceSlug,
        date,
        oldValue: prev ? prev.value : null,
        newValue: p.value,
        source: audit.source,
        actorUserId: audit.actorUserId ?? null,
        note: sourceRef,
      });
    }
    written++;
  }
  return { written, createdCommodities };
}

export async function upsertPricesForToday(
  prices: PriceUpsert[],
  sourceSlug = 'alex-port',
  sourceRef?: string,
  audit?: AuditMeta,
): Promise<{ written: number; skipped: string[] }> {
  const date = cairoToday();
  const source = await prisma.source.findUnique({ where: { slug: sourceSlug } });
  if (!source) throw new Error(`Source not found: ${sourceSlug}`);

  const slugs = prices.map((p) => p.commoditySlug);
  const commodities = await prisma.commodity.findMany({ where: { slug: { in: slugs } } });
  const bySlug = new Map(commodities.map((c) => [c.slug, c]));

  // Batch-load existing prices so we capture oldValue without N+1 round-trips.
  const existingPrices = await prisma.price.findMany({
    where: { sourceId: source.id, date, commodityId: { in: commodities.map((c) => c.id) } },
    select: { id: true, commodityId: true, value: true },
  });
  const existingByCommodityId = new Map(
    existingPrices.map((e) => [e.commodityId, { id: e.id, value: Number(e.value) }]),
  );

  const skipped: string[] = [];
  let written = 0;
  for (const p of prices) {
    const c = bySlug.get(p.commoditySlug);
    if (!c) { skipped.push(p.commoditySlug); continue; }
    const prev = existingByCommodityId.get(c.id) ?? null;
    const upserted = await prisma.price.upsert({
      where: { commodityId_sourceId_date: { commodityId: c.id, sourceId: source.id, date } },
      create: { commodityId: c.id, sourceId: source.id, date, value: p.value, sourceRef },
      update: { value: p.value, sourceRef, isEstimated: false },
      select: { id: true },
    });
    if (audit) {
      await recordPriceAudit({
        priceId: upserted.id,
        commoditySlug: p.commoditySlug,
        sourceSlug,
        date,
        oldValue: prev ? prev.value : null,
        newValue: p.value,
        source: audit.source,
        actorUserId: audit.actorUserId ?? null,
        note: sourceRef,
      });
    }
    written++;
  }
  return { written, skipped };
}
