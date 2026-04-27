import { InputFile } from 'grammy';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { formatInTimeZone } from 'date-fns-tz';
import type { BotContext } from '../lib/locale';
import { getCommodities, getCommodityHistory } from '../lib/queries';
import { matchCommodity } from '../lib/fuzzy';

const canvas = new ChartJSNodeCanvas({
  width: 900,
  height: 500,
  backgroundColour: '#FAFAF5',
});

export async function chartHandler(ctx: BotContext) {
  const locale = ctx.session.locale;
  const raw = ctx.match?.toString().trim() ?? '';
  const match = raw.match(/^(.+?)(?:\s+(\d{1,3}))?$/);
  const query = match?.[1]?.trim() ?? '';
  const days = Math.min(Math.max(parseInt(match?.[2] ?? '30', 10), 7), 365);
  if (!query) {
    await ctx.reply(
      locale === 'ar'
        ? 'مثال: /شارت ذرة 30'
        : 'Example: /chart corn 30',
    );
    return;
  }

  const commodities = await getCommodities();
  const commodity = matchCommodity(query, commodities);
  if (!commodity) {
    await ctx.reply(
      locale === 'ar' ? `ما لقتش خامة اسمها "${query}".` : `No commodity matches "${query}".`,
    );
    return;
  }

  const hist = await getCommodityHistory(commodity.slug, days);
  if (!hist || hist.series.length === 0) {
    await ctx.reply(locale === 'ar' ? 'مفيش بيانات كفاية.' : 'Not enough data.');
    return;
  }

  const name = locale === 'ar' ? commodity.nameAr : commodity.nameEn;
  const buffer = await canvas.renderToBuffer({
    type: 'line',
    data: {
      labels: hist.series.map((p) => formatInTimeZone(p.date, 'Africa/Cairo', 'd MMM')),
      datasets: [
        {
          label: name,
          data: hist.series.map((p) => p.value),
          borderColor: '#D4A24C',
          backgroundColor: 'rgba(212,162,76,0.15)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: true, position: 'top', labels: { color: '#1A2E40', font: { size: 14 } } },
        title: {
          display: true,
          text: `${name} — ${days}d (EGP/ton)`,
          color: '#1A2E40',
          font: { size: 18, weight: 'bold' },
        },
      },
      scales: {
        x: { ticks: { color: '#8FA0B3' }, grid: { color: 'rgba(26,46,64,0.08)' } },
        y: { ticks: { color: '#8FA0B3' }, grid: { color: 'rgba(26,46,64,0.08)' } },
      },
    },
  });

  await ctx.replyWithPhoto(new InputFile(buffer, `${commodity.slug}-${days}d.png`), {
    caption: locale === 'ar'
      ? `${name} — آخر ${days} يوم`
      : `${name} — last ${days} days`,
  });
}
