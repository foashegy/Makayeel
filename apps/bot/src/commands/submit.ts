import { InlineKeyboard, type Bot } from 'grammy';
import type { BotContext } from '../lib/locale';
import { extractRawMaterialPrices } from '../lib/vision';
import {
  upsertPricesForToday,
  getCommodities,
  ensureSource,
  getLinkedUser,
  consumeVisionQuota,
} from '../lib/queries';

const SUBMIT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours between submissions per user
const PENDING_TTL_MS = 10 * 60 * 1000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** A single mill account shouldn't be able to drown Claude with photos. 4
 * extractions per Cairo day per user is plenty for retry attempts. */
const MILL_VISION_DAILY_CAP = 4;

/** /عرض — open mill submission mode. Next photo from this user gets attributed
 * as their mill's quote rather than treated as an admin extraction. Requires
 * the user to be linked (BotLink) — that's our verification step. */
export async function submitOpenHandler(ctx: BotContext) {
  const chatId = ctx.chat?.id?.toString();
  if (!chatId) return;
  const linked = await getLinkedUser(chatId);
  if (!linked) {
    await ctx.reply(
      '🔗 لازم تربط حسابك على مكاييل قبل ما تبعت عرض أسعار.\n\n' +
        'اعمل /link واتبع الخطوات.',
    );
    return;
  }

  const last = ctx.session.lastSubmissionAt ?? 0;
  if (Date.now() - last < SUBMIT_COOLDOWN_MS) {
    const minsLeft = Math.ceil((SUBMIT_COOLDOWN_MS - (Date.now() - last)) / 60_000);
    await ctx.reply(`⏳ متاح بعد ${minsLeft} دقيقة. عرض الأسعار محدود لمنع الازدحام في الجدول.`);
    return;
  }

  ctx.session.awaitingMillPhoto = true;
  await ctx.reply(
    '📸 *وضع تقديم عرض السعر*\n\n' +
      'ابعت دلوقتي صورة لوحة أسعار مصنعك (الخامات أو الأعلاف الجاهزة).\n\n' +
      '_هتسجل تحت اسم مصنعك. مدير المنصة يقدر يربط الاسم بشركتك بعد كده._',
    { parse_mode: 'Markdown' },
  );
}

/** Photo handler routed when ctx.session.awaitingMillPhoto === true. */
export async function submitPhotoHandler(ctx: BotContext) {
  const chatId = ctx.chat?.id?.toString();
  if (!chatId) return;
  const linked = await getLinkedUser(chatId);
  if (!linked) {
    ctx.session.awaitingMillPhoto = false;
    await ctx.reply('🔗 لازم تربط حسابك على مكاييل أولاً. اعمل /link.');
    return;
  }
  const photos = ctx.message?.photo;
  if (!photos || photos.length === 0) return;

  ctx.session.awaitingMillPhoto = false;

  // Per-Cairo-day Vision quota for mill submitters.
  const quota = await consumeVisionQuota(`mill-vision:${linked.id}`, linked.id, MILL_VISION_DAILY_CAP);
  if (!quota.ok) {
    await ctx.reply(`⏳ وصلت لحد ${quota.cap} عروض النهارده. جرب بكره.`);
    return;
  }

  await ctx.reply('🔎 بقرأ صورة عرض السعر...');
  const largest = photos[photos.length - 1];
  if (largest.file_size && largest.file_size > MAX_IMAGE_BYTES) {
    await ctx.reply(`❌ الصورة كبيرة (${Math.round(largest.file_size / 1024)} KB). الحد الأقصى ${Math.round(MAX_IMAGE_BYTES / 1024)} KB.`);
    return;
  }
  const file = await ctx.api.getFile(largest.file_id);
  if (!file.file_path) {
    await ctx.reply('❌ مقدرتش أحمّل الصورة.');
    return;
  }
  const url = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
  const res = await fetch(url);
  if (!res.ok) {
    await ctx.reply('❌ فشل تحميل الصورة من تليجرام.');
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_IMAGE_BYTES) {
    await ctx.reply(`❌ الصورة كبيرة جداً.`);
    return;
  }
  const ext = file.file_path.toLowerCase();
  const mediaType: 'image/jpeg' | 'image/png' | 'image/webp' =
    ext.endsWith('.png') ? 'image/png' : ext.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

  let result;
  try {
    result = await extractRawMaterialPrices(buf.toString('base64'), mediaType);
  } catch (err) {
    console.error('Vision extraction failed (submit):', err);
    // Don't leak Prisma/Anthropic internal error text to end users.
    await ctx.reply(`❌ ما عرفتش أستخرج الأسعار من الصورة. جرب صورة تانية.`);
    return;
  }

  if (result.prices.length === 0) {
    await ctx.reply('⚠️ مفيش أسعار اتعرفت. جرب صورة أوضح.');
    return;
  }

  // Mill source slug is namespaced per linked user. If Claude detected a
  // brand label (مثلاً "بركة للأعلاف") we keep it as the human label, but
  // the slug stays `mill-{userId}` so each mill has one canonical source.
  const millSourceSlug = `mill-${linked.id.slice(0, 8)}`;
  const millLabel = result.sourceLabel ?? `مصنع ${linked.email ?? linked.id.slice(0, 8)}`;

  const pendingId = ctx.message?.message_id ?? Date.now();
  ctx.session.pendingSubmission = {
    id: pendingId,
    prices: result.prices,
    millSourceSlug,
    millLabel,
    createdAt: Date.now(),
  };

  const commodities = await getCommodities();
  const nameByslug = new Map(commodities.map((c) => [c.slug, c.nameAr]));
  const lines = ['*📋 عرض سعرك المستخرج*', ''];
  for (const p of result.prices) {
    const name = nameByslug.get(p.commoditySlug) ?? p.commoditySlug;
    const conf = p.confidence === 'low' ? ' ⚠️' : '';
    lines.push(`• ${name}: *${p.value.toLocaleString('en-EG')}* EGP/طن${conf}`);
  }
  lines.push('', `_هيتسجل تحت: *${millLabel}* (${millSourceSlug})_`);
  lines.push('_هيظهر للمشترين كـ "Crowd quote" مع غيره من المصانع._');

  const kb = new InlineKeyboard()
    .text('✅ نشر العرض', `submit:confirm:${pendingId}`)
    .text('❌ إلغاء', `submit:cancel:${pendingId}`);

  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown', reply_markup: kb });
}

