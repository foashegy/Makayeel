import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@makayeel/i18n';

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'footer' });
  return (
    <footer className="border-t border-navy/8 py-8 text-center text-sm text-navy-200">
      <div className="mx-auto max-w-content px-6">
        <nav className="mb-3 flex justify-center gap-6">
          <Link href={`/${locale}/about`} className="hover:text-deep-navy">
            {t('contact')}
          </Link>
          <Link href={`/${locale}/privacy`} className="hover:text-deep-navy">
            {t('privacy')}
          </Link>
          <Link href={`/${locale}/terms`} className="hover:text-deep-navy">
            {t('terms')}
          </Link>
        </nav>
        <p>{t('rights')}</p>
      </div>
    </footer>
  );
}
