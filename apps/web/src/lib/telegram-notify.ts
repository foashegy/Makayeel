import type { Locale } from '@makayeel/i18n';

interface AlertPayload {
  commodityNameAr: string;
  commodityNameEn: string;
  price: number;
  threshold: number;
  direction: 'ABOVE' | 'BELOW';
  unit: string;
}

/**
 * Send a Telegram alert directly via the Bot API (sendMessage). The dedicated
 * bot worker (`apps/bot`) is the primary surface for interactive commands —
 * this helper is only used from the Vercel cron route for alert fan-out.
 */
export async function notifyTelegram(
  chatId: string,
  locale: Locale,
  payload: AlertPayload,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.info(`[telegram:DEV] would send to ${chatId}`);
    return;
  }

  const name = locale === 'ar' ? payload.commodityNameAr : payload.commodityNameEn;
  const dir = payload.direction === 'ABOVE' ? '▲' : '▼';
  const fmt = (n: number) => n.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
  const esc = (s: string) => s.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');

  const priceLine = `${dir} ${esc(fmt(payload.price))} ${esc(payload.unit)}`;
  const thresholdLine = locale === 'ar'
    ? `الحد: ${esc(fmt(payload.threshold))}`
    : `Threshold: ${esc(fmt(payload.threshold))}`;
  const text = `🔔 *${esc(name)}*\n${priceLine}\n${thresholdLine}`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2' }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('Telegram send failed:', res.status, body);
    throw new Error(`telegram_send_failed: ${res.status}`);
  }
}
