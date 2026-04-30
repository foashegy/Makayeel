import { z } from 'zod';
import { prisma } from '@makayeel/db';
import { auth } from '@/auth';
import { jsonOk, jsonError, checkRateLimit } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const SlugSchema = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, 'invalid slug'),
});

// Anti-DOS: cap watchlist size per user. A real watchlist should have a few
// dozen items, not thousands. Anything beyond this signals abuse.
const MAX_WATCHLIST_PER_USER = 50;

async function ensureSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user.id as string;
}

export async function GET() {
  const userId = await ensureSession();
  if (!userId) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');
  const rows = await prisma.watchlist.findMany({
    where: { userId },
    include: { commodity: { select: { slug: true } } },
    orderBy: { position: 'asc' },
  });
  return jsonOk({ slugs: rows.map((r) => r.commodity.slug) });
}

export async function POST(req: Request) {
  const userId = await ensureSession();
  if (!userId) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');
  // 30 watchlist mutations per minute per user — generous for normal use,
  // hard cap for spam.
  const rate = await checkRateLimit(`watchlist:${userId}`, 30, 60_000);
  if (!rate.ok) {
    return jsonError(429, 'RATE_LIMITED', `Too many requests. Retry in ${rate.retryAfter}s.`);
  }
  const parsed = SlugSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(400, 'BAD_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid input.');

  const commodity = await prisma.commodity.findUnique({ where: { slug: parsed.data.slug } });
  if (!commodity) return jsonError(404, 'NOT_FOUND', `Commodity ${parsed.data.slug} not found.`);

  // If the user is already at the cap, only allow toggling existing items —
  // never grow the watchlist further.
  const [existing, count] = await Promise.all([
    prisma.watchlist.findUnique({
      where: { userId_commodityId: { userId, commodityId: commodity.id } },
      select: { id: true },
    }),
    prisma.watchlist.count({ where: { userId } }),
  ]);
  if (!existing && count >= MAX_WATCHLIST_PER_USER) {
    return jsonError(429, 'WATCHLIST_FULL', `Max ${MAX_WATCHLIST_PER_USER} items per user.`);
  }
  const max = await prisma.watchlist.aggregate({
    where: { userId },
    _max: { position: true },
  });
  await prisma.watchlist.upsert({
    where: { userId_commodityId: { userId, commodityId: commodity.id } },
    create: { userId, commodityId: commodity.id, position: (max._max.position ?? 0) + 1 },
    update: {},
  });
  return jsonOk({ slug: parsed.data.slug, pinned: true });
}

export async function DELETE(req: Request) {
  const userId = await ensureSession();
  if (!userId) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');
  const rate = await checkRateLimit(`watchlist:${userId}`, 30, 60_000);
  if (!rate.ok) {
    return jsonError(429, 'RATE_LIMITED', `Too many requests. Retry in ${rate.retryAfter}s.`);
  }
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') ?? '';
  const parsed = SlugSchema.safeParse({ slug });
  if (!parsed.success) return jsonError(400, 'BAD_REQUEST', 'Missing or invalid slug.');

  const commodity = await prisma.commodity.findUnique({ where: { slug: parsed.data.slug } });
  if (!commodity) return jsonOk({ slug: parsed.data.slug, pinned: false });
  await prisma.watchlist.deleteMany({
    where: { userId, commodityId: commodity.id },
  });
  return jsonOk({ slug: parsed.data.slug, pinned: false });
}
