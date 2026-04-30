import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from '@makayeel/i18n';

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
  // Always send first-time visitors to /ar regardless of Accept-Language.
  // Egyptian feed-mill operators are the primary audience; English visitors
  // can switch via the LangToggle in the header.
  localeDetection: false,
});
