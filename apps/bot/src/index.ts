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

import http from 'node:http';
import { Bot, session, webhookCallback } from 'grammy';
import cron from 'node-cron';
import { env } from './env';
import { initSession, type BotContext } from './lib/locale';
import { startHandler } from './commands/start';
import { pricesHandler } from './commands/prices';
import { priceHandler } from './commands/price';
import { barakaHandler } from './commands/baraka';
import { costHandler } from './commands/cost';
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
import { registerExtractHandlers, photoHandler } from './commands/extract';
import { registerSubmitHandlers, submitPhotoHandler } from './commands/submit';
import { scrapeHandler } from './commands/scrape';
import { runDailyDigest } from './jobs/daily-digest';
import { runAlertPoll } from './jobs/alert-poll';
import { runMazra3tyScrapeAndNotify } from './jobs/scrape-mazra3ty';

const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);
bot.use(session({ initial: initSession }));

// ── Commands ───────────────────────────────────────────────────────────────
// Arabic + English aliases, per spec.
bot.command(['start', 'بدء'], startHandler);
bot.command(['help', 'مساعدة'], helpHandler);
bot.command(['prices', 'اسعار', 'أسعار'], pricesHandler);
bot.command(['price', 'سعر'], priceHandler);
bot.command(['baraka', 'بركة'], barakaHandler);
bot.command(['cost', 'تكلفة', 'حساب'], costHandler);
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
bot.command(['scrape', 'سحب', 'تحديث'], scrapeHandler);

// ── Photo extraction (admin) + Mill submission (linked users) ──────────────
registerExtractHandlers(bot);
registerSubmitHandlers(bot);

// Single photo router: if user has just opened /عرض submission mode, route
// the photo to the mill-submission flow; otherwise fall back to the
// admin-only extraction flow.
bot.on('message:photo', async (ctx) => {
  if (ctx.session.awaitingMillPhoto) {
    return submitPhotoHandler(ctx);
  }
  return photoHandler(ctx);
});

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
    { command: 'cost', description: 'تكلفة وصفاتك / Your saved formulas' },
    { command: 'chart', description: 'شارت / Chart' },
    { command: 'alert', description: 'تنبيه / Alert' },
    { command: 'alerts', description: 'تنبيهاتي / My alerts' },
    { command: 'link', description: 'اربط حسابك / Link account' },
    { command: 'submit', description: 'عرض سعر مصنعي / Submit my mill quote' },
    { command: 'lang', description: 'لغة / Language' },
    { command: 'help', description: 'مساعدة / Help' },
  ]);

  // Always start a minimal HTTP server with /healthz so Fly's [http_service]
  // probe stays green regardless of mode. The /telegram/webhook path only
  // routes if we're in webhook mode.
  const port = Number(process.env.PORT ?? 8080);
  const webhookPath = '/telegram/webhook';
  const useWebhook = !!env.TELEGRAM_WEBHOOK_URL;
  const webhookHandler = useWebhook
    ? webhookCallback(bot, 'std/http', { secretToken: env.CRON_SECRET })
    : null;

  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && (req.url === '/healthz' || req.url === '/')) {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
      return;
    }
    if (useWebhook && webhookHandler && req.method === 'POST' && req.url === webhookPath) {
      try {
        const body = await new Promise<string>((resolve) => {
          const chunks: Buffer[] = [];
          req.on('data', (c) => chunks.push(c));
          req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
        const webRequest = new Request(`http://local${req.url}`, {
          method: 'POST',
          headers: req.headers as Record<string, string>,
          body,
        });
        const webResponse = await webhookHandler(webRequest);
        res.writeHead(webResponse.status, Object.fromEntries(webResponse.headers));
        res.end(await webResponse.text());
      } catch (err) {
        console.error('webhook handler error:', err);
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end('internal error');
      }
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(port, () => console.info(`✅ HTTP server listening on :${port}`));
  process.once('SIGINT', () => server.close());
  process.once('SIGTERM', () => server.close());

  if (useWebhook) {
    const fullWebhookUrl = `${env.TELEGRAM_WEBHOOK_URL!.replace(/\/$/, '')}${webhookPath}`;
    await bot.api.setWebhook(fullWebhookUrl, {
      secret_token: env.CRON_SECRET,
      drop_pending_updates: false,
    });
    console.info(`✅ bot in WEBHOOK mode → ${fullWebhookUrl}`);
  } else {
    // Polling: clear any stale webhook so getUpdates doesn't 409.
    await bot.api.deleteWebhook({ drop_pending_updates: true });
    console.info('✅ bot in POLLING mode');
    void bot.start();
  }

  // ── Crons ───────────────────────────────────────────────────────────────
  // Every 30 min, aligned to :00 and :30.
  cron.schedule('0,30 * * * *', () => {
    runAlertPoll(bot).catch((e) => console.error('alert-poll failed:', e));
  });

  // Daily 07:00 Africa/Cairo (TZ enforced by env).
  cron.schedule('0 7 * * *', () => {
    runDailyDigest(bot).catch((e) => console.error('daily-digest failed:', e));
  }, { timezone: 'Africa/Cairo' });

  // Daily 06:00 Africa/Cairo — pull mazra3ty.com prices before digest.
  cron.schedule('0 6 * * *', () => {
    runMazra3tyScrapeAndNotify(bot).catch((e) => console.error('mazra3ty scrape failed:', e));
  }, { timezone: 'Africa/Cairo' });

  console.info('✅ cron jobs scheduled (alert-poll /30m, mazra3ty 06:00, digest 07:00 Africa/Cairo)');
}

start().catch((err) => {
  console.error('❌ bot failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
