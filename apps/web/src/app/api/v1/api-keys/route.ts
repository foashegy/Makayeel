import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@makayeel/db';
import { auth } from '@/auth';
import { hashApiKey, jsonOk, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({ name: z.string().min(1).max(80) });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
  });
  return jsonOk(keys);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, 'BAD_REQUEST', 'Invalid key name.');
  }

  // Plaintext key — shown to the user once. Format: mky_<32 bytes hex>
  const raw = `mky_${randomBytes(24).toString('hex')}`;
  const row = await prisma.apiKey.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      hashedKey: hashApiKey(raw),
      prefix: raw.slice(0, 8),
    },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });

  return jsonOk({ ...row, key: raw }, { status: 201 });
}
