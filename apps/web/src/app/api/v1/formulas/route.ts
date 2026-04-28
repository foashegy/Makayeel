import { z } from 'zod';
import { prisma } from '@makayeel/db';
import { auth } from '@/auth';
import { jsonOk, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const MAX_FORMULAS_PER_USER = 50;

const FormulaItemSchema = z.object({
  commoditySlug: z.string().min(1).max(64),
  percent: z.number().min(0).max(100),
});

const FormulaSchema = z.object({
  name: z.string().trim().min(1).max(80),
  items: z.array(FormulaItemSchema).min(1).max(20),
  totalTons: z.number().min(0).max(10_000).default(1),
  herdSize: z.number().int().min(0).max(1_000_000).default(0),
  kgPerHeadPerDay: z.number().min(0).max(1_000).default(0),
  fcr: z.number().min(0).max(100).default(0),
  outputPricePerKg: z.number().min(0).max(100_000).default(0),
  outputKind: z.enum(['meat', 'milk', 'eggs', 'custom']).default('meat'),
});

interface FormulaItemJson {
  commoditySlug: string;
  percent: number;
}

function serialize(f: {
  id: string;
  name: string;
  items: unknown;
  totalTons: { toString(): string } | number;
  herdSize: number;
  kgPerHeadPerDay: { toString(): string } | number;
  fcr: { toString(): string } | number;
  outputPricePerKg: { toString(): string } | number;
  outputKind: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: f.id,
    name: f.name,
    items: Array.isArray(f.items) ? (f.items as FormulaItemJson[]) : [],
    totalTons: Number(f.totalTons),
    herdSize: f.herdSize,
    kgPerHeadPerDay: Number(f.kgPerHeadPerDay),
    fcr: Number(f.fcr),
    outputPricePerKg: Number(f.outputPricePerKg),
    outputKind: f.outputKind,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');

  const formulas = await prisma.formula.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: MAX_FORMULAS_PER_USER,
  });
  return jsonOk(formulas.map(serialize));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');

  const body = await req.json().catch(() => ({}));
  const parsed = FormulaSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, 'BAD_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid input.');
  }

  // Per-user cap — protects the cron iterator and the DB.
  const count = await prisma.formula.count({ where: { userId: session.user.id } });
  if (count >= MAX_FORMULAS_PER_USER) {
    return jsonError(
      400,
      'LIMIT_REACHED',
      `Max ${MAX_FORMULAS_PER_USER} formulas per user. Delete an old one first.`,
    );
  }

  // Ensure all referenced slugs exist before persisting (prevents stale formulas).
  const slugs = [...new Set(parsed.data.items.map((it) => it.commoditySlug))];
  const found = await prisma.commodity.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true },
  });
  if (found.length !== slugs.length) {
    return jsonError(400, 'BAD_REQUEST', 'One or more commodity slugs are unknown.');
  }

  const created = await prisma.formula.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      items: parsed.data.items,
      totalTons: parsed.data.totalTons.toFixed(2),
      herdSize: parsed.data.herdSize,
      kgPerHeadPerDay: parsed.data.kgPerHeadPerDay.toFixed(2),
      fcr: parsed.data.fcr.toFixed(2),
      outputPricePerKg: parsed.data.outputPricePerKg.toFixed(2),
      outputKind: parsed.data.outputKind,
    },
  });
  return jsonOk(serialize(created), { status: 201 });
}
