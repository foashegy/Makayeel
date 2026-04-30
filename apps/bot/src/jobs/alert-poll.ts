import type { Bot, Context } from 'grammy';
import { prisma } from '@makayeel/db';
import { cairoToday } from '../lib/queries';
import { fmtNum, mdEscape } from '../lib/format';

/**
 * Every 30 min: scan active alerts, fire any that crossed threshold, respect
 * 24h de-duplication window. Telegram-channel alerts are delivered here;
 * email alerts are delivered by the Vercel cron route in apps/web.
 */
export async function runAlertPoll<C extends Context>(bot: Bot<C>) {
  const today = cairoToday();
  const prices = await prisma.price.findMany({
    where: { date: today, archivedAt: null },
    select: { commodityId: true, value: true },
  });
  if (prices.length === 0) return;

  const minByCommodity = new Map<string, number>();
  for (const p of prices) {
    const v = Number(p.value);
    const curr = minByCommodity.get(p.commodityId);
    if (curr === undefined || v < curr) minByCommodity.set(p.commodityId, v);
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const alerts = await prisma.alert.findMany({
    where: {
      isActive: true,
      channel: { in: ['TELEGRAM', 'BOTH'] },
      OR: [{ lastFiredAt: null }, { lastFiredAt: { lt: oneDayAgo } }],
    },
    include: { commodity: true, user: { include: { botLink: true } } },
  });

  for (const alert of alerts) {
    const chatId = alert.user.botLink?.telegramChatId;
    if (!chatId) continue;
    const price = minByCommodity.get(alert.commodityId);
    if (price === undefined) continue;
    const threshold = Number(alert.threshold);
    const crossed =
      (alert.direction === 'ABOVE' && price >= threshold) ||
      (alert.direction === 'BELOW' && price <= threshold);
    if (!crossed) continue;

    const locale = alert.user.locale;
    const name = locale === 'ar' ? alert.commodity.nameAr : alert.commodity.nameEn;
    const arrow = alert.direction === 'ABOVE' ? '▲' : '▼';
    const text =
      locale === 'ar'
        ? `🔔 *${mdEscape(name)}*\n${mdEscape(arrow)} ${mdEscape(fmtNum(price, locale))} ${mdEscape(alert.commodity.unit)}\nالحد: ${mdEscape(fmtNum(threshold, locale))}`
        : `🔔 *${mdEscape(name)}*\n${mdEscape(arrow)} ${mdEscape(fmtNum(price, locale))} ${mdEscape(alert.commodity.unit)}\nThreshold: ${mdEscape(fmtNum(threshold, locale))}`;

    try {
      await bot.api.sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
      await prisma.alert.update({
        where: { id: alert.id },
        data: { lastFiredAt: new Date() },
      });
    } catch (err) {
      console.error(`alert send failed ${alert.id}:`, err);
    }
  }
}
