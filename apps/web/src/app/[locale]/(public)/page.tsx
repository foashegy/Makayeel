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
  const allPrices = await getTodayPrices();
  const prices = allPrices.slice(0, 6);
  const updatedAt = prices[0] ? new Date(prices[0].date) : new Date();
  const sourceCount = new Set(allPrices.map((p) => p.sourceSlug)).size;
  const commodityCount = new Set(allPrices.map((p) => p.commoditySlug)).size;
  // Pick distinct commodities for the mobile ticker strip (one quote per slug).
  const tickerSeen = new Set<string>();
  const ticker = allPrices
    .filter((p) => {
      if (tickerSeen.has(p.commoditySlug)) return false;
      tickerSeen.add(p.commoditySlug);
      return true;
    })
    .slice(0, 12);

  return (
    <>
      {/* ── Live ticker strip — primary above-the-fold data, animated marquee ── */}
      {ticker.length > 0 ? (
        <div className="marquee-wrapper relative overflow-hidden border-b border-wheat-gold/30 bg-deep-navy text-paper-white">
          {/* Edge fades hint at scroll/loop without breaking the seamless track. */}
          <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-12 bg-gradient-to-r from-deep-navy to-transparent rtl:bg-gradient-to-l" aria-hidden />
          <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-12 bg-gradient-to-l from-deep-navy to-transparent rtl:bg-gradient-to-r" aria-hidden />
          <div className="mx-auto flex max-w-content items-center gap-1 px-3 py-2">
            <span className="me-2 hidden shrink-0 items-center gap-1.5 rounded-full bg-wheat-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-wheat-gold sm:inline-flex">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-wheat-gold" />
              {locale === 'ar' ? 'مباشر' : 'LIVE'}
            </span>
            {/* The track contains TWO copies of the items so translate(-50%) loops seamlessly. */}
            <div className="marquee-track gap-x-6 whitespace-nowrap" aria-label="live price ticker">
              {[...ticker, ...ticker].map((p, idx) => {
                const delta = p.previous && p.previous !== 0 ? ((p.value - p.previous) / p.previous) * 100 : 0;
                const arrow = Math.abs(delta) < 0.05 ? '·' : delta > 0 ? '▲' : '▼';
                const color = Math.abs(delta) < 0.05 ? 'text-paper-white/55' : delta > 0 ? 'text-emerald-300' : 'text-red-300';
                return (
                  <span key={`${p.priceId}-${idx}`} className="inline-flex items-center gap-1.5 font-mono text-xs">
                    <span className="font-medium text-paper-white/95">
                      {locale === 'ar' ? p.commodityNameAr : p.commodityNameEn}
                    </span>
                    <span data-numeric className="text-wheat-gold">
                      {Math.round(p.value).toLocaleString('en-EG')}
                    </span>
                    {Math.abs(delta) >= 0.05 ? (
                      <span data-numeric className={color}>
                        {arrow} {Math.abs(delta).toFixed(1)}%
                      </span>
                    ) : null}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cream to-paper-white py-16 dark:from-[#0E1A26] dark:to-[#152535] lg:py-20">
        <div className="mx-auto grid max-w-content items-center gap-12 px-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[2px] text-wheat-gold">
              {t('hero.kicker')}
            </p>
            <h1 className="mb-5 font-display text-[clamp(2.5rem,5.5vw,4rem)] leading-[1.1] text-deep-navy dark:text-paper-white">
              {t('hero.titleBase')}{' '}
              <span className="text-wheat-gold">{t('hero.titleAccent')}</span>
            </h1>
            <p className="mb-8 max-w-[38em] text-lg text-charcoal/80 dark:text-paper-white/75">{t('hero.subtitle')}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/${locale}/prices`}>{t('hero.ctaPrimary')}</Link>
              </Button>
              <Button asChild variant="ghost">
                <a href="https://t.me/Makayeel_Bot" target="_blank" rel="noreferrer">
                  {t('hero.ctaSecondary')}
                </a>
              </Button>
            </div>
            {/* 3-stat billboard — replaces the 4 small checkmark whispers. */}
            <div className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-navy/10 pt-6">
              <div>
                <div className="font-mono text-3xl font-bold leading-none tracking-tight text-deep-navy dark:text-wheat-gold" data-numeric>
                  {sourceCount}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-charcoal/55">
                  {locale === 'ar' ? 'مصادر مباشرة' : 'live sources'}
                </div>
              </div>
              <div>
                <div className="font-mono text-3xl font-bold leading-none tracking-tight text-deep-navy dark:text-wheat-gold" data-numeric>
                  {commodityCount}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-charcoal/55">
                  {locale === 'ar' ? 'سلعة' : 'commodities'}
                </div>
              </div>
              <div>
                <div className="font-mono text-3xl font-bold leading-none tracking-tight text-deep-navy dark:text-wheat-gold" data-numeric>
                  6<span className="text-base font-medium text-charcoal/55">AM</span>
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-charcoal/55">
                  {locale === 'ar' ? 'تحديث يومي' : 'daily update'}
                </div>
              </div>
            </div>
          </div>

          {/* Today's prices widget */}
          <aside className="rounded-2xl border border-navy/8 bg-white p-6 shadow-card dark:border-paper-white/10 dark:bg-[#152535]">
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
          <h2 className="mb-4 font-display text-[clamp(2rem,3.5vw,2.75rem)] leading-tight text-deep-navy dark:text-paper-white">
            {t('features.title')}
          </h2>
          <p className="mb-12 max-w-[40em] text-charcoal/75 dark:text-paper-white/65">{t('features.lead')}</p>
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
                className="rounded-2xl border border-navy/8 bg-white p-7 transition hover:-translate-y-0.5 hover:shadow-card-hover dark:border-paper-white/10 dark:bg-[#152535]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-lg text-wheat-gold dark:bg-wheat-gold/15">
                  {f.icon}
                </div>
                <h4 className="mb-2 text-base font-medium text-deep-navy dark:text-paper-white">
                  {t(`features.${f.k}Title`)}
                </h4>
                <p className="text-sm text-charcoal/75 dark:text-paper-white/65">{t(`features.${f.k}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="bg-deep-navy py-16 text-white">
        <div className="mx-auto max-w-content px-6 text-center">
          <h2 className="mb-3 font-display text-[clamp(2rem,3.5vw,2.75rem)] leading-tight">{t('cta.title')}</h2>
          <p className="mx-auto mb-8 max-w-[40em] text-white/75">{t('cta.subtitle')}</p>
          <Button asChild size="lg">
            <Link href={`/${locale}/signup`}>{t('cta.button')}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
