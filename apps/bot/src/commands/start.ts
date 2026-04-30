import { Keyboard } from 'grammy';
import type { BotContext } from '../lib/locale';
import { env } from '../env';
import { mdEscape } from '../lib/format';

/** Persistent reply keyboard — turns the bot into a tap-only experience for
 * non-technical mill operators. The free-text fallback in index.ts catches
 * whatever text the buttons emit and routes to the right handler. */
function mainKeyboard(locale: 'ar' | 'en') {
  const kb = new Keyboard();
  if (locale === 'ar') {
    kb.text('📊 أسعار اليوم').text('🌽 سعر خامة').row()
      .text('💰 حساب تكلفة').text('🔔 تنبيه').row()
      .text('🏭 عرض سعري').text('🆘 مساعدة');
  } else {
    kb.text("📊 Today's prices").text('🌽 One commodity').row()
      .text('💰 Cost calc').text('🔔 Alert').row()
      .text('🏭 Submit my mill').text('🆘 Help');
  }
  return kb.resized().persistent();
}

export async function startHandler(ctx: BotContext) {
  const locale = ctx.session.locale;
  const text = locale === 'ar'
    ? [
        `أهلًا بك في *مكاييل*\\.`,
        ``,
        `بوت أسعار خامات الأعلاف في السوق المصري — ذرة، فول صويا، نخالة، شعير، وغيرهم\\.`,
        ``,
        `استخدم الأزرار أسفل الشاشة، أو ابعت اسم خامة وأنا أوريك سعرها\\.`,
        ``,
        `📱 واتساب: \`01555001688\``,
        `📞 اتصال: \`01222203810\``,
      ].join('\n')
    : [
        `Welcome to *Makayeel*\\.`,
        ``,
        `Egyptian feed\\-grain prices — corn, soybean meal, wheat bran, barley, and more\\.`,
        ``,
        `Use the buttons below, or just type a commodity name\\.`,
        ``,
        `📱 WhatsApp: \`01555001688\``,
        `📞 Phone: \`01222203810\``,
      ].join('\n');

  await ctx.reply(text, { parse_mode: 'MarkdownV2', reply_markup: mainKeyboard(locale) });
  void mdEscape;
}

/** Map button labels back to their semantic intent — used by the free-text
 * fallback in index.ts so a user tapping "📊 أسعار اليوم" gets the same
 * response as typing /اسعار. */
export function buttonIntent(text: string): 'prices' | 'price' | 'cost' | 'alert' | 'submit' | 'help' | null {
  const t = text.trim();
  if (t.startsWith('📊')) return 'prices';
  if (t.startsWith('🌽')) return 'price';
  if (t.startsWith('💰')) return 'cost';
  if (t.startsWith('🔔')) return 'alert';
  if (t.startsWith('🏭')) return 'submit';
  if (t.startsWith('🆘')) return 'help';
  return null;
}

export { mainKeyboard };
