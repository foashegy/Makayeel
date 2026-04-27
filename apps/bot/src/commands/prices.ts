import type { BotContext } from '../lib/locale';
import { getWatchlistForUser, getCommoditySnapshot, getLinkedUser } from '../lib/queries';
import { fmtNum, fmtTime, mdEscape } from '../lib/format';

export async function pricesHandler(ctx: BotContext) {
  const locale = ctx.session.locale;
  const chatId = ctx.chat?.id?.toString();
  if (!chatId) return;

  const user = await getLinkedUser(chatId);
  const commodities = user
    ? await getWatchlistForUser(user.id)
    : await (await import('../lib/queries')).getCommodities().then((all) => all.slice(0, 6));

  if (commodities.length === 0) {
    await ctx.reply(locale === 'ar' ? 'مفيش أسعار متاحة حاليًا.' : 'No prices available.');
    return;
  }

  const snapshots = await Promise.all(commodities.map((c) => getCommoditySnapshot(c.slug)));
  const title = locale === 'ar' ? '*أسعار اليوم*' : "*Today's prices*";
  const lines: string[] = [title, ''];

  for (const s of snapshots) {
    if (!s) continue;
    const name = locale === 'ar' ? s.commodity.nameAr : s.commodity.nameEn;
    const price = fmtNum(s.current, locale);
    const deltaPct = s.previous
      ? ((s.current - s.previous) / s.previous) * 100
      : 0;
    const arrow = Math.abs(deltaPct) < 0.05 ? '•' : deltaPct > 0 ? '▲' : '▼';
    const deltaStr = Math.abs(deltaPct) < 0.05 ? '' : ` ${arrow} ${Math.abs(deltaPct).toFixed(1)}%`;
    lines.push(`*${mdEscape(name)}* — ${mdEscape(price)} ${mdEscape(s.commodity.unit)}${mdEscape(deltaStr)}`);
  }

  const first = snapshots.find((s) => s !== null);
  if (first) {
    const stamp = fmtTime(new Date(), locale);
    lines.push('');
    lines.push(locale === 'ar' ? `_آخر تحديث: ${mdEscape(stamp)}_` : `_Last updated: ${mdEscape(stamp)}_`);
  }

  await ctx.reply(lines.join('\n'), { parse_mode: 'MarkdownV2' });
}
