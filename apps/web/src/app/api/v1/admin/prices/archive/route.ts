import { z } from 'zod';
import { prisma } from '@makayeel/db';
import { auth } from '@/auth';
import { jsonOk, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/** Soft-delete (archive) a price row. The row stays in the DB so the audit
 * trail and historical reports remain consistent; reads on /prices and the
 * bot filter `archivedAt: null` so an archived row is hidden from end users. */
const ArchiveSchema = z.object({
  priceId: z.string().min(8).max(40),
  reason: z.string().max(280).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');
  // @ts-expect-error — role attached by auth callback
  if (session.user.role !== 'ADMIN') return jsonError(403, 'FORBIDDEN', 'Admin only.');

  const parsed = ArchiveSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(400, 'BAD_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid input.');

  const target = await prisma.price.findUnique({
    where: { id: parsed.data.priceId },
    include: { commodity: { select: { slug: true } }, source: { select: { slug: true } } },
  });
  if (!target) return jsonError(404, 'NOT_FOUND', 'Price not found.');
  if (target.archivedAt) {
    return jsonOk({ priceId: target.id, archivedAt: target.archivedAt, alreadyArchived: true });
  }

  const now = new Date();
  const updated = await prisma.price.update({
    where: { id: target.id },
    data: { archivedAt: now, archivedReason: parsed.data.reason ?? 'admin-archived' },
  });

  // Audit the archive action — append-only.
  prisma.priceAudit
    .create({
      data: {
        priceId: target.id,
        commoditySlug: target.commodity.slug,
        sourceSlug: target.source.slug,
        date: target.date,
        oldValue: target.value,
        newValue: target.value,
        source: 'admin_bulk',
        actorUserId: session.user.id,
        note: `archive: ${parsed.data.reason ?? '(no reason)'}`,
      },
    })
    .catch((err) => console.error('[audit] archive log failed:', (err as Error).message));

  return jsonOk({ priceId: updated.id, archivedAt: updated.archivedAt });
}

/** Restore (unarchive) a price. */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');
  // @ts-expect-error — role attached by auth callback
  if (session.user.role !== 'ADMIN') return jsonError(403, 'FORBIDDEN', 'Admin only.');

  const url = new URL(req.url);
  const priceId = url.searchParams.get('priceId') ?? '';
  const parsed = ArchiveSchema.shape.priceId.safeParse(priceId);
  if (!parsed.success) return jsonError(400, 'BAD_REQUEST', 'Missing or invalid priceId.');

  const updated = await prisma.price.update({
    where: { id: priceId },
    data: { archivedAt: null, archivedReason: null },
  });
  return jsonOk({ priceId: updated.id, archivedAt: null });
}
