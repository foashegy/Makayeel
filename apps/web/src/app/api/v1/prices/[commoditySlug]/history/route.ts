import { NextRequest } from 'next/server';
import { getCommodityHistory } from '@/lib/queries';
import { jsonOk, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ commoditySlug: string }> },
) {
  const { commoditySlug } = await params;
  const daysParam = req.nextUrl.searchParams.get('days') ?? '30';
  const days = Math.min(Math.max(parseInt(daysParam, 10) || 30, 1), 365);

  const data = await getCommodityHistory(commoditySlug, days);
  if (!data) return jsonError(404, 'NOT_FOUND', 'Unknown commodity slug.');

  return jsonOk({
    commodity: { slug: data.commodity.slug, nameAr: data.commodity.nameAr, nameEn: data.commodity.nameEn, unit: data.commodity.unit },
    days,
    series: data.series,
  });
}
