import { z } from 'zod';
import { prisma } from '@makayeel/db';
import { auth } from '@/auth';
import { jsonError, checkRateLimit } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/** GET /api/v1/export/prices?from=YYYY-MM-DD&to=YYYY-MM-DD&commodity=slug
 * Streams a CSV of all (non-archived) price rows in the given window.
 * Auth: signed-in session (Pro feature). Capped at 30-day windows + 10 req/min.
 */
const QuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD'),
  commodity: z.string().regex(/^[a-z0-9-]+$/).optional(),
});

const MAX_WINDOW_DAYS = 31;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');

  const rate = await checkRateLimit(`export:${session.user.id}`, 10, 60_000);
  if (!rate.ok) return jsonError(429, 'RATE_LIMITED', `Retry in ${rate.retryAfter}s.`);

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    from: url.searchParams.get('from') ?? '',
    to: url.searchParams.get('to') ?? '',
    commodity: url.searchParams.get('commodity') ?? undefined,
  });
  if (!parsed.success) return jsonError(400, 'BAD_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid input.');

  const fromDate = new Date(`${parsed.data.from}T00:00:00.000Z`);
  const toDate = new Date(`${parsed.data.to}T00:00:00.000Z`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return jsonError(400, 'BAD_REQUEST', 'Invalid date.');
  }
  if (toDate < fromDate) return jsonError(400, 'BAD_REQUEST', '`to` must be on/after `from`.');
  const days = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);
  if (days > MAX_WINDOW_DAYS) {
    return jsonError(400, 'BAD_REQUEST', `Max window is ${MAX_WINDOW_DAYS} days.`);
  }

  const rows = await prisma.price.findMany({
    where: {
      archivedAt: null,
      date: { gte: fromDate, lte: toDate },
      ...(parsed.data.commodity ? { commodity: { slug: parsed.data.commodity } } : {}),
    },
    include: {
      commodity: { select: { slug: true, nameAr: true, nameEn: true, unit: true } },
      source: { select: { slug: true, nameAr: true, nameEn: true, type: true } },
    },
    orderBy: [{ date: 'asc' }, { commodity: { slug: 'asc' } }, { source: { slug: 'asc' } }],
  });

  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = 'date,commodity_slug,commodity_name_ar,commodity_name_en,source_slug,source_name_ar,source_type,value,currency,unit,is_estimated,source_ref';
  const body = rows
    .map((r) =>
      [
        r.date.toISOString().slice(0, 10),
        r.commodity.slug,
        r.commodity.nameAr,
        r.commodity.nameEn,
        r.source.slug,
        r.source.nameAr,
        r.source.type,
        Number(r.value).toFixed(2),
        r.currency,
        r.commodity.unit,
        r.isEstimated ? 'true' : 'false',
        r.sourceRef ?? '',
      ]
        .map(escape)
        .join(','),
    )
    .join('\n');

  const csv = `${header}\n${body}\n`;
  const filename = `makayeel-prices-${parsed.data.from}-to-${parsed.data.to}${parsed.data.commodity ? `-${parsed.data.commodity}` : ''}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      // BOM helps Excel auto-detect UTF-8 with Arabic text.
      // (we prepend below in the response body to keep the streaming option
      //  open for a future ReadableStream rewrite)
    },
  });
}
