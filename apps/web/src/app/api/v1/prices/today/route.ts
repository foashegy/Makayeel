import { getTodayPrices } from '@/lib/queries';
import { jsonOk } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await getTodayPrices();
  return jsonOk({
    date: rows[0]?.date ?? new Date().toISOString().slice(0, 10),
    count: rows.length,
    prices: rows,
  });
}
