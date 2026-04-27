import { z } from 'zod';
import { prisma } from '@makayeel/db';
import { auth } from '@/auth';
import { jsonOk, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const AlertSchema = z.object({
  commoditySlug: z.string().min(1),
  threshold: z.number().positive(),
  direction: z.enum(['ABOVE', 'BELOW']),
  channel: z.enum(['EMAIL', 'TELEGRAM', 'BOTH']).default('EMAIL'),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');

  const alerts = await prisma.alert.findMany({
    where: { userId: session.user.id },
    include: { commodity: true },
    orderBy: { createdAt: 'desc' },
  });
  return jsonOk(
    alerts.map((a) => ({
      id: a.id,
      commoditySlug: a.commodity.slug,
      commodityNameAr: a.commodity.nameAr,
      commodityNameEn: a.commodity.nameEn,
      threshold: Number(a.threshold),
      direction: a.direction,
      channel: a.channel,
      isActive: a.isActive,
      lastFiredAt: a.lastFiredAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');

  const body = await req.json().catch(() => ({}));
  const parsed = AlertSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, 'BAD_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid input.');
  }

  const commodity = await prisma.commodity.findUnique({
    where: { slug: parsed.data.commoditySlug },
  });
  if (!commodity) return jsonError(404, 'NOT_FOUND', 'Unknown commodity.');

  if (parsed.data.channel !== 'EMAIL') {
    const link = await prisma.botLink.findUnique({ where: { userId: session.user.id } });
    if (!link) return jsonError(400, 'TELEGRAM_NOT_LINKED', 'Link Telegram before using this channel.');
  }

  const alert = await prisma.alert.create({
    data: {
      userId: session.user.id,
      commodityId: commodity.id,
      threshold: parsed.data.threshold.toFixed(2),
      direction: parsed.data.direction,
      channel: parsed.data.channel,
      isActive: true,
    },
  });
  return jsonOk({ id: alert.id }, { status: 201 });
}
