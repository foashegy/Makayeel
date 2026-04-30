import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ContactFab } from '@/components/contact-fab';
import type { Locale } from '@makayeel/i18n';
import { isLocale } from '@makayeel/i18n';
import { notFound } from 'next/navigation';

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale as Locale} />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale as Locale} />
      <ContactFab locale={locale as Locale} />
    </div>
  );
}
