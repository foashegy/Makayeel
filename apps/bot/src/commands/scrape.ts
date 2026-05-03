import type { BotContext } from '../lib/locale';
import { runMazra3tyScrape } from '../jobs/scrape-mazra3ty';

const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;

export async function scrapeHandler(ctx: BotContext) {
  if (!ADMIN_ID || String(ctx.from?.id) !== ADMIN_ID) {
    await ctx.reply('الأمر ده للأدمن فقط.');
    return;
  }
  await ctx.reply('🌾 بسحب من مزرعتي + المرشد دلوقتي... استنى شوية.');
  try {
    const report = await runMazra3tyScrape();
    const totalWritten =
      report.mazra3ty.raw.written + report.mazra3ty.feed.written +
      report.elmorshd.raw.written + report.elmorshd.feed.written +
      (report.elmorshd.livePoultry?.written ?? 0) + (report.elmorshd.eggs?.written ?? 0) +
      report.baraka.raw.written + report.baraka.feed.written +
      report.esraatrade.raw.written + report.esraatrade.feed.written +
      report.globalCme.raw.written + report.globalCme.feed.written;
    const totalCreated =
      report.mazra3ty.raw.created.length + report.mazra3ty.feed.created.length +
      report.elmorshd.raw.created.length + report.elmorshd.feed.created.length +
      (report.elmorshd.livePoultry?.created.length ?? 0) + (report.elmorshd.eggs?.created.length ?? 0) +
      report.baraka.raw.created.length + report.baraka.feed.created.length +
      report.esraatrade.raw.created.length + report.esraatrade.feed.created.length +
      report.globalCme.raw.created.length + report.globalCme.feed.created.length;
    const allErrors = [
      ...report.mazra3ty.raw.errors, ...report.mazra3ty.feed.errors,
      ...report.elmorshd.raw.errors, ...report.elmorshd.feed.errors,
      ...(report.elmorshd.livePoultry?.errors ?? []), ...(report.elmorshd.eggs?.errors ?? []),
      ...report.baraka.raw.errors, ...report.baraka.feed.errors,
      ...report.esraatrade.raw.errors, ...report.esraatrade.feed.errors,
      ...report.globalCme.raw.errors, ...report.globalCme.feed.errors,
    ];

    const lines = [`✅ *تم السحب — ${totalWritten} سعر${totalCreated > 0 ? `, +${totalCreated} منتج جديد` : ''}*`, ''];
    lines.push('*مزرعتي:*');
    lines.push(`  🌽 خامات: ${report.mazra3ty.raw.written}${report.mazra3ty.raw.created.length > 0 ? ` (+${report.mazra3ty.raw.created.length})` : ''}`);
    lines.push(`  🐔 أعلاف: ${report.mazra3ty.feed.written}${report.mazra3ty.feed.created.length > 0 ? ` (+${report.mazra3ty.feed.created.length})` : ''}`);
    lines.push('');
    lines.push('*المرشد للدواجن:*');
    lines.push(`  🌽 خامات: ${report.elmorshd.raw.written}${report.elmorshd.raw.created.length > 0 ? ` (+${report.elmorshd.raw.created.length})` : ''}`);
    lines.push(`  🐔 أعلاف: ${report.elmorshd.feed.written}${report.elmorshd.feed.created.length > 0 ? ` (+${report.elmorshd.feed.created.length})` : ''}`);
    if (report.elmorshd.livePoultry) {
      lines.push(`  🐓 فراخ حية: ${report.elmorshd.livePoultry.written}${report.elmorshd.livePoultry.created.length > 0 ? ` (+${report.elmorshd.livePoultry.created.length})` : ''}`);
    }
    if (report.elmorshd.eggs) {
      lines.push(`  🥚 بيض: ${report.elmorshd.eggs.written}${report.elmorshd.eggs.created.length > 0 ? ` (+${report.elmorshd.eggs.created.length})` : ''}`);
    }
    lines.push('');
    lines.push('*بركة للأعلاف:*');
    lines.push(`  🌽 خامات: ${report.baraka.raw.written}${report.baraka.raw.created.length > 0 ? ` (+${report.baraka.raw.created.length})` : ''}`);
    lines.push(`  🐔 أعلاف: ${report.baraka.feed.written}${report.baraka.feed.created.length > 0 ? ` (+${report.baraka.feed.created.length})` : ''}`);
    lines.push('');
    lines.push('*إسراء تريد:*');
    lines.push(`  🌽 خامات: ${report.esraatrade.raw.written}${report.esraatrade.raw.created.length > 0 ? ` (+${report.esraatrade.raw.created.length})` : ''}`);
    lines.push(`  🐔 أعلاف: ${report.esraatrade.feed.written}${report.esraatrade.feed.created.length > 0 ? ` (+${report.esraatrade.feed.created.length})` : ''}`);
    lines.push('');
    lines.push('*البورصة العالمية (CME):*');
    lines.push(`  🌐 خامات: ${report.globalCme.raw.written}${report.globalCme.raw.created.length > 0 ? ` (+${report.globalCme.raw.created.length})` : ''}`);

    if (allErrors.length > 0) {
      lines.push('', '⚠️ أخطاء:');
      allErrors.forEach((e) => lines.push(`• ${e}`));
    }
    lines.push('', '_جرب /اسعار_');
    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('scrape failed:', err);
    await ctx.reply(`❌ فشل: ${(err as Error).message}`);
  }
}
