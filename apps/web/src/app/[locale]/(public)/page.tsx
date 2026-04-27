import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button, PriceCard, formatShortTime } from '@makayeel/ui';
import { getTodayPrices } from '@/lib/queries';
import type { Locale } from '@makayeel/i18n';
import { isLocale } from '@makayeel/i18n';
import { notFound } from 'next/navigation';

export const revalidate = 300; // 5 min

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const t = await getTranslations({ locale, namespace: 'landing' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const prices = (await getTodayPrices()).slice(0, 6);
  const updatedAt = prices[0] ? new Date(prices[0].date) : new Date();

  return (
    <>
      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cream to-paper-white py-20">
        <div className="mx-auto grid max-w-content items-center gap-12 px-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[2px] text-wheat-gold">
              {t('hero.kicker')}
            </p>
            <h1 className="mb-5 text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[1.15] text-deep-navy">
              {t('hero.titleBase')}{' '}
              <span className="text-wheat-gold">{t('hero.titleAccent')}</span>
            </h1>
            <p className="mb-8 max-w-[38em] text-lg text-charcoal/80">{t('hero.subtitle')}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/${locale}/prices`}>{t('hero.ctaPrimary')}</Link>
              </Button>
              <Button asChild variant="ghost">
                <a href="https://t.me/MakayeelBot" target="_blank" rel="noreferrer">
                  {t('hero.ctaSecondary')}
                </a>
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap gap-8 text-sm text-charcoal/65">
              <span className="before:me-2 before:font-bold before:text-harvest-green before:content-['✓']">
                {t('hero.trustSources')}
              </span>
              <span className="before:me-2 before:font-bold before:text-harvest-green before:content-['✓']">
                {t('hero.trustCommodities')}
              </span>
              <span className="before:me-2 before:font-bold before:text-harvest-green before:content-['✓']">
                {t('hero.trustUpdate')}
              </span>
              <span className="before:me-2 before:font-bold before:text-harvest-green before:content-['✓']">
                {t('hero.trustAlerts')}
              </span>
            </div>
          </div>

          {/* Today's prices widget */}
          <aside className="rounded-2xl border border-navy/8 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-baseline justify-between border-b border-navy/8 pb-3">
              <h3 className="text-base font-medium text-deep-navy">{t('snapshotTitle')}</h3>
              <span className="font-mono text-xs text-navy-200" data-numeric>
                {formatShortTime(updatedAt, locale)}
              </span>
            </div>
            {prices.length === 0 ? (
              <p className="py-6 text-center text-sm text-navy-200">— no data yet —</p>
            ) : (
              <div className="space-y-2">
                {prices.map((p) => (
                  <PriceCard
                    key={p.priceId}
                    slug={p.commoditySlug}
                    iconKey={p.commodityIconKey}
                    nameAr={p.commodityNameAr}
                    nameEn={p.commodityNameEn}
                    unit={p.unit}
                    currentPrice={p.value}
                    previousPrice={p.previous}
                    locale={locale}
                    sourceLabel={locale === 'ar' ? p.sourceNameAr : p.sourceNameEn}
                    compact
                    className="shadow-none border-navy/5"
                  />
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-content px-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[2px] text-wheat-gold">
            {t('features.kicker')}
          </p>
          <h2 className="mb-4 text-[clamp(1.75rem,3vw,2.5rem)] font-medium leading-tight text-deep-navy">
            {t('features.title')}
          </h2>
          <p className="mb-12 max-w-[40em] text-charcoal/75">{t('features.lead')}</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                { k: 'live', icon: '📊' },
                { k: 'alerts', icon: '🔔' },
                { k: 'bot', icon: '🤖' },
                { k: 'api', icon: '⚡' },
              ] as const
            ).map((f) => (
              <div
                key={f.k}
                className="rounded-2xl border border-navy/8 bg-white p-7 transition hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-lg text-wheat-gold">
                  {f.icon}
                </div>
                <h4 className="mb-2 text-base font-medium text-deep-navy">
                  {t(`features.${f.k}Title`)}
                </h4>
                <p className="text-sm text-charcoal/75">{t(`features.${f.k}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="bg-deep-navy py-16 text-white">
        <div className="mx-auto max-w-content px-6 text-center">
          <h2 className="mb-3 text-[clamp(1.75rem,3vw,2.5rem)] font-medium">{t('cta.title')}</h2>
          <p className="mx-auto mb-8 max-w-[40em] text-white/75">{t('cta.subtitle')}</p>
          <Button asChild size="lg">
            <Link href={`/${locale}/signup`}>{t('cta.button')}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
