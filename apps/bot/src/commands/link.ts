import type { BotContext } from '../lib/locale';
import { env } from '../env';

export async function linkHandler(ctx: BotContext) {
  const locale = ctx.session.locale;
  const code = ctx.match?.toString().trim().toUpperCase() ?? '';
  if (!code) {
    await ctx.reply(
      locale === 'ar'
        ? `ادخل على ${env.NEXT_PUBLIC_SITE_URL}/${locale}/dashboard/link-telegram وخد الكود من هناك.`
        : `Visit ${env.NEXT_PUBLIC_SITE_URL}/${locale}/dashboard/link-telegram to get your code.`,
    );
    return;
  }

  const chatId = ctx.chat?.id?.toString();
  const username = ctx.from?.username;
  if (!chatId) return;

  try {
    const res = await fetch(`${env.NEXT_PUBLIC_SITE_URL}/api/v1/bot/link`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.CRON_SECRET}`,
      },
      body: JSON.stringify({ code, telegramChatId: chatId, telegramUsername: username }),
    });

    if (res.ok) {
      await ctx.reply(
        locale === 'ar' ? '✅ اتربط حسابك بنجاح!' : '✅ Account linked successfully.',
      );
    } else {
      await ctx.reply(
        locale === 'ar'
          ? '❌ الكود غلط أو انتهت صلاحيته. جدّد الكود من الموقع.'
          : '❌ Invalid or expired code. Regenerate from the site.',
      );
    }
  } catch (err) {
    console.error('link handler failed:', err);
    await ctx.reply(
      locale === 'ar' ? 'في مشكلة، جرّب تاني.' : 'Something went wrong, try again.',
    );
  }
}
