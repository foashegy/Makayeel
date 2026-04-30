import type { BotContext } from '../lib/locale';
import { runMazra3tyScrape } from '../jobs/scrape-mazra3ty';

const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;

export async function scrapeHandler(ctx: BotContext) {
  if (!ADMIN_ID || String(ctx.from?.id) !== ADMIN_ID) {
    await ctx.reply('الأمر ده للأدمن فقط.');
    return;
  }
  await ctx.reply('🌾 بسحب من مزرعتي دلوقتي... استنى ثانيتين.');
  try {
    const report = await runMazra3tyScrape();
    const lines = ['✅ *تم السحب*', ''];
    lines.push(`🌽 خامات: *${report.rawMaterials.written}* سعر${report.rawMaterials.created.length > 0 ? ` (+${report.rawMaterials.created.length} جديد)` : ''}`);
    if (report.rawMaterials.created.length > 0) {
      lines.push(`   جديد: ${report.rawMaterials.created.slice(0, 5).join(', ')}${report.rawMaterials.created.length > 5 ? '...' : ''}`);
    }
    lines.push(`🐔 أعلاف: *${report.compoundFeeds.written}* سعر${report.compoundFeeds.created.length > 0 ? ` (+${report.compoundFeeds.created.length} جديد)` : ''}`);
    if (report.compoundFeeds.created.length > 0) {
      lines.push(`   جديد: ${report.compoundFeeds.created.slice(0, 5).join(', ')}${report.compoundFeeds.created.length > 5 ? '...' : ''}`);
    }
    if (report.errors.length > 0) {
      lines.push('', '⚠️ أخطاء:');
      report.errors.forEach((e) => lines.push(`• ${e}`));
    }
    lines.push('', '_جرب /اسعار_');
    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('scrape failed:', err);
    await ctx.reply(`❌ فشل: ${(err as Error).message}`);
  }
}
