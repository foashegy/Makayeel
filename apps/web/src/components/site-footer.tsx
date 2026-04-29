import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@makayeel/i18n';

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'footer' });
  return (
    <footer className="border-t border-navy/8 py-8 text-center text-sm text-navy-200">
      <div className="mx-auto max-w-content px-6">
        <p className="mx-auto mb-4 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
          {locale === 'ar'
            ? 'الأسعار المعروضة استرشادية مبنية على مصادر السوق وتقديرات داخلية. ليست عرض بيع وليست أساساً للتعاقد. للتأكد من السعر تواصل مع المورد مباشرة.'
            : 'All prices shown are indicative, drawn from market sources and internal estimates. They are neither an offer to sell nor a basis for any contract. Confirm with the supplier before any transaction.'}
        </p>
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
