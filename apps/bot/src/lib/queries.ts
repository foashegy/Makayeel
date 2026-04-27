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

  // Prefer Alexandria Port as canonical.
  const alex = await prisma.source.findUnique({ where: { slug: 'alex-port' } });
  if (!alex) return null;

  const [todayRow, yRow] = await Promise.all([
    prisma.price.findUnique({
      where: { commodityId_sourceId_date: { commodityId: commodity.id, sourceId: alex.id, date: today } },
    }),
    prisma.price.findUnique({
      where: { commodityId_sourceId_date: { commodityId: commodity.id, sourceId: alex.id, date: yesterday } },
    }),
  ]);

  if (!todayRow) return null;
  return {
    commodity,
    current: Number(todayRow.value),
    previous: yRow ? Number(yRow.value) : null,
    sourceAr: alex.nameAr,
    sourceEn: alex.nameEn,
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
