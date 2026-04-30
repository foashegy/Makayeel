import { prisma } from '@makayeel/db';
import type { BotContext } from '../lib/locale';
import { cairoToday, cairoDaysAgo } from '../lib/queries';
import { fmtNum, fmtTime, mdEscape } from '../lib/format';

const BARAKA_SOURCE_SLUG = 'baraka-feeds';

export async function barakaHandler(ctx: BotContext) {
  const locale = ctx.session.locale;
  const source = await prisma.source.findUnique({ where: { slug: BARAKA_SOURCE_SLUG } });
  if (!source) {
    await ctx.reply(
      locale === 'ar'
        ? 'مفيش أسعار بركة للأعلاف متاحة حاليًا.'
        : 'No Baraka Feeds prices available yet.',
    );
    return;
  }

  const today = cairoToday();
  const yesterday = cairoDaysAgo(1);

  const todayPrices = await prisma.price.findMany({
    where: { sourceId: source.id, date: today, archivedAt: null },
    include: { commodity: true },
    orderBy: { commodity: { displayOrder: 'asc' } },
  });

  if (todayPrices.length === 0) {
    await ctx.reply(
      locale === 'ar'
        ? 'مفيش أسعار بركة اتحدثت اليوم. هنعرضها أول ما تنزل.'
        : 'No Baraka prices updated today yet. Check back soon.',
      { parse_mode: 'MarkdownV2' },
    );
    return;
  }

  const yesterdayPrices = await prisma.price.findMany({
    where: { sourceId: source.id, date: yesterday, archivedAt: null },
    select: { commodityId: true, value: true },
  });
  const yMap = new Map<string, number>(
    yesterdayPrices.map((p: { commodityId: string; value: unknown }) => [p.commodityId, Number(p.value)]),
  );

  const title = locale === 'ar' ? '*🌾 أسعار بركة للأعلاف*' : '*🌾 Baraka Feeds — Prices*';
  const lines: string[] = [title, ''];

  for (const p of todayPrices) {
    const name = locale === 'ar' ? p.commodity.nameAr : p.commodity.nameEn;
    const current = Number(p.value);
    const prev = yMap.get(p.commodityId) ?? null;
    const deltaPct = prev ? ((current - prev) / prev) * 100 : 0;
    const arrow = !prev ? '•' : Math.abs(deltaPct) < 0.05 ? '•' : deltaPct > 0 ? '▲' : '▼';
    const deltaStr =
      !prev || Math.abs(deltaPct) < 0.05 ? '' : ` ${arrow} ${Math.abs(deltaPct).toFixed(1)}%`;
    const priceStr = fmtNum(current, locale);
    lines.push(`*${mdEscape(name)}* — ${mdEscape(priceStr)} ${mdEscape(p.commodity.unit)}${mdEscape(deltaStr)}`);
  }

  lines.push('');
  lines.push(
    locale === 'ar'
      ? `_للطلب: 01000941347 · 01004588082_`
      : `_Orders: 01000941347 · 01004588082_`,
  );
  lines.push(locale === 'ar' ? `_📍 الخطاطبة — المنوفية_` : `_📍 Khattaba — Monofeya_`);
  lines.push('');
  lines.push(
    locale === 'ar'
      ? `_آخر تحديث: ${mdEscape(fmtTime(new Date(), locale))}_`
      : `_Last updated: ${mdEscape(fmtTime(new Date(), locale))}_`,
  );

  await ctx.reply(lines.join('\n'), { parse_mode: 'MarkdownV2', link_preview_options: { is_disabled: true } });
}
