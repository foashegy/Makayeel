import { z } from 'zod';
import { prisma } from '@makayeel/db';
import { auth } from '@/auth';
import { jsonOk, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const SlugSchema = z.object({ slug: z.string().min(1).max(80) });

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
  const parsed = SlugSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(400, 'BAD_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid input.');

  const commodity = await prisma.commodity.findUnique({ where: { slug: parsed.data.slug } });
  if (!commodity) return jsonError(404, 'NOT_FOUND', `Commodity ${parsed.data.slug} not found.`);

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
