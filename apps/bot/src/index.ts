/**
 * Makayeel Telegram bot entry point.
 *
 * Modes:
 *   • dev: long-polling (TELEGRAM_WEBHOOK_URL unset) — fast feedback
 *   • prod: webhook (Railway process) — set TELEGRAM_WEBHOOK_URL at deploy
 *
 * Runs two in-process crons:
 *   • every 30 min → alert poll (Telegram channel)
 *   • daily 07:00 Africa/Cairo → morning digest
 */

import { Bot, session } from 'grammy';
import cron from 'node-cron';
import { env } from './env';
import { initSession, type BotContext } from './lib/locale';
import { startHandler } from './commands/start';
import { pricesHandler } from './commands/prices';
import { priceHandler } from './commands/price';
import { barakaHandler } from './commands/baraka';
// chart command needs `canvas` native bindings (build tools) — stubbed for now.
// import { chartHandler } from './commands/chart';
import { linkHandler } from './commands/link';
import {
  alertHandler,
  alertCallbackHandler,
  listAlertsHandler,
  deleteAlertCallbackHandler,
} from './commands/alert';
import { langHandler, helpHandler } from './commands/lang';
import { runDailyDigest } from './jobs/daily-digest';
import { runAlertPoll } from './jobs/alert-poll';

const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);
bot.use(session({ initial: initSession }));

// ── Commands ───────────────────────────────────────────────────────────────
// Arabic + English aliases, per spec.
bot.command(['start', 'بدء'], startHandler);
bot.command(['help', 'مساعدة'], helpHandler);
bot.command(['prices', 'اسعار', 'أسعار'], pricesHandler);
bot.command(['price', 'سعر'], priceHandler);
bot.command(['baraka', 'بركة'], barakaHandler);
bot.command(['chart', 'شارت', 'رسم'], async (ctx) => {
  const locale = ctx.session.locale;
  await ctx.reply(
    locale === 'ar'
      ? 'الرسومات البيانية قريبًا — لسه بجهّز الصور. استخدم /سعر دلوقتي.'
      : 'Charts coming soon — still setting up image generation. Use /price for now.',
  );
});
bot.command(['alert', 'تنبيه'], alertHandler);
bot.command(['alerts', 'تنبيهاتي'], listAlertsHandler);
bot.command('link', linkHandler);
bot.command(['lang', 'لغة', 'اللغة'], langHandler);

// ── Callback queries (inline keyboards) ───────────────────────────────────
bot.callbackQuery(/^alert:(ABOVE|BELOW):.+:\d+(?:\.\d+)?$/, alertCallbackHandler);
bot.callbackQuery(/^delalert:.+$/, deleteAlertCallbackHandler);
bot.callbackQuery('cmd:prices', async (ctx) => {
  await ctx.answerCallbackQuery();
  await pricesHandler(ctx);
});

// ── Error boundary ─────────────────────────────────────────────────────────
bot.catch((err) => {
  console.error('Bot error:', err.error);
});

// ── Start ──────────────────────────────────────────────────────────────────
async function start() {
  // Set command menu in both languages (Arabic shows first for RTL users).
  await bot.api.setMyCommands([
    { command: 'start', description: 'ابدأ / Start' },
    { command: 'prices', description: 'أسعار اليوم / Today\'s prices' },
    { command: 'price', description: 'سعر خامة / Price of one commodity' },
    { command: 'baraka', description: 'أسعار بركة للأعلاف / Baraka Feeds prices' },
    { command: 'chart', description: 'شارت / Chart' },
    { command: 'alert', description: 'تنبيه / Alert' },
    { command: 'alerts', description: 'تنبيهاتي / My alerts' },
    { command: 'link', description: 'اربط حسابك / Link account' },
    { command: 'lang', description: 'لغة / Language' },
    { command: 'help', description: 'مساعدة / Help' },
  ]);

  // Webhook server is a Phase 2 enhancement — until then, run polling unconditionally.
  // If TELEGRAM_WEBHOOK_URL is set, ensure no stale webhook is registered (would
  // otherwise compete with polling and cause "Conflict: terminated by other getUpdates").
  if (env.TELEGRAM_WEBHOOK_URL) {
    console.warn(
      '⚠️  TELEGRAM_WEBHOOK_URL is set but webhook mode is not implemented yet. ' +
      'Falling back to long-polling and clearing any existing webhook.',
    );
    await bot.api.deleteWebhook({ drop_pending_updates: true });
  }
  console.info('✅ starting bot in polling mode');
  void bot.start();

  // ── Crons ───────────────────────────────────────────────────────────────
  // Every 30 min, aligned to :00 and :30.
  cron.schedule('0,30 * * * *', () => {
    runAlertPoll(bot).catch((e) => console.error('alert-poll failed:', e));
  });

  // Daily 07:00 Africa/Cairo (TZ enforced by env).
  cron.schedule('0 7 * * *', () => {
    runDailyDigest(bot).catch((e) => console.error('daily-digest failed:', e));
  }, { timezone: 'Africa/Cairo' });

  console.info('✅ cron jobs scheduled (alert-poll /30m, daily-digest 07:00 Africa/Cairo)');
}

start().catch((err) => {
  console.error('❌ bot failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
