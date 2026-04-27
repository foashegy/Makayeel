import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { BrandMark, LangToggle, Button } from '@makayeel/ui';
import { auth, signOut } from '@/auth';
import { isLocale, type Locale } from '@makayeel/i18n';
import { notFound } from 'next/navigation';

export default async function AdminLayout({
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
  // @ts-expect-error — role attached by auth callback
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect(`/${locale}/login`);
  }
  const t = await getTranslations({ locale, namespace: 'admin' });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-navy/8 bg-deep-navy text-paper-white">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
          <Link href={`/${locale}/admin/prices`} className="flex items-center gap-3">
            <BrandMark />
            <span className="rounded-full bg-wheat-gold px-2 py-0.5 text-xs font-semibold text-deep-navy">
              ADMIN
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href={`/${locale}/admin/prices`} className="text-sm hover:text-wheat-gold">
              {locale === 'ar' ? 'الأسعار' : 'Prices'}
            </Link>
            <Link href={`/${locale}/admin/commodities`} className="text-sm hover:text-wheat-gold">
              {t('commoditiesTitle')}
            </Link>
            <Link href={`/${locale}/admin/sources`} className="text-sm hover:text-wheat-gold">
              {t('sourcesTitle')}
            </Link>
            <Link href={`/${locale}/admin/users`} className="text-sm hover:text-wheat-gold">
              {t('usersTitle')}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <LangToggle current={locale} />
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: `/${locale}` });
              }}
            >
              <Button type="submit" variant="ghost" size="sm" className="border-paper-white/20 text-paper-white hover:bg-white/5">
                ↩
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-cream/30">{children}</main>
    </div>
  );
}
