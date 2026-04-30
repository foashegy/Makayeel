import { prisma } from '@makayeel/db';
import { auth } from '@/auth';
import { jsonOk, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/scrape-runs?limit=30
 * Returns the most recent ScrapeRun rows so the admin can audit when the
 * daily agent fired, what it pulled, and which runs hit errors.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');
  // @ts-expect-error — role attached by auth callback
  if (session.user.role !== 'ADMIN') return jsonError(403, 'FORBIDDEN', 'Admin only.');

  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get('limit') ?? '30');
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 30;

  const rows = await prisma.scrapeRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: limit,
  });

  // Today's per-site rollup for the dashboard summary card.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rollup = await prisma.scrapeRun.groupBy({
    by: ['siteSlug'],
    where: { startedAt: { gte: since } },
    _sum: { pricesWritten: true, productsRead: true },
    _count: { id: true },
  });

  return jsonOk({
    runs: rows,
    rollup24h: rollup.map((r) => ({
      siteSlug: r.siteSlug,
      runs: r._count.id,
      productsRead: r._sum.productsRead ?? 0,
      pricesWritten: r._sum.pricesWritten ?? 0,
    })),
  });
}
