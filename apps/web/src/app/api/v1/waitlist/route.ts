import { z } from 'zod';
import { prisma } from '@makayeel/db';
import { jsonOk, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const WaitlistSchema = z.object({
  email: z.string().email(),
  locale: z.enum(['ar', 'en']).default('ar'),
  source: z.string().max(50).optional(),
});

export async function POST(req: Request) {
  const parsed = WaitlistSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(400, 'BAD_REQUEST', 'Invalid email.');
  await prisma.waitingList.upsert({
    where: { email: parsed.data.email },
    update: { locale: parsed.data.locale, source: parsed.data.source },
    create: parsed.data,
  });
  return jsonOk({ joined: true });
}
