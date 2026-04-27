import type { BotContext } from '../lib/locale';
import { getCommodities, getCommoditySnapshot, getCommodityHistory } from '../lib/queries';
import { matchCommodity } from '../lib/fuzzy';
import { fmtNum, fmtTime, mdEscape, sparkline } from '../lib/format';

export async function priceHandler(ctx: BotContext) {
  const locale = ctx.session.locale;
  const query = ctx.match?.toString().trim() ?? '';
  if (!query) {
    await ctx.reply(
      locale === 'ar'
        ? 'اكتب اسم خامة — مثال: /سعر ذرة'
        : 'Specify a commodity — e.g., /price corn',
    );
    return;
  }
  const commodities = await getCommodities();
  const match = matchCommodity(query, commodities);
  if (!match) {
    await ctx.reply(
      locale === 'ar'
        ? `ما لقتش خامة اسمها "${query}". جرّب /اسعار تشوف اللائحة.`
        : `No commodity matches "${query}". Try /prices to see the list.`,
    );
    return;
  }

  const [snap, hist] = await Promise.all([
    getCommoditySnapshot(match.slug),
    getCommodityHistory(match.slug, 7),
  ]);
  if (!snap) {
    await ctx.reply(locale === 'ar' ? 'مفيش سعر لليوم.' : 'No price for today.');
    return;
  }

  const name = locale === 'ar' ? snap.commodity.nameAr : snap.commodity.nameEn;
  const src = locale === 'ar' ? snap.sourceAr : snap.sourceEn;
  const deltaPct = snap.previous ? ((snap.current - snap.previous) / snap.previous) * 100 : 0;
  const arrow = Math.abs(deltaPct) < 0.05 ? '•' : deltaPct > 0 ? '▲' : '▼';
  const spark = hist ? sparkline(hist.series.map((p) => p.value)) : '';
  const stamp = fmtTime(new Date(), locale);

  const text = [
    `*${mdEscape(name)}*`,
    `${mdEscape(fmtNum(snap.current, locale))} ${mdEscape(snap.commodity.unit)}  ${mdEscape(arrow)} ${mdEscape(Math.abs(deltaPct).toFixed(1))}%`,
    ``,
    locale === 'ar' ? `_المصدر: ${mdEscape(src)}_` : `_Source: ${mdEscape(src)}_`,
    spark ? (locale === 'ar' ? `آخر ٧ أيام: ${mdEscape(spark)}` : `7d: ${mdEscape(spark)}`) : '',
    ``,
    locale === 'ar' ? `_آخر تحديث: ${mdEscape(stamp)}_` : `_Last updated: ${mdEscape(stamp)}_`,
  ]
    .filter(Boolean)
    .join('\n');

  await ctx.reply(text, { parse_mode: 'MarkdownV2' });
}
