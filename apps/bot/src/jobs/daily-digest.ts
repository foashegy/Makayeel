import type { Bot, Context } from 'grammy';
import { prisma } from '@makayeel/db';
import { getCommoditySnapshot, getWatchlistForUser } from '../lib/queries';
import { fmtNum, fmtTime, mdEscape } from '../lib/format';
import { computeUserFormulaCosts, getDailyPriceMaps } from '../lib/formula-cost';

/**
 * Daily 7am Africa/Cairo digest — sends each linked user a snapshot of their
 * watchlist (fallback: top 6). Called from node-cron.
 */
export async function runDailyDigest<C extends Context>(bot: Bot<C>) {
  const links = await prisma.botLink.findMany({ include: { user: true } });
  // Fetch the day's price maps once and reuse for every user — avoids the
  // N+1 of computing per-user formula costs.
  const priceMaps = await getDailyPriceMaps();
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
      // Append saved-formula cost block. Wrapped in its own try/catch so a
      // malformed formula doesn't kill the rest of the digest for this user.
      try {
        const formulaCosts = await computeUserFormulaCosts(link.userId, priceMaps);
        if (formulaCosts.length > 0) {
          lines.push('');
          lines.push(locale === 'ar' ? '*تكلفة وصفاتك:*' : '*Your formulas:*');
          for (const r of formulaCosts) {
            const cost = fmtNum(Math.round(r.costPerTonToday), locale);
            const unit = locale === 'ar' ? 'ج/طن' : 'EGP/ton';
            let deltaStr = '';
            if (r.deltaPct !== null) {
              if (Math.abs(r.deltaPct) < 0.05) {
                deltaStr = locale === 'ar' ? ' • ثابت' : ' • flat';
              } else {
                const arrow = r.deltaPct > 0 ? '▲' : '▼';
                deltaStr = ` ${arrow} ${Math.abs(r.deltaPct).toFixed(1)}%`;
              }
            }
            // Surface partial-data state so users don't trust an under-counted cost.
            const missingPlain =
              r.missingSlugs.length > 0
                ? locale === 'ar'
                  ? `(${r.missingSlugs.length} خامة بدون سعر)`
                  : `(${r.missingSlugs.length} commodities missing)`
                : '';
            const missingNote = missingPlain ? ` _${mdEscape(missingPlain)}_` : '';
            lines.push(
              `_${mdEscape(r.formulaName)}_: ${mdEscape(cost)} ${mdEscape(unit)}${mdEscape(deltaStr)}${missingNote}`,
            );
          }
        }
      } catch (formulaErr) {
        console.error(`formula digest failed for ${link.telegramChatId}:`, formulaErr);
        // Continue without the formula block — watchlist still goes out.
      }

      lines.push('');
      lines.push(`_${mdEscape(fmtTime(new Date(), locale))}_`);
      await bot.api.sendMessage(link.telegramChatId, lines.join('\n'), {
        parse_mode: 'MarkdownV2',
      });
    } catch (err) {
      console.error(`daily digest failed for ${link.telegramChatId}:`, err);
    }
  }
}
