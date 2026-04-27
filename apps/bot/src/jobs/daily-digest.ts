import type { Bot, Context } from 'grammy';
import { prisma } from '@makayeel/db';
import { getCommoditySnapshot, getWatchlistForUser } from '../lib/queries';
import { fmtNum, fmtTime, mdEscape } from '../lib/format';

/**
 * Daily 7am Africa/Cairo digest — sends each linked user a snapshot of their
 * watchlist (fallback: top 6). Called from node-cron.
 */
export async function runDailyDigest<C extends Context>(bot: Bot<C>) {
  const links = await prisma.botLink.findMany({ include: { user: true } });
  for (const link of links) {
    try {
      const locale = link.user.locale;
      const commodities = await getWatchlistForUser(link.userId);
      if (commodities.length === 0) continue;
      const snapshots = await Promise.all(commodities.map((c) => getCommoditySnapshot(c.slug)));
      const title = locale === 'ar' ? '🌅 *صباح الخير*' : '🌅 *Good morning*';
      const lines: string[] = [title, ''];
      for (const s of snapshots) {
        if (!s) continue;
        const name = locale === 'ar' ? s.commodity.nameAr : s.commodity.nameEn;
        const deltaPct = s.previous ? ((s.current - s.previous) / s.previous) * 100 : 0;
        const arrow = Math.abs(deltaPct) < 0.05 ? '•' : deltaPct > 0 ? '▲' : '▼';
        lines.push(
          `*${mdEscape(name)}* ${mdEscape(fmtNum(s.current, locale))} ${mdEscape(s.commodity.unit)} ${mdEscape(arrow)} ${mdEscape(Math.abs(deltaPct).toFixed(1))}%`,
        );
      }
      lines.push('');
      lines.push(locale === 'ar' ? `_${mdEscape(fmtTime(new Date(), locale))}_` : `_${mdEscape(fmtTime(new Date(), locale))}_`);
      await bot.api.sendMessage(link.telegramChatId, lines.join('\n'), {
        parse_mode: 'MarkdownV2',
      });
    } catch (err) {
      console.error(`daily digest failed for ${link.telegramChatId}:`, err);
    }
  }
}
