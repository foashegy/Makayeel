import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, localeDirections, type Locale } from '@makayeel/i18n';
import { tajawal, cairo, inter, jetbrainsMono, fontVariables } from '@makayeel/ui/fonts';
import '@makayeel/ui/globals.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'brand' });
  return {
    title: { default: locale === 'ar' ? 'مكاييل' : 'Makayeel', template: '%s · Makayeel' },
    description: t('tagline'),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dir = localeDirections[locale];
  const messages = await getMessages();

  return (
    <html lang={locale} dir={dir} className={fontVariables} suppressHydrationWarning>
      <body className={`${tajawal.variable} ${cairo.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export const dynamic = 'force-dynamic';
