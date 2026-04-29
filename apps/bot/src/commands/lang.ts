import type { BotContext } from '../lib/locale';
import { persistLocale } from '../lib/locale';

export async function langHandler(ctx: BotContext) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const next = ctx.session.locale === 'ar' ? 'en' : 'ar';
  ctx.session.locale = next;
  await persistLocale(chatId, next);
  await ctx.reply(
    next === 'ar' ? 'تمام، هكلمك بالعربي. 👍' : 'Switched to English. 👍',
  );
}

export async function helpHandler(ctx: BotContext) {
  const locale = ctx.session.locale;
  const text = locale === 'ar'
    ? [
        '*أوامر مكاييل*',
        '',
        '• `/start` — رسالة الترحيب',
        '• `/اسعار` أو `/prices` — أسعار النهاردة',
        '• `/سعر <خامة>` — سعر خامة محددة',
        '• `/شارت <خامة> [أيام]` — رسم تاريخي',
        '• `/تنبيه <خامة> <سعر>` — تنبيه سعر',
        '• `/تنبيهاتي` — قائمة تنبيهاتك',
        '• `/link CODE` — اربط حسابك',
        '• `/لغة` — غيّر اللغة',
        '• `/help` — المساعدة',
        '',
        '📱 واتساب: `01555001688`',
        '📞 اتصال: `01222203810`',
      ].join('\n')
    : [
        '*Makayeel commands*',
        '',
        '• `/start` — welcome',
        '• `/prices` — today\'s prices',
        '• `/price <commodity>` — single commodity',
        '• `/chart <commodity> [days]` — history chart',
        '• `/alert <commodity> <threshold>` — price alert',
        '• `/alerts` — your active alerts',
        '• `/link CODE` — link your account',
        '• `/lang` — toggle language',
        '• `/help` — this help',
        '',
        '📱 WhatsApp: `01555001688`',
        '📞 Phone: `01222203810`',
      ].join('\n');
  await ctx.reply(text.replace(/\./g, '\\.'), { parse_mode: 'MarkdownV2' });
}
