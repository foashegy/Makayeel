import { prisma, getCanonicalSlug } from '@makayeel/db';
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

  // Same per-commodity fallback as the web: look back 14 days and pick the
  // most recent price for this commodity. Bot users were getting "no price
  // for today" any morning before the 06:00 cron fired.
  const latest = await prisma.price.findFirst({
    where: {
      commodityId: commodity.id,
      archivedAt: null,
      date: { gte: cairoDaysAgo(14), lte: today },
    },
    include: { source: true },
    orderBy: [{ date: 'desc' }, { source: { slug: 'asc' } }, { updatedAt: 'desc' }],
  });
  if (!latest) return null;

  // Previous reading on the same source/commodity for delta. Skip the latest
  // by date < latest.date so we always get a real prior reading.
  const prev = await prisma.price.findFirst({
    where: {
      commodityId: commodity.id,
      sourceId: latest.sourceId,
      archivedAt: null,
      date: { lt: latest.date, gte: cairoDaysAgo(30) },
    },
    orderBy: { date: 'desc' },
  });

  return {
    commodity,
    current: Number(latest.value),
    previous: prev ? Number(prev.value) : null,
    sourceAr: latest.source.nameAr,
    sourceEn: latest.source.nameEn,
    date: latest.date,
  };
}

export async function getCommodityHistory(commoditySlug: string, days: number) {
  const from = cairoDaysAgo(days);
  const commodity = await prisma.commodity.findUnique({ where: { slug: commoditySlug } });
  if (!commodity) return null;
  const alex = await prisma.source.findUnique({ where: { slug: 'alex-port' } });
  if (!alex) return null;
  const prices = await prisma.price.findMany({
    where: { commodityId: commodity.id, sourceId: alex.id, date: { gte: from }, archivedAt: null },
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
  /** Explicit origin from the scraper (e.g. Claude). If null/undefined, the
   * canonical mapper still infers origin from a legacy slug. Explicit wins. */
  origin?: string | null;
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
): Promise<{ written: number; createdCommodities: string[]; skipped: string[] }> {
  const date = cairoToday();
  let written = 0;
  const skipped: string[] = [];

  // Resolve sourceSlug once for audit notes — sources are stable.
  const sourceRow = await prisma.source.findUnique({ where: { id: sourceId }, select: { slug: true } });
  const sourceSlug = sourceRow?.slug ?? sourceId;

  // Map every scraped product to its canonical {slug, origin}. Anything not
  // recognised is dropped (logged in `skipped`) — we never auto-create a
  // commodity from a scraper anymore. New canonical commodities require a
  // code change to canonical-commodities.ts.
  type Resolved = ScrapedProductUpsert & { canonicalSlug: string; resolvedOrigin: string | null };
  const resolved: Resolved[] = [];
  for (const p of products) {
    const target = getCanonicalSlug(p.slug);
    if (!target) {
      skipped.push(p.slug);
      continue;
    }
    // Explicit origin from scraper wins over legacy-mapped origin.
    const finalOrigin = p.origin !== undefined ? (p.origin ?? null) : target.origin;
    resolved.push({ ...p, canonicalSlug: target.slug, resolvedOrigin: finalOrigin });
  }

  if (skipped.length > 0) {
    console.warn(`[upsertScrapedProducts] skipping ${skipped.length} non-canonical slugs:`, skipped);
  }

  const canonicalSlugs = [...new Set(resolved.map((r) => r.canonicalSlug))];
  const existingCommodities = await prisma.commodity.findMany({ where: { slug: { in: canonicalSlugs } } });
  const commodityBySlug = new Map(existingCommodities.map((c) => [c.slug, c]));

  for (const r of resolved) {
    const commodity = commodityBySlug.get(r.canonicalSlug);
    if (!commodity) {
      // Canonical slug not in DB yet — log and skip; canonical seed handles creation.
      skipped.push(r.canonicalSlug);
      continue;
    }
    const existing = await prisma.price.findFirst({
      where: { commodityId: commodity.id, sourceId, date, origin: r.resolvedOrigin, archivedAt: null },
      select: { id: true, value: true },
    });
    const oldValue = existing ? Number(existing.value) : null;
    let priceId: string;
    if (existing) {
      const updated = await prisma.price.update({
        where: { id: existing.id },
        data: { value: r.value, sourceRef, isEstimated: false },
        select: { id: true },
      });
      priceId = updated.id;
    } else {
      const created = await prisma.price.create({
        data: { commodityId: commodity.id, sourceId, date, value: r.value, sourceRef, origin: r.resolvedOrigin },
        select: { id: true },
      });
      priceId = created.id;
    }
    if (audit) {
      await recordPriceAudit({
        priceId,
        commoditySlug: r.canonicalSlug,
        sourceSlug,
        date,
        oldValue,
        newValue: r.value,
        source: audit.source,
        actorUserId: audit.actorUserId ?? null,
        note: sourceRef,
      });
    }
    written++;
  }
  return { written, createdCommodities: [], skipped };
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
    const existing = await prisma.price.findFirst({
      where: { commodityId: c.id, sourceId: source.id, date, origin: null, archivedAt: null },
      select: { id: true },
    });
    const upserted = existing
      ? await prisma.price.update({
          where: { id: existing.id },
          data: { value: p.value, sourceRef, isEstimated: false },
          select: { id: true },
        })
      : await prisma.price.create({
          data: { commodityId: c.id, sourceId: source.id, date, value: p.value, sourceRef, origin: null },
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
