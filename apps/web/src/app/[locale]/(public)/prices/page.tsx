import { getTranslations } from 'next-intl/server';
import { PriceTable, type PriceTableRow, DeltaBadge, CommodityIcon, formatPrice } from '@makayeel/ui';
import { getTodayPrices } from '@/lib/queries';
import type { Locale } from '@makayeel/i18n';
import { isLocale } from '@makayeel/i18n';
import { notFound } from 'next/navigation';
import type { CommodityCategory } from '@makayeel/db/types';

export const revalidate = 300;

const CATEGORY_FILTERS: { key: string; value: CommodityCategory | null }[] = [
  { key: 'all', value: null },
  { key: 'grains', value: 'GRAINS' },
  { key: 'proteins', value: 'PROTEINS' },
  { key: 'byproducts', value: 'BYPRODUCTS' },
];

export default async function PricesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; view?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const { category, view } = await searchParams;

  const t = await getTranslations({ locale, namespace: 'prices' });
  const active = (category?.toUpperCase() ?? null) as CommodityCategory | null;
  const rows = await getTodayPrices(active ? { category: active } : undefined);
  const activeView: 'summary' | 'sources' = view === 'sources' ? 'sources' : 'summary';

  // Per-commodity summary: median price, range, delta, any estimated source.
  // This is the "buyer-think" view (Product/UX seat) — one number per commodity.
  type Summary = {
    slug: string;
    iconKey: string | null;
    nameAr: string;
    nameEn: string;
    unit: string;
    median: number;
    min: number;
    max: number;
    medianPrev: number | null;
    isEstimated: boolean;
    sourceRef: string | null;
    sourceCount: number;
    deltaPct: number; // signed % vs medianPrev
  };
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const arr = groups.get(r.commoditySlug) ?? [];
    arr.push(r);
    groups.set(r.commoditySlug, arr);
  }
  const median = (xs: number[]): number => {
    if (xs.length === 0) return 0;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    if (s.length % 2) return s[m]!;
    return ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
  };
  const summary: Summary[] = [...groups.entries()].flatMap(([slug, gs]) => {
    const head = gs[0];
    if (!head) return [];
    const values = gs.map((g) => g.value);
    const prev = gs.map((g) => g.previous).filter((p): p is number => p != null);
    const med = median(values);
    const medPrev = prev.length ? median(prev) : null;
    const deltaPct = medPrev && medPrev !== 0 ? ((med - medPrev) / medPrev) * 100 : 0;
    return [{
      slug,
      iconKey: head.commodityIconKey,
      nameAr: head.commodityNameAr,
      nameEn: head.commodityNameEn,
      unit: head.unit,
      median: med,
      min: Math.min(...values),
      max: Math.max(...values),
      medianPrev: medPrev,
      isEstimated: gs.some((g) => g.isEstimated),
      sourceRef: gs.find((g) => g.sourceRef)?.sourceRef ?? null,
      sourceCount: new Set(gs.map((g) => g.sourceSlug)).size,
      deltaPct,
    }];
  });

  // Pick the commodity with the biggest absolute move today as the hero card.
  const hero = summary.length > 0
    ? [...summary].sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))[0]
    : null;
  const heroSlug = hero?.slug;

  const tableRows: PriceTableRow[] = rows.map((r) => ({
    priceId: r.priceId,
    commoditySlug: r.commoditySlug,
    commodityIconKey: r.commodityIconKey,
    commodityNameAr: r.commodityNameAr,
    commodityNameEn: r.commodityNameEn,
    commodityCategory: r.commodityCategory,
    sourceSlug: r.sourceSlug,
    sourceNameAr: r.sourceNameAr,
    sourceNameEn: r.sourceNameEn,
    sourceType: r.sourceType,
    value: r.value,
    previous: r.previous,
    unit: r.unit,
    date: r.date,
    isEstimated: r.isEstimated,
    sourceRef: r.sourceRef,
  }));

  // Latest updatedAt across the rows we just fetched — shown to the user as
  // "آخر تحديث: ..." so they don't trade against stale data.
  const latestUpdated = rows.reduce<Date | null>((acc, r) => {
    const d = new Date(r.date);
    return !acc || d > acc ? d : acc;
  }, null);
  const updatedLabelAr = latestUpdated
    ? new Intl.DateTimeFormat('ar-EG', {
        timeZone: 'Africa/Cairo',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(latestUpdated)
    : null;
  const updatedLabelEn = latestUpdated
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Cairo',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(latestUpdated)
    : null;

  // WhatsApp CTA — Makayeel main line; mill owners trust a phone number more
  // than a contact form (per Risk + Product/UX seat memos, 29 Apr 2026 board).
  const waNumber = '201555001688';
  const waMessage = encodeURIComponent(
    locale === 'ar'
      ? 'السلام عليكم — استفسار عن أسعار خامات الأعلاف'
      : 'Hello — feed-grain price inquiry',
  );
  const waHref = `https://wa.me/${waNumber}?text=${waMessage}`;

  const sourceCount = new Set(rows.map((r) => r.sourceSlug)).size;

  return (
    <div>
      {/* Sticky freshness bar — primary trust signal, always visible. */}
      <div className="sticky top-0 z-10 border-b border-navy-200/60 bg-deep-navy text-paper-white shadow-sm">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-3 px-6 py-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
            <span className="font-semibold text-wheat-gold">
              ● {locale === 'ar' ? 'مباشر' : 'LIVE'}
            </span>
            <span data-numeric>
              {locale === 'ar' ? 'النهاردة' : 'Today'} · {summary.length}
              {' '}
              {locale === 'ar' ? 'سلعة' : 'commodities'}
            </span>
            <span data-numeric>
              {sourceCount} {locale === 'ar' ? 'مصادر' : 'sources'}
            </span>
            {updatedLabelAr ? (
              <span data-numeric className="opacity-80">
                {locale === 'ar' ? 'آخر تحديث: ' : 'Updated: '}
                {locale === 'ar' ? updatedLabelAr : updatedLabelEn}
              </span>
            ) : null}
          </div>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.768.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.04 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.453 3.488z" />
            </svg>
            {locale === 'ar' ? 'واتساب' : 'WhatsApp'}
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-content px-6 py-10">
        <h1 className="mb-2 font-display text-4xl text-deep-navy md:text-5xl">{t('pageTitle')}</h1>
        <p className="mb-8 text-charcoal/75">{t('pageLead')}</p>

        {/* Category filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((f) => {
            const href = f.value
              ? `/${locale}/prices?category=${f.value.toLowerCase()}${activeView === 'sources' ? '&view=sources' : ''}`
              : `/${locale}/prices${activeView === 'sources' ? '?view=sources' : ''}`;
            const isActive = active === f.value || (!active && f.value === null);
            return (
              <a
                key={f.key}
                href={href}
                className={
                  isActive
                    ? 'rounded-full bg-deep-navy px-4 py-1.5 text-sm font-medium text-paper-white'
                    : 'rounded-full border border-navy/15 px-4 py-1.5 text-sm font-medium text-deep-navy hover:bg-navy/5'
                }
              >
                {t(`filters.${f.key}`)}
              </a>
            );
          })}
        </div>

        {/* View tabs — Summary (median per commodity) vs Sources (full breakdown) */}
        <div className="mb-6 inline-flex rounded-full border border-navy/15 bg-white p-1 text-sm font-medium">
          <a
            href={`/${locale}/prices${active ? `?category=${active.toLowerCase()}` : ''}`}
            className={
              activeView === 'summary'
                ? 'rounded-full bg-deep-navy px-4 py-1.5 text-paper-white'
                : 'rounded-full px-4 py-1.5 text-deep-navy hover:bg-navy/5'
            }
          >
            {locale === 'ar' ? 'وسيط السعر' : 'Median'}
          </a>
          <a
            href={`/${locale}/prices?view=sources${active ? `&category=${active.toLowerCase()}` : ''}`}
            className={
              activeView === 'sources'
                ? 'rounded-full bg-deep-navy px-4 py-1.5 text-paper-white'
                : 'rounded-full px-4 py-1.5 text-deep-navy hover:bg-navy/5'
            }
          >
            {locale === 'ar' ? 'بالمصدر' : 'By source'}
          </a>
        </div>

        {activeView === 'summary' ? (
          /* Summary cards — featured + grid; hero gets dark card spanning 2 cols. */
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {summary.map((s) => {
              const name = locale === 'ar' ? s.nameAr : s.nameEn;
              const subtitle = locale === 'ar' ? s.nameEn : s.nameAr;
              const isHero = s.slug === heroSlug && Math.abs(s.deltaPct) >= 0.5;
              if (isHero) {
                return (
                  <div
                    key={s.slug}
                    className="rounded-2xl border border-wheat-gold/30 bg-deep-navy p-6 text-paper-white shadow-card transition hover:shadow-card-hover hover:-translate-y-0.5 sm:col-span-2 xl:col-span-2"
                  >
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wheat-gold/15 text-wheat-gold">
                        <CommodityIcon slug={s.slug} iconKey={s.iconKey} nameAr={s.nameAr} size="md" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-wheat-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-wheat-gold">
                          {locale === 'ar' ? '🔥 أكبر حركة اليوم' : '🔥 Top mover today'}
                        </div>
                        <h3 className="truncate font-display text-2xl text-paper-white">{name}</h3>
                        <p className="truncate text-xs text-paper-white/60">{subtitle}</p>
                      </div>
                      <DeltaBadge current={s.median} previous={s.medianPrev} locale={locale} size="md" />
                    </div>
                    <div className="font-mono text-6xl font-bold leading-none tracking-tight text-wheat-gold" data-numeric>
                      {formatPrice(s.median, locale)}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-paper-white/70" data-numeric>
                      <span className="font-semibold text-paper-white/90">{s.unit}</span>
                      <span>
                        {locale === 'ar' ? 'النطاق' : 'Range'}: {formatPrice(s.min, locale)} – {formatPrice(s.max, locale)}
                      </span>
                      <span>
                        {s.sourceCount} {locale === 'ar' ? 'مصادر' : 'sources'}
                      </span>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={s.slug}
                  className="rounded-2xl border border-navy/8 bg-white p-5 shadow-card transition hover:shadow-card-hover hover:-translate-y-0.5"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <CommodityIcon slug={s.slug} iconKey={s.iconKey} nameAr={s.nameAr} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-display text-base text-deep-navy">{name}</h3>
                        {s.isEstimated ? (
                          <span
                            title={s.sourceRef ?? ''}
                            className="rounded-full border border-amber-400/60 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                          >
                            {locale === 'ar' ? 'تقدير' : 'estimate'}
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-[11px] text-navy-200">{subtitle}</p>
                    </div>
                    <DeltaBadge current={s.median} previous={s.medianPrev} locale={locale} size="sm" />
                  </div>
                  <div className="mb-1 font-mono text-4xl font-bold leading-none tracking-tight text-deep-navy" data-numeric>
                    {formatPrice(s.median, locale)}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-navy-200" data-numeric>
                    <span>{s.unit}</span>
                    <span>
                      {locale === 'ar'
                        ? `${formatPrice(s.min, locale)} – ${formatPrice(s.max, locale)}`
                        : `${formatPrice(s.min, locale)} – ${formatPrice(s.max, locale)}`}
                    </span>
                    <span>
                      {s.sourceCount} {locale === 'ar' ? 'مصادر' : 'src'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Full source breakdown — power-user view */
          <div className="mb-8">
            <PriceTable
              rows={tableRows}
              locale={locale}
              labels={{
                commodity: t('table.commodity'),
                source: t('table.source'),
                price: t('table.price'),
                delta: t('table.delta'),
                unit: t('table.unit'),
              }}
              emptyLabel={t('noData')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
