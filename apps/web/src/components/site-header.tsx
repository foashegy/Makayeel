import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { BrandMark, LangToggle, ThemeToggle, Button } from '@makayeel/ui';
import { auth } from '@/auth';
import type { Locale } from '@makayeel/i18n';
import { MobileNav } from './mobile-nav';

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'nav' });
  const session = await auth();
  const user = session?.user;
  // @ts-expect-error — role is attached via auth callback
  const isAdmin = user?.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-50 border-b border-navy/8 bg-paper-white/90 backdrop-blur-sm dark:border-paper-white/10 dark:bg-[#0E1A26]/85">
      <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
        <Link href={`/${locale}`} aria-label="Makayeel home">
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href={`/${locale}/prices`} className="text-sm font-medium text-deep-navy hover:opacity-70 dark:text-paper-white">
            {t('prices')}
          </Link>
          <Link href={`/${locale}/pricing`} className="text-sm font-medium text-deep-navy hover:opacity-70 dark:text-paper-white">
            {t('pricing')}
          </Link>
          <Link href={`/${locale}/about`} className="text-sm font-medium text-deep-navy hover:opacity-70 dark:text-paper-white">
            {t('about')}
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <MobileNav
            locale={locale}
            links={[
              { href: `/${locale}/prices`, label: t('prices') },
              { href: `/${locale}/pricing`, label: t('pricing') },
              { href: `/${locale}/about`, label: t('about') },
            ]}
            ctaHref={user ? `/${locale}/dashboard` : `/${locale}/login`}
            ctaLabel={user ? t('dashboard') : t('login')}
          />
          <ThemeToggle />
          <LangToggle current={locale} />
          {user ? (
            <>
              {isAdmin && (
                <Link
                  href={`/${locale}/admin/prices`}
                  className="hidden text-sm font-medium text-deep-navy hover:opacity-70 sm:inline"
                >
                  {t('admin')}
                </Link>
              )}
              <Button asChild size="sm">
                <Link href={`/${locale}/dashboard`}>{t('dashboard')}</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link href={`/${locale}/login`}>{t('login')}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
