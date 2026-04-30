import { z } from 'zod';
import { prisma } from '@makayeel/db';
import { auth } from '@/auth';
import { jsonOk, jsonError } from '@/lib/api-auth';
import { cairoToday } from '@/lib/queries';

export const dynamic = 'force-dynamic';

const BulkSchema = z.object({
  // YYYY-MM-DD only — anything else is rejected before we hit `new Date()`.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional(),
  prices: z
    .array(
      z.object({
        commoditySlug: z.string().regex(/^[a-z0-9-]+$/),
        sourceSlug: z.string().regex(/^[a-z0-9-]+$/),
        value: z.number().min(0).max(1_000_000),
      }),
    )
    .min(1)
    .max(200),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');
  // @ts-expect-error — role attached by auth callback
  if (session.user.role !== 'ADMIN') return jsonError(403, 'FORBIDDEN', 'Admin only.');

  const body = await req.json().catch(() => ({}));
  const parsed = BulkSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'BAD_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid input.');

  const date = parsed.data.date ? new Date(`${parsed.data.date}T00:00:00.000Z`) : cairoToday();
  if (Number.isNaN(date.getTime())) {
    return jsonError(400, 'BAD_REQUEST', `Invalid date: ${parsed.data.date}`);
  }

  // Pre-resolve all slugs in two queries.
  const [commodities, sources] = await Promise.all([
    prisma.commodity.findMany({ where: { slug: { in: parsed.data.prices.map((p) => p.commoditySlug) } } }),
    prisma.source.findMany({ where: { slug: { in: parsed.data.prices.map((p) => p.sourceSlug) } } }),
  ]);
  const commodityMap = new Map(commodities.map((c) => [c.slug, c.id]));
  const sourceMap = new Map(sources.map((s) => [s.slug, s.id]));

  const ops = parsed.data.prices
    .map((p) => {
      const commodityId = commodityMap.get(p.commoditySlug);
      const sourceId = sourceMap.get(p.sourceSlug);
      if (!commodityId || !sourceId) return null;
      return prisma.price.upsert({
        where: {
          commodityId_sourceId_date: { commodityId, sourceId, date },
        },
        create: {
          commodityId,
          sourceId,
          date,
          value: p.value.toFixed(2),
          enteredById: session.user!.id,
        },
        update: { value: p.value.toFixed(2), enteredById: session.user!.id },
      });
    })
    .filter((op): op is NonNullable<typeof op> => op !== null);

  const saved = await prisma.$transaction(ops);
  return jsonOk({ saved: saved.length, date: date.toISOString().slice(0, 10) });
}
