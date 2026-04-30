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

  // Inline script — sets dark class before paint so users don't see a flash.
  const themeScript = `(function(){try{var t=localStorage.getItem('makayeel-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

  return (
    <html lang={locale} dir={dir} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${tajawal.variable} ${cairo.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased bg-paper-white text-charcoal dark:bg-[#0E1A26] dark:text-paper-white`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export const dynamic = 'force-dynamic';
