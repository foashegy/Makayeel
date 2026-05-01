import type { Locale } from '@makayeel/i18n';
import { formatInTimeZone } from 'date-fns-tz';

export function fmtNum(n: number, _locale?: Locale): string {
  // Force Western digits on both locales — feed-mill operators read prices in
  // Western digits universally (matches WhatsApp norms). Locale only affects
  // currency suffix and dates elsewhere.
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

export function fmtTime(d: Date, locale: Locale): string {
  return formatInTimeZone(d, 'Africa/Cairo', 'h:mm a', {
    locale: undefined, // date-fns locale objects dropped for minimal footprint
  });
}

/** MarkdownV2 escaper — Telegram requires specific chars to be escaped. */
export function mdEscape(s: string): string {
  return s.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

const SPARK_CHARS = '▁▂▃▄▅▆▇█';

/** Tiny inline sparkline for series of prices. */
export function sparkline(values: number[]): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v) => SPARK_CHARS[Math.floor(((v - min) / range) * (SPARK_CHARS.length - 1))])
    .join('');
}