export async function submitCallbackHandler(ctx: BotContext) {
  const chatId = ctx.chat?.id?.toString();
  if (!chatId) return;
  const linked = await getLinkedUser(chatId);
  if (!linked) {
    await ctx.answerCallbackQuery({ text: 'تربط حسابك أولاً' });
    return;
  }
  const parts = ctx.callbackQuery?.data?.split(':') ?? [];
  const action = parts[1];
  const pendingIdInCb = parts[2] ? Number(parts[2]) : null;
  const pending = ctx.session.pendingSubmission;

  if (!pending) {
    await ctx.answerCallbackQuery({ text: 'مفيش عرض معلق' });
    return;
  }
  if (pendingIdInCb !== null && pendingIdInCb !== pending.id) {
    await ctx.answerCallbackQuery({ text: 'الصورة دي اتم استبدالها' });
    return;
  }
  if (Date.now() - pending.createdAt > PENDING_TTL_MS) {
    delete ctx.session.pendingSubmission;
    await ctx.answerCallbackQuery({ text: 'انتهت المهلة، ابعت /عرض من جديد' });
    return;
  }

  if (action === 'cancel') {
    delete ctx.session.pendingSubmission;
    await ctx.answerCallbackQuery({ text: 'اتلغى' });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.reply('❌ اتلغى. مفيش عرض اتنشر.');
    return;
  }

  if (action === 'confirm') {
    try {
      await ensureSource(pending.millSourceSlug, pending.millLabel, pending.millLabel, 'FACTORY');
      const { written, skipped } = await upsertPricesForToday(
        pending.prices.map((p) => ({ commoditySlug: p.commoditySlug, value: p.value })),
        pending.millSourceSlug,
        `submitted_by:${chatId}`,
        { source: 'mill_submit', actorUserId: linked.id },
      );
      delete ctx.session.pendingSubmission;
      ctx.session.lastSubmissionAt = Date.now();

      await ctx.answerCallbackQuery({ text: 'اتنشر ✅' });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
      const skippedNote = skipped.length > 0 ? `\n⚠️ اتجاهل: ${skipped.join(', ')}` : '';
      await ctx.reply(
        `✅ اتنشر *${written} سعر* تحت _${pending.millLabel}_.${skippedNote}\n\n` +
          'شكراً — مشاركتك بتساعد كل المربيين والمصانع في مصر.',
        { parse_mode: 'Markdown' },
      );
    } catch (err) {
      console.error('Submit confirm failed:', err);
      await ctx.answerCallbackQuery({ text: 'حصل خطأ' });
      await ctx.reply('❌ مقدرتش أنشر العرض دلوقتي. حاول بعد شوية.');
    }
  }
}

export function registerSubmitHandlers(bot: Bot<BotContext>) {
  bot.command(['submit', 'عرض', 'سعري'], submitOpenHandler);
  bot.callbackQuery(/^submit:(confirm|cancel)(?::\d+)?$/, submitCallbackHandler);
  // Photo routing happens in index.ts so we can pick between admin extraction
  // and mill submission based on session.awaitingMillPhoto.
}
