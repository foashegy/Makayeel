/**
 * Locale-aware formatters for Makayeel.
 *
 * • Numbers: always Western digits (en-US) — even on Arabic pages — because
 *   feed-mill operators read prices in Western digits universally; mixing
 *   Arabic-Indic digits hurts scanability. Locale only affects currency
 *   suffix (ج.م vs EGP) and date formatting.
 * • Dates: always in Africa/Cairo timezone.
 * • Prices: rendered with thousands separator and a currency suffix.
 */

import { format as dfFormat, formatDistanceToNow, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ar as arLocale, enUS } from 'date-fns/locale';
import { localeDateLocales, timeZone, type Locale } from '@makayeel/i18n';

type Numeric = number | string | { toString(): string };

function toNumber(v: Numeric): number {
  if (typeof v === 'number') return v;
  const n = Number(typeof v === 'string' ? v : v.toString());
  return Number.isFinite(n) ? n : 0;
}

export function formatNumber(value: Numeric, _locale: Locale, options?: Intl.NumberFormatOptions): string {
  // Force Western digits (1, 2, 3…) on both locales — Arabic-Indic digits
  // (٢٬٥٠٠) are technically correct but harder to scan in price tables.
  // Egyptian feed-mill operators consistently use Western digits in WhatsApp.
  return new Intl.NumberFormat('en-US', options).format(toNumber(value));
}

export function formatPrice(value: Numeric, locale: Locale, currency = 'EGP'): string {
  const n = toNumber(value);
  const formatted = formatNumber(n, locale, { maximumFractionDigits: 0 });
  // Keep currency in a fixed position (suffix) for both locales — simpler than
  // the CLDR currency placement and matches common Egyptian feed-trade usage.
  return locale === 'ar' ? `${formatted} ${currency === 'EGP' ? 'ج.م' : currency}` : `${formatted} ${currency}`;
}

export function formatDelta(
  current: Numeric,
  previous: Numeric | null | undefined,
  locale: Locale,
): { label: string; pct: number; direction: 'up' | 'down' | 'flat' } {
  const curr = toNumber(current);
  const prev = previous == null ? null : toNumber(previous);
  if (prev === null || prev === 0) {
    return { label: '—', pct: 0, direction: 'flat' };
  }
  const pct = ((curr - prev) / prev) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (Math.abs(rounded) < 0.05) return { label: '— 0.0%', pct: 0, direction: 'flat' };
  const direction = rounded > 0 ? 'up' : 'down';
  const arrow = direction === 'up' ? '▲' : '▼';
  const abs = Math.abs(rounded).toFixed(1);
  const pctNum = formatNumber(abs, locale);
  return { label: `${arrow} ${pctNum}%`, pct: rounded, direction };
}

export function formatDate(date: Date | string, locale: Locale, pattern = 'd MMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(d, timeZone, pattern, {
    locale: locale === 'ar' ? arLocale : enUS,
  });
}

export function formatShortTime(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(d, timeZone, 'h:mm a', {
    locale: locale === 'ar' ? arLocale : enUS,
  });
}

export function formatRelative(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, {
    addSuffix: true,
    locale: locale === 'ar' ? arLocale : enUS,
  });
}

// Escape hatch for when we need date-fns's raw format without timezone (e.g., date inputs).
export function formatLocalDate(date: Date, pattern = 'yyyy-MM-dd'): string {
  return dfFormat(date, pattern);
}
