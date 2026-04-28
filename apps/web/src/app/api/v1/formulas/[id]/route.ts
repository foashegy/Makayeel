import { z } from 'zod';
import { prisma } from '@makayeel/db';
import { auth } from '@/auth';
import { jsonOk, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  items: z
    .array(
      z.object({
        commoditySlug: z.string().min(1).max(64),
        percent: z.number().min(0).max(100),
      }),
    )
    .min(1)
    .max(20)
    .optional(),
  totalTons: z.number().min(0).max(10_000).optional(),
  herdSize: z.number().int().min(0).max(1_000_000).optional(),
  kgPerHeadPerDay: z.number().min(0).max(1_000).optional(),
  fcr: z.number().min(0).max(100).optional(),
  outputPricePerKg: z.number().min(0).max(100_000).optional(),
  outputKind: z.enum(['meat', 'milk', 'eggs', 'custom']).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');

  const { id } = await ctx.params;
  const owned = await prisma.formula.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!owned) return jsonError(404, 'NOT_FOUND', 'Formula not found.');

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, 'BAD_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid input.');
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.items !== undefined) data.items = parsed.data.items;
  if (parsed.data.totalTons !== undefined) data.totalTons = parsed.data.totalTons.toFixed(2);
  if (parsed.data.herdSize !== undefined) data.herdSize = parsed.data.herdSize;
  if (parsed.data.kgPerHeadPerDay !== undefined)
    data.kgPerHeadPerDay = parsed.data.kgPerHeadPerDay.toFixed(2);
  if (parsed.data.fcr !== undefined) data.fcr = parsed.data.fcr.toFixed(2);
  if (parsed.data.outputPricePerKg !== undefined)
    data.outputPricePerKg = parsed.data.outputPricePerKg.toFixed(2);
  if (parsed.data.outputKind !== undefined) data.outputKind = parsed.data.outputKind;

  const updated = await prisma.formula.update({ where: { id }, data });
  return jsonOk({ id: updated.id });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');

  const { id } = await ctx.params;
  const result = await prisma.formula.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (result.count === 0) return jsonError(404, 'NOT_FOUND', 'Formula not found.');
  return jsonOk({ ok: true });
}
