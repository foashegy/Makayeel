import { InlineKeyboard, type Bot } from 'grammy';
import type { BotContext } from '../lib/locale';
import { extractRawMaterialPrices } from '../lib/vision';
import { upsertPricesForToday, getCommodities, ensureSource } from '../lib/queries';

const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;
const PENDING_TTL_MS = 10 * 60 * 1000;

function isAdmin(ctx: BotContext): boolean {
  return ADMIN_ID !== undefined && String(ctx.from?.id) === ADMIN_ID;
}

export async function photoHandler(ctx: BotContext) {
  if (!isAdmin(ctx)) {
    await ctx.reply('الصور لاستخراج الأسعار متاحة للأدمن فقط.');
    return;
  }
  const photos = ctx.message?.photo;
  if (!photos || photos.length === 0) return;

  await ctx.reply('🔎 بقرأ الصورة دلوقتي...');
  const largest = photos[photos.length - 1];
  const file = await ctx.api.getFile(largest.file_id);
  if (!file.file_path) {
    await ctx.reply('❌ مقدرتش أحمّل الصورة.');
    return;
  }
  const url = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = file.file_path.toLowerCase();
  const mediaType: 'image/jpeg' | 'image/png' | 'image/webp' =
    ext.endsWith('.png') ? 'image/png' : ext.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

  let result;
  try {
    result = await extractRawMaterialPrices(buf.toString('base64'), mediaType);
  } catch (err) {
    console.error('Vision extraction failed:', err);
    await ctx.reply(`❌ ما عرفتش أستخرج الأسعار: ${(err as Error).message}`);
    return;
  }

  if (result.prices.length === 0) {
    await ctx.reply('⚠️ مفيش أسعار اتعرفت في الصورة. جرب صورة أوضح.');
    return;
  }

  ctx.session.pendingExtraction = {
    prices: result.prices,
    sourceLabel: result.sourceLabel ?? null,
    sourceSlug: result.sourceSlug ?? null,
    sourceType: result.sourceType ?? null,
    createdAt: Date.now(),
  };

  const commodities = await getCommodities();
  const nameByslug = new Map(commodities.map((c) => [c.slug, c.nameAr]));
  const lines = ['*📋 الأسعار المستخرجة*', ''];
  for (const p of result.prices) {
    const name = nameByslug.get(p.commoditySlug) ?? p.commoditySlug;
    const conf = p.confidence === 'low' ? ' ⚠️' : '';
    lines.push(`• ${name}: *${p.value.toLocaleString('en-EG')}* EGP/طن${conf}`);
  }
  if (result.sourceLabel) lines.push('', `_المصدر:_ ${result.sourceLabel}`);
  const targetSourceLabel = result.sourceSlug
    ? `${result.sourceLabel ?? result.sourceSlug} (${result.sourceSlug})`
    : 'ميناء الإسكندرية (alex-port)';
  lines.push('', `_هتتسجل على ${targetSourceLabel} لتاريخ النهاردة._`);

  const kb = new InlineKeyboard()
    .text('✅ تأكيد', 'extract:confirm')
    .text('❌ إلغاء', 'extract:cancel');

  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown', reply_markup: kb });
}

export async function extractCallbackHandler(ctx: BotContext) {
  if (!isAdmin(ctx)) {
    await ctx.answerCallbackQuery({ text: 'أدمن فقط', show_alert: false });
    return;
  }
  const action = ctx.callbackQuery?.data?.split(':')[1];
  const pending = ctx.session.pendingExtraction;

  if (!pending) {
    await ctx.answerCallbackQuery({ text: 'مفيش استخراج معلق' });
    return;
  }
  if (Date.now() - pending.createdAt > PENDING_TTL_MS) {
    delete ctx.session.pendingExtraction;
    await ctx.answerCallbackQuery({ text: 'انتهت مهلة التأكيد، ابعت الصورة تاني' });
    return;
  }

  if (action === 'cancel') {
    delete ctx.session.pendingExtraction;
    await ctx.answerCallbackQuery({ text: 'اتلغى' });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.reply('❌ اتلغى. مفيش حاجة اتسجلت.');
    return;
  }

  if (action === 'confirm') {
    try {
      let sourceSlug = 'alex-port';
      let sourceLabelOut = 'ميناء الإسكندرية';
      if (pending.sourceSlug) {
        const src = await ensureSource(
          pending.sourceSlug,
          pending.sourceLabel ?? pending.sourceSlug,
          pending.sourceLabel ?? pending.sourceSlug,
          pending.sourceType ?? 'FACTORY',
        );
        sourceSlug = pending.sourceSlug;
        sourceLabelOut = pending.sourceLabel ?? pending.sourceSlug;
        void src;
      }
      const { written, skipped } = await upsertPricesForToday(
        pending.prices.map((p) => ({ commoditySlug: p.commoditySlug, value: p.value })),
        sourceSlug,
        pending.sourceLabel ?? 'Telegram photo',
      );
      delete ctx.session.pendingExtraction;
      await ctx.answerCallbackQuery({ text: 'اتسجل ✅' });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
      const skippedNote = skipped.length > 0 ? `\n⚠️ اتجاهل: ${skipped.join(', ')}` : '';
      await ctx.reply(`✅ اتسجل ${written} سعر النهاردة على *${sourceLabelOut}*.${skippedNote}\n\nجرب /اسعار.`, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Price upsert failed:', err);
      await ctx.answerCallbackQuery({ text: 'حصل خطأ' });
      await ctx.reply(`❌ مقدرتش أسجل: ${(err as Error).message}`);
    }
  }
}

export function registerExtractHandlers(bot: Bot<BotContext>) {
  bot.on('message:photo', photoHandler);
  bot.callbackQuery(/^extract:(confirm|cancel)$/, extractCallbackHandler);
}
