import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@makayeel/db';
import { jsonOk, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// Called by the Telegram bot when a user runs `/link CODE`.
// Authenticates with the shared bot↔web secret (env-only, never logged).

const RedeemSchema = z.object({
  code: z.string().min(4).max(12),
  telegramChatId: z.string().min(1),
  telegramUsername: z.string().optional(),
});

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET ?? '';
  const authz = req.headers.get('authorization') ?? '';
  if (!expected || !safeEqual(authz, `Bearer ${expected}`)) {
    return jsonError(401, 'UNAUTHORIZED', 'Bot auth failed.');
  }

  const parsed = RedeemSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(400, 'BAD_REQUEST', 'Bad payload.');

  const linkCode = await prisma.botLinkCode.findUnique({ where: { code: parsed.data.code } });
  if (!linkCode || linkCode.consumedAt || linkCode.expiresAt < new Date()) {
    return jsonError(400, 'INVALID_CODE', 'Code expired or already used.');
  }

  await prisma.$transaction([
    prisma.botLinkCode.update({
      where: { id: linkCode.id },
      data: { consumedAt: new Date() },
    }),
    prisma.botLink.upsert({
      where: { userId: linkCode.userId },
      update: {
        telegramChatId: parsed.data.telegramChatId,
        telegramUsername: parsed.data.telegramUsername,
      },
      create: {
        userId: linkCode.userId,
        telegramChatId: parsed.data.telegramChatId,
        telegramUsername: parsed.data.telegramUsername,
      },
    }),
  ]);

  return jsonOk({ linked: true, userId: linkCode.userId });
}
