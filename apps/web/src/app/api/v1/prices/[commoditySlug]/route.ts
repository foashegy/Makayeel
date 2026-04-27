import { getTodayPrices, getCommodityBySlug } from '@/lib/queries';
import { jsonOk, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ commoditySlug: string }> },
) {
  const { commoditySlug } = await params;
  const commodity = await getCommodityBySlug(commoditySlug);
  if (!commodity) return jsonError(404, 'NOT_FOUND', 'Unknown commodity slug.');

  const all = await getTodayPrices();
  const rows = all.filter((r) => r.commoditySlug === commoditySlug);
  return jsonOk({ commodity: { slug: commodity.slug, nameAr: commodity.nameAr, nameEn: commodity.nameEn, unit: commodity.unit }, prices: rows });
}
