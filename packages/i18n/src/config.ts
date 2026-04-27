/**
 * Makayeel i18n configuration
 * Arabic is the source of truth; English is translated from Arabic.
 */

export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ar';

export const localeDirections: Record<Locale, 'rtl' | 'ltr'> = {
  ar: 'rtl',
  en: 'ltr',
};

export const localeLabels: Record<Locale, string> = {
  ar: 'العربية',
  en: 'English',
};

export const localeDateLocales: Record<Locale, string> = {
  ar: 'ar-EG',
  en: 'en-US',
};

/** Cairo is the single source of truth timezone for all price dates. */
export const timeZone = 'Africa/Cairo';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
