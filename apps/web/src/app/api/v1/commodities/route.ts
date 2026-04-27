import { getActiveCommodities } from '@/lib/queries';
import { jsonOk } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await getActiveCommodities();
  return jsonOk(
    rows.map((c) => ({
      slug: c.slug,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      category: c.category,
      unit: c.unit,
      iconKey: c.iconKey,
      displayOrder: c.displayOrder,
    })),
  );
}
