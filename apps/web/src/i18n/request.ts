import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { getMessages, isLocale, timeZone } from '@makayeel/i18n';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: getMessages(locale) as Record<string, string>,
    timeZone,
  };
});
