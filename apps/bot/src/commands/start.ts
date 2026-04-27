import { InlineKeyboard } from 'grammy';
import type { BotContext } from '../lib/locale';
import { env } from '../env';
import { mdEscape } from '../lib/format';

export async function startHandler(ctx: BotContext) {
  const locale = ctx.session.locale;
  const linkUrl = `${env.NEXT_PUBLIC_SITE_URL}/${locale}/dashboard/link-telegram`;

  const kb = new InlineKeyboard()
    .url(locale === 'ar' ? 'ربط حسابي' : 'Link my account', linkUrl)
    .text(locale === 'ar' ? 'أسعار النهاردة' : "Today's prices", 'cmd:prices');

  const text = locale === 'ar'
    ? [
        `أهلًا بك في *مكاييل*\\.`,
        ``,
        `بوت أسعار خامات الأعلاف في السوق المصري — ذرة، فول صويا، نخالة، شعير، وغيرهم\\.`,
        ``,
        `جرّب:`,
        `• \`/اسعار\` — أسعار اليوم`,
        `• \`/سعر ذرة\` — سعر خامة معينة`,
        `• \`/شارت ذرة 30\` — رسم تاريخي`,
        `• \`/تنبيه ذرة 14500\` — تنبيه سعر`,
        ``,
        `للـ /تنبيهات، اربط حسابك الأول\\.`,
      ].join('\n')
    : [
        `Welcome to *Makayeel*\\.`,
        ``,
        `Egyptian feed\\-grain prices — corn, soybean meal, wheat bran, barley, and more\\.`,
        ``,
        `Try:`,
        `• \`/prices\` — today's prices`,
        `• \`/price corn\` — single commodity`,
        `• \`/chart corn 30\` — history chart`,
        `• \`/alert corn 14500\` — price alert`,
        ``,
        `Link your account to use /alerts\\.`,
      ].join('\n');

  await ctx.reply(text, { parse_mode: 'MarkdownV2', reply_markup: kb });
  // Avoid lint warning about unused import
  void mdEscape;
}
