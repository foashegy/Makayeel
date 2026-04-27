import { getTranslations } from 'next-intl/server';
import { Button } from '@makayeel/ui';
import { WaitlistModal } from '@/components/waitlist-modal';
import type { Locale } from '@makayeel/i18n';
import { isLocale } from '@makayeel/i18n';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const t = await getTranslations({ locale, namespace: 'pricing' });

  const tiers = ['free', 'pro', 'enterprise'] as const;

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[2px] text-wheat-gold">
        {t('kicker')}
      </p>
      <h1 className="mb-4 text-center text-[clamp(1.75rem,3vw,2.5rem)] font-medium text-deep-navy">
        {t('title')}
      </h1>
      <p className="mx-auto mb-12 max-w-[40em] text-center text-charcoal/75">{t('lead')}</p>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const isHighlight = tier === 'pro';
          const features = t.raw(`${tier}.features`) as string[];
          return (
            <div
              key={tier}
              className={
                isHighlight
                  ? 'relative scale-[1.02] rounded-2xl border-2 border-wheat-gold bg-white p-8'
                  : 'rounded-2xl border border-navy/8 bg-white p-8'
              }
            >
              {isHighlight && (
                <span className="absolute -top-3 start-6 rounded-full bg-wheat-gold px-3 py-1 text-xs font-semibold text-deep-navy">
                  {t('badgePopular')}
                </span>
              )}
              <h4 className="text-lg font-semibold text-deep-navy">{t(`${tier}.name`)}</h4>
              {tier === 'enterprise' ? (
                <div className="mt-4 text-lg text-navy-200">{t('contact')}</div>
              ) : (
                <div className="mt-4 text-4xl font-medium text-deep-navy">
                  {t(`${tier}.price`)}{' '}
                  <span className="text-base text-navy-200">
                    {tier === 'pro' ? t('perMonth') : locale === 'ar' ? 'جنيه' : 'EGP'}
                  </span>
                </div>
              )}
              <ul className="my-6 space-y-2">
                {features.map((f: string) => (
                  <li
                    key={f}
                    className="text-sm text-charcoal/80 before:me-2 before:font-bold before:text-harvest-green before:content-['✓']"
                  >
                    {f}
                  </li>
                ))}
              </ul>
              {tier === 'pro' ? (
                <WaitlistModal
                  locale={locale}
                  trigger={<Button className="w-full">{t('pro.cta')}</Button>}
                  waitlistCopy={t('pro.waitlist')}
                />
              ) : (
                <Button asChild variant={isHighlight ? 'primary' : 'ghost'} className="w-full">
                  <Link href={tier === 'free' ? `/${locale}/signup` : `/${locale}/about`}>
                    {t(`${tier}.cta`)}
                  </Link>
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
