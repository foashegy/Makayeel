import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@makayeel/i18n';

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'footer' });
  return (
    <footer className="border-t border-navy/8 py-8 text-center text-sm text-navy-200 dark:border-paper-white/10 dark:text-paper-white/55">
      <div className="mx-auto max-w-content px-6">
        <p className="mx-auto mb-4 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
          {locale === 'ar'
            ? 'الأسعار المعروضة استرشادية مبنية على مصادر السوق وتقديرات داخلية. ليست عرض بيع وليست أساساً للتعاقد. للتأكد من السعر تواصل مع المورد مباشرة.'
            : 'All prices shown are indicative, drawn from market sources and internal estimates. They are neither an offer to sell nor a basis for any contract. Confirm with the supplier before any transaction.'}
        </p>
        <nav className="mb-4 flex justify-center gap-6">
          <Link href={`/${locale}/about`} className="hover:text-deep-navy dark:hover:text-paper-white">
            {t('contact')}
          </Link>
          <Link href={`/${locale}/privacy`} className="hover:text-deep-navy dark:hover:text-paper-white">
            {t('privacy')}
          </Link>
          <Link href={`/${locale}/terms`} className="hover:text-deep-navy dark:hover:text-paper-white">
            {t('terms')}
          </Link>
        </nav>
        <p className="mb-2">{t('rights')}</p>
        <p className="text-xs text-navy-200/80 dark:text-paper-white/45">
          {locale === 'ar' ? (
            <>
              منتج من{' '}
              <a
                href="https://atenstudio.net"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-wheat-gold hover:underline"
              >
                ATEN STUDIO
              </a>{' '}
              ×{' '}
              <a
                href="https://barakafeed.net"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-deep-navy hover:underline dark:text-paper-white"
              >
                بركة للأعلاف
              </a>
            </>
          ) : (
            <>
              A product of{' '}
              <a
                href="https://atenstudio.net"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-wheat-gold hover:underline"
              >
                ATEN STUDIO
              </a>{' '}
              ×{' '}
              <a
                href="https://barakafeed.net"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-deep-navy hover:underline dark:text-paper-white"
              >
                Baraka Feeds
              </a>
            </>
          )}
        </p>
      </div>
    </footer>
  );
}
