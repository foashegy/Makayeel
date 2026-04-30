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
      report.elmorshd.raw.written + report.elmorshd.feed.written;
    const totalCreated =
      report.mazra3ty.raw.created.length + report.mazra3ty.feed.created.length +
      report.elmorshd.raw.created.length + report.elmorshd.feed.created.length;
    const allErrors = [
      ...report.mazra3ty.raw.errors, ...report.mazra3ty.feed.errors,
      ...report.elmorshd.raw.errors, ...report.elmorshd.feed.errors,
    ];

    const lines = [`✅ *تم السحب — ${totalWritten} سعر${totalCreated > 0 ? `, +${totalCreated} منتج جديد` : ''}*`, ''];
    lines.push('*مزرعتي:*');
    lines.push(`  🌽 خامات: ${report.mazra3ty.raw.written}${report.mazra3ty.raw.created.length > 0 ? ` (+${report.mazra3ty.raw.created.length})` : ''}`);
    lines.push(`  🐔 أعلاف: ${report.mazra3ty.feed.written}${report.mazra3ty.feed.created.length > 0 ? ` (+${report.mazra3ty.feed.created.length})` : ''}`);
    lines.push('');
    lines.push('*المرشد للدواجن:*');
    lines.push(`  🌽 خامات: ${report.elmorshd.raw.written}${report.elmorshd.raw.created.length > 0 ? ` (+${report.elmorshd.raw.created.length})` : ''}`);
    lines.push(`  🐔 أعلاف: ${report.elmorshd.feed.written}${report.elmorshd.feed.created.length > 0 ? ` (+${report.elmorshd.feed.created.length})` : ''}`);

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
