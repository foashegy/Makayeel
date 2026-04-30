import { InlineKeyboard, type Bot } from 'grammy';
import type { BotContext } from '../lib/locale';
import { extractRawMaterialPrices } from '../lib/vision';
import { upsertPricesForToday, getCommodities, ensureSource, consumeVisionQuota } from '../lib/queries';

const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;
const PENDING_TTL_MS = 10 * 60 * 1000;
/** 5 MiB — comfortably under Telegram's 20 MB photo cap and well under
 * Claude Vision's 5 MB recommended limit. Anything bigger is suspicious. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Daily Vision-API extractions per admin. Bounds runaway cost if a key
 * leaks or a script attaches the bot's webhook. */
const ADMIN_VISION_DAILY_CAP = 100;

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

  // Daily cap on admin extractions — bounds Anthropic spend even if the
  // bot token leaks or someone scripts a flood of forwarded photos.
  const quota = await consumeVisionQuota(`admin-vision:${ctx.from?.id}`, null, ADMIN_VISION_DAILY_CAP);
  if (!quota.ok) {
    await ctx.reply(`⏳ وصلت لحد ${quota.cap} استخراج النهارده. جرب بكره.`);
    return;
  }

  await ctx.reply('🔎 بقرأ الصورة دلوقتي...');
  const largest = photos[photos.length - 1];
  if (largest.file_size && largest.file_size > MAX_IMAGE_BYTES) {
    await ctx.reply(
      `❌ الصورة كبيرة (${Math.round(largest.file_size / 1024)} KB). الحد الأقصى ${Math.round(MAX_IMAGE_BYTES / 1024)} KB.`,
    );
    return;
  }
  const file = await ctx.api.getFile(largest.file_id);
  if (!file.file_path) {
    await ctx.reply('❌ مقدرتش أحمّل الصورة.');
    return;
  }
  // Telegram bot token must NEVER appear in a logged URL string. We build the
  // URL just for the fetch and never log it.
  const url = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
  const res = await fetch(url);
  if (!res.ok) {
    await ctx.reply('❌ فشل تحميل الصورة من تليجرام.');
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_IMAGE_BYTES) {
    await ctx.reply(`❌ الصورة كبيرة جداً (${Math.round(buf.length / 1024)} KB). جرب صورة أصغر.`);
    return;
  }
  const ext = file.file_path.toLowerCase();
  const mediaType: 'image/jpeg' | 'image/png' | 'image/webp' =
    ext.endsWith('.png') ? 'image/png' : ext.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

  let result;
  try {
    result = await extractRawMaterialPrices(buf.toString('base64'), mediaType);
  } catch (err) {
    console.error('Vision extraction failed:', err);
    await ctx.reply('❌ ما عرفتش أستخرج الأسعار من الصورة. جرب صورة أوضح.');
    return;
  }

  if (result.prices.length === 0) {
    await ctx.reply('⚠️ مفيش أسعار اتعرفت في الصورة. جرب صورة أوضح.');
    return;
  }

  // Use the photo message_id as the pending id — guaranteed unique per chat
  // and serves as a stable correlator inside the confirm callback_data.
  const pendingId = ctx.message?.message_id ?? Date.now();

  ctx.session.pendingExtraction = {
    id: pendingId,
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

  // callback_data carries the pending id so a confirm tap that races with a
  // second photo's session overwrite is detected and rejected, not silently
  // applied to the wrong batch.
  const kb = new InlineKeyboard()
    .text('✅ تأكيد', `extract:confirm:${pendingId}`)
    .text('❌ إلغاء', `extract:cancel:${pendingId}`);

  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown', reply_markup: kb });
}

export async function extractCallbackHandler(ctx: BotContext) {
  if (!isAdmin(ctx)) {
    await ctx.answerCallbackQuery({ text: 'أدمن فقط', show_alert: false });
    return;
  }
  const parts = ctx.callbackQuery?.data?.split(':') ?? [];
  const action = parts[1];
  const pendingIdInCb = parts[2] ? Number(parts[2]) : null;
  const pending = ctx.session.pendingExtraction;

  if (!pending) {
    await ctx.answerCallbackQuery({ text: 'مفيش استخراج معلق' });
    return;
  }
  // Reject confirms that target a different photo than the one currently
  // pending in session (race when 2 photos arrive close together).
  if (pendingIdInCb !== null && pendingIdInCb !== pending.id) {
    await ctx.answerCallbackQuery({ text: 'الصورة دي اتم استبدالها بصورة أحدث — اضغط على رسالة الأحدث' });
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
        { source: 'photo_extract', actorUserId: String(ctx.from?.id ?? '') },
      );
      delete ctx.session.pendingExtraction;
      await ctx.answerCallbackQuery({ text: 'اتسجل ✅' });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
      const skippedNote = skipped.length > 0 ? `\n⚠️ اتجاهل: ${skipped.join(', ')}` : '';
      await ctx.reply(`✅ اتسجل ${written} سعر النهاردة على *${sourceLabelOut}*.${skippedNote}\n\nجرب /اسعار.`, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Price upsert failed:', err);
      await ctx.answerCallbackQuery({ text: 'حصل خطأ' });
      await ctx.reply('❌ مقدرتش أسجل دلوقتي. حاول بعد شوية.');
    }
  }
}

export function registerExtractHandlers(bot: Bot<BotContext>) {
  // Photo routing is registered in index.ts because two flows (admin extract
  // vs mill submission) share the message:photo channel.
  bot.callbackQuery(/^extract:(confirm|cancel)(?::\d+)?$/, extractCallbackHandler);
}
