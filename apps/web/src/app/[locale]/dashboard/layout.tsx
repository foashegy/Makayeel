import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { BrandMark, LangToggle, Button } from '@makayeel/ui';
import { auth, signOut } from '@/auth';
import { isLocale, type Locale } from '@makayeel/i18n';
import { notFound } from 'next/navigation';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);
  const t = await getTranslations({ locale, namespace: 'nav' });

  // @ts-expect-error — role attached
  const isAdmin = session.user.role === 'ADMIN';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-navy/8 bg-paper-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
          <Link href={`/${locale}/dashboard`} aria-label="Dashboard home">
            <BrandMark />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href={`/${locale}/dashboard`} className="text-sm font-medium text-deep-navy hover:opacity-70">
              {t('dashboard')}
            </Link>
            <Link href={`/${locale}/dashboard/cost`} className="text-sm text-deep-navy hover:opacity-70">
              {locale === 'ar' ? 'التكلفة' : 'Cost'}
            </Link>
            <Link href={`/${locale}/dashboard/alerts`} className="text-sm text-deep-navy hover:opacity-70">
              {locale === 'ar' ? 'التنبيهات' : 'Alerts'}
            </Link>
            <Link href={`/${locale}/dashboard/api-keys`} className="text-sm text-deep-navy hover:opacity-70">
              API
            </Link>
            <Link href={`/${locale}/dashboard/settings`} className="text-sm text-deep-navy hover:opacity-70">
              {locale === 'ar' ? 'الإعدادات' : 'Settings'}
            </Link>
            {isAdmin && (
              <Link href={`/${locale}/admin/prices`} className="text-sm font-medium text-wheat-gold hover:opacity-80">
                {t('admin')}
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <LangToggle current={locale} />
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: `/${locale}` });
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                {t('logout')}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-cream/30">{children}</main>
    </div>
  );
}
