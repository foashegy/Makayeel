import ar from './messages/ar.json';
import en from './messages/en.json';
import type { Locale } from './config';

export * from './config';
export const arMessages = ar;
export const enMessages = en;

export function getMessages(locale: Locale): Record<string, unknown> {
  return locale === 'ar' ? ar : en;
}
