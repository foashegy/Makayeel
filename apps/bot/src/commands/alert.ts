import { InlineKeyboard } from 'grammy';
import { prisma } from '@makayeel/db';
import type { BotContext } from '../lib/locale';
import { getLinkedUser, getCommodities } from '../lib/queries';
import { matchCommodity } from '../lib/fuzzy';
import { fmtNum, mdEscape } from '../lib/format';

export async function alertHandler(ctx: BotContext) {
  const locale = ctx.session.locale;
  const chatId = ctx.chat?.id?.toString();
  if (!chatId) return;

  const user = await getLinkedUser(chatId);
  if (!user) {
    await ctx.reply(
      locale === 'ar'
        ? 'اربط حسابك الأول: استخدم /link CODE'
        : 'Link your account first with /link CODE',
    );
    return;
  }

  const raw = ctx.match?.toString().trim() ?? '';
  const m = raw.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
  if (!m) {
    await ctx.reply(
      locale === 'ar'
        ? 'مثال: /تنبيه ذرة 14500'
        : 'Example: /alert corn 14500',
    );
    return;
  }

  const [, query, thresholdStr] = m;
  const threshold = Number(thresholdStr);
  if (!Number.isFinite(threshold) || threshold <= 0) {
    await ctx.reply(locale === 'ar' ? 'حد السعر غلط.' : 'Invalid threshold.');
    return;
  }

  const commodities = await getCommodities();
  const commodity = matchCommodity(query ?? '', commodities);
  if (!commodity) {
    await ctx.reply(
      locale === 'ar' ? `ما لقتش خامة "${query}".` : `No commodity matches "${query}".`,
    );
    return;
  }

  const kb = new InlineKeyboard()
    .text(
      locale === 'ar' ? '▲ لما يعدي' : '▲ Above',
      `alert:ABOVE:${commodity.slug}:${threshold}`,
    )
    .text(
      locale === 'ar' ? '▼ لما ينزل' : '▼ Below',
      `alert:BELOW:${commodity.slug}:${threshold}`,
    );

  const name = locale === 'ar' ? commodity.nameAr : commodity.nameEn;
  await ctx.reply(
    locale === 'ar'
      ? `اختار اتجاه التنبيه لـ *${mdEscape(name)}* عند ${mdEscape(fmtNum(threshold, locale))}:`
      : `Pick direction for *${mdEscape(name)}* at ${mdEscape(fmtNum(threshold, locale))}:`,
    { parse_mode: 'MarkdownV2', reply_markup: kb },
  );
}

/**
 * Inline-keyboard callback: create the alert once direction is picked.
 * Payload: alert:<ABOVE|BELOW>:<commoditySlug>:<threshold>
 */
export async function alertCallbackHandler(ctx: BotContext) {
  const locale = ctx.session.locale;
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith('alert:')) return;

  const [, direction, commoditySlug, thresholdStr] = data.split(':');
  if (!direction || !commoditySlug || !thresholdStr) return;

  const chatId = ctx.chat?.id?.toString();
  if (!chatId) return;

  const user = await getLinkedUser(chatId);
  if (!user) {
    await ctx.answerCallbackQuery({ text: 'Not linked' });
    return;
  }

  const commodity = await prisma.commodity.findUnique({ where: { slug: commoditySlug } });
  if (!commodity) {
    await ctx.answerCallbackQuery({ text: 'Not found' });
    return;
  }

  const threshold = Number(thresholdStr);
  await prisma.alert.create({
    data: {
      userId: user.id,
      commodityId: commodity.id,
      threshold: threshold.toFixed(2),
      direction: direction as 'ABOVE' | 'BELOW',
      channel: 'TELEGRAM',
      isActive: true,
    },
  });

  await ctx.answerCallbackQuery({
    text: locale === 'ar' ? '✅ اتحفظ التنبيه' : '✅ Alert saved',
  });
  await ctx.editMessageText(
    locale === 'ar'
      ? `✅ اتحفظ تنبيه ${commodity.nameAr} عند ${threshold.toLocaleString('en-US')}.`
      : `✅ Alert saved for ${commodity.nameEn} at ${threshold.toLocaleString('en-US')}.`,
  );
}

export async function listAlertsHandler(ctx: BotContext) {
  const locale = ctx.session.locale;
  const chatId = ctx.chat?.id?.toString();
  if (!chatId) return;
  const user = await getLinkedUser(chatId);
  if (!user) {
    await ctx.reply(locale === 'ar' ? 'اربط حسابك الأول.' : 'Link your account first.');
    return;
  }

  const alerts = await prisma.alert.findMany({
    where: { userId: user.id, isActive: true },
    include: { commodity: true },
    orderBy: { createdAt: 'desc' },
  });
  if (alerts.length === 0) {
    await ctx.reply(locale === 'ar' ? 'مفيش تنبيهات نشطة.' : 'No active alerts.');
    return;
  }

  const kb = new InlineKeyboard();
  const lines = alerts.map((a) => {
    const name = locale === 'ar' ? a.commodity.nameAr : a.commodity.nameEn;
    const arrow = a.direction === 'ABOVE' ? '▲' : '▼';
    kb.text(
      `🗑 ${name.slice(0, 20)}`,
      `delalert:${a.id}`,
    ).row();
    return `• ${name} ${arrow} ${Number(a.threshold).toLocaleString('en-US')}`;
  });

  await ctx.reply(
    (locale === 'ar' ? '*تنبيهاتك النشطة:*\n\n' : '*Your active alerts:*\n\n') +
      lines.map((l) => l.replace(/\./g, '\\.')).join('\n'),
    { parse_mode: 'MarkdownV2', reply_markup: kb },
  );
}

export async function deleteAlertCallbackHandler(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith('delalert:')) return;
  const [, id] = data.split(':');
  if (!id) return;

  const chatId = ctx.chat?.id?.toString();
  if (!chatId) return;
  const user = await getLinkedUser(chatId);
  if (!user) return;

  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert || alert.userId !== user.id) {
    await ctx.answerCallbackQuery({ text: 'Not yours' });
    return;
  }
  await prisma.alert.delete({ where: { id } });
  const locale = ctx.session.locale;
  await ctx.answerCallbackQuery({
    text: locale === 'ar' ? '🗑 اتحذف' : '🗑 Deleted',
  });
}
