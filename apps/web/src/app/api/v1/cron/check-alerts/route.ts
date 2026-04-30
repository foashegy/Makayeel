import { timingSafeEqual } from 'node:crypto';
import { prisma } from '@makayeel/db';
import { jsonOk, jsonError } from '@/lib/api-auth';
import { cairoToday } from '@/lib/queries';
import { env } from '@/lib/env';
import { sendAlertEmail } from '@/lib/email';
import { notifyTelegram } from '@/lib/telegram-notify';

export const dynamic = 'force-dynamic';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Cron endpoint — invoked by Vercel Cron every 30 min.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` header.
 *
 * Logic:
 *   1. Load today's prices (one row per commodity, min price across sources).
 *   2. For each active alert: if (direction=ABOVE && price>=threshold) OR
 *      (direction=BELOW && price<=threshold) AND not fired in last 24h → fire.
 *   3. Send via configured channel(s), update lastFiredAt.
 */
export async function GET(req: Request) {
  const authz = req.headers.get('authorization') ?? '';
  if (!safeEqual(authz, `Bearer ${env.CRON_SECRET}`)) {
    return jsonError(401, 'UNAUTHORIZED', 'Bad cron secret.');
  }

  const today = cairoToday();
  const prices = await prisma.price.findMany({
    where: { date: today },
    include: { commodity: true, source: true },
  });
  if (prices.length === 0) return jsonOk({ fired: 0, reason: 'no-prices-today' });

  // Keep the cheapest (ports) price per commodity as the reference for alerts.
  const minByCommodity = new Map<string, number>();
  for (const p of prices) {
    const v = Number(p.value);
    const current = minByCommodity.get(p.commodityId);
    if (current === undefined || v < current) minByCommodity.set(p.commodityId, v);
  }

  // De-dupe by *Africa/Cairo day* rather than a 24h sliding window. A user
  // never gets the same alert twice in one trading day, but they DO get it
  // again the next morning if the condition is still true.
  // (P1 #1: the previous `now - 24h` window drifted with cron timing.)
  const alerts = await prisma.alert.findMany({
    where: {
      isActive: true,
      OR: [{ lastFiredAt: null }, { lastFiredAt: { lt: today } }],
    },
    include: { user: { include: { botLink: true } }, commodity: true },
  });

  let fired = 0;
  for (const alert of alerts) {
    const price = minByCommodity.get(alert.commodityId);
    if (price === undefined) continue;
    const threshold = Number(alert.threshold);
    const crossed =
      (alert.direction === 'ABOVE' && price >= threshold) ||
      (alert.direction === 'BELOW' && price <= threshold);
    if (!crossed) continue;

    const payload = {
      commodityNameAr: alert.commodity.nameAr,
      commodityNameEn: alert.commodity.nameEn,
      price,
      threshold,
      direction: alert.direction,
      unit: alert.commodity.unit,
    };

    const sends: Promise<unknown>[] = [];
    if (alert.channel === 'EMAIL' || alert.channel === 'BOTH') {
      if (alert.user.email) sends.push(sendAlertEmail(alert.user.email, alert.user.locale, payload));
    }
    if (alert.channel === 'TELEGRAM' || alert.channel === 'BOTH') {
      const chatId = alert.user.botLink?.telegramChatId;
      if (chatId) sends.push(notifyTelegram(chatId, alert.user.locale, payload));
    }

    if (sends.length === 0) continue;
    const results = await Promise.allSettled(sends);
    const anySucceeded = results.some((r) => r.status === 'fulfilled');
    if (!anySucceeded) {
      const reasons = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
      console.error(`alert ${alert.id} all channels failed:`, reasons);
      continue;
    }
    await prisma.alert.update({ where: { id: alert.id }, data: { lastFiredAt: new Date() } });
    fired++;
  }

  return jsonOk({ fired, checked: alerts.length });
}
