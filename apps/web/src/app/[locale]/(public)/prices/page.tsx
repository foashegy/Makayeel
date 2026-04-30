import { getTranslations } from 'next-intl/server';
import { PriceTable, type PriceTableRow, DeltaBadge, CommodityIcon, Sparkline, formatPrice } from '@makayeel/ui';
import { getTodayPrices, getRecentSparklines, getMillQuotesForToday } from '@/lib/queries';
import { auth } from '@/auth';
import { prisma } from '@makayeel/db';
import { WatchlistStar } from '@/components/watchlist-star';
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
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const [rows, sparklines, watchlist, millQuotes] = await Promise.all([
    getTodayPrices(active ? { category: active } : undefined),
    getRecentSparklines(30),
    userId
      ? prisma.watchlist
          .findMany({ where: { userId }, include: { commodity: { select: { slug: true } } } })
          .then((rs) => new Set(rs.map((r) => r.commodity.slug)))
      : Promise.resolve(new Set<string>()),
    getMillQuotesForToday(),
  ]);
  const activeView: 'summary' | 'sources' | 'mills' =
    view === 'sources' ? 'sources' : view === 'mills' ? 'mills' : 'summary';

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
        <h1 className="mb-2 font-display text-4xl text-deep-navy md:text-5xl dark:text-paper-white">{t('pageTitle')}</h1>
        <p className="mb-8 text-charcoal/75 dark:text-paper-white/70">{t('pageLead')}</p>

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
                    ? 'rounded-full bg-deep-navy px-4 py-1.5 text-sm font-medium text-paper-white dark:bg-wheat-gold dark:text-deep-navy'
                    : 'rounded-full border border-navy/15 px-4 py-1.5 text-sm font-medium text-deep-navy hover:bg-navy/5 dark:border-paper-white/15 dark:text-paper-white dark:hover:bg-paper-white/10'
                }
              >
                {t(`filters.${f.key}`)}
              </a>
            );
          })}
        </div>

        {/* View tabs — Summary (median per commodity) vs Sources (full breakdown) */}
        <div className="mb-6 inline-flex rounded-full border border-navy/15 bg-white p-1 text-sm font-medium dark:border-paper-white/15 dark:bg-[#152535]">
          <a
            href={`/${locale}/prices${active ? `?category=${active.toLowerCase()}` : ''}`}
            className={
              activeView === 'summary'
                ? 'rounded-full bg-deep-navy px-4 py-1.5 text-paper-white dark:bg-wheat-gold dark:text-deep-navy'
                : 'rounded-full px-4 py-1.5 text-deep-navy hover:bg-navy/5 dark:text-paper-white dark:hover:bg-paper-white/10'
            }
          >
            {locale === 'ar' ? 'وسيط السعر' : 'Median'}
          </a>
          <a
            href={`/${locale}/prices?view=sources${active ? `&category=${active.toLowerCase()}` : ''}`}
            className={
              activeView === 'sources'
                ? 'rounded-full bg-deep-navy px-4 py-1.5 text-paper-white dark:bg-wheat-gold dark:text-deep-navy'
                : 'rounded-full px-4 py-1.5 text-deep-navy hover:bg-navy/5 dark:text-paper-white dark:hover:bg-paper-white/10'
            }
          >
            {locale === 'ar' ? 'بالمصدر' : 'By source'}
          </a>
          {millQuotes.length > 0 ? (
            <a
              href={`/${locale}/prices?view=mills${active ? `&category=${active.toLowerCase()}` : ''}`}
              className={
                activeView === 'mills'
                  ? 'rounded-full bg-deep-navy px-4 py-1.5 text-paper-white dark:bg-wheat-gold dark:text-deep-navy'
                  : 'rounded-full px-4 py-1.5 text-deep-navy hover:bg-navy/5 dark:text-paper-white dark:hover:bg-paper-white/10'
              }
            >
              🏭 {locale === 'ar' ? `المصانع · ${millQuotes.length}` : `Mills · ${millQuotes.length}`}
            </a>
          ) : null}
        </div>

        {activeView === 'summary' ? (
          /* Summary cards — featured + grid; hero gets dark card spanning 2 cols. */
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {summary.map((s) => {
              const name = locale === 'ar' ? s.nameAr : s.nameEn;
              const subtitle = locale === 'ar' ? s.nameEn : s.nameAr;
              const isHero = s.slug === heroSlug && Math.abs(s.deltaPct) >= 0.5;
              const series = sparklines.get(s.slug) ?? [];
              if (isHero) {
                return (
                  <div
                    key={s.slug}
                    className="rounded-2xl border border-wheat-gold/30 bg-deep-navy p-6 text-paper-white shadow-card transition hover:shadow-card-hover hover:-translate-y-0.5 sm:col-span-2 xl:col-span-2 dark:bg-[#1C3352] dark:border-wheat-gold/60 dark:ring-1 dark:ring-wheat-gold/25"
                  >
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wheat-gold/15 text-wheat-gold">
                        <CommodityIcon slug={s.slug} iconKey={s.iconKey} nameAr={s.nameAr} size="md" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-wheat-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-wheat-gold">
                          {locale === 'ar' ? '🔥 أكبر حركة اليوم' : '🔥 Top mover today'}
                        </div>
                        <h3 className="font-display text-lg leading-tight text-paper-white sm:text-xl md:text-2xl line-clamp-2">{name}</h3>
                        <p className="truncate text-[11px] text-paper-white/60 sm:text-xs">{subtitle}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <WatchlistStar slug={s.slug} initialPinned={watchlist.has(s.slug)} signedIn={!!userId} locale={locale} />
                        <DeltaBadge current={s.median} previous={s.medianPrev} locale={locale} size="md" />
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-4">
                      <div className="font-mono text-6xl font-bold leading-none tracking-tight text-wheat-gold" data-numeric>
                        {formatPrice(s.median, locale)}
                      </div>
                      {series.length >= 2 ? (
                        <div className="ltr shrink-0 text-paper-white/85" dir="ltr">
                          <Sparkline values={series} width={180} height={48} />
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-paper-white/70" data-numeric>
                      <span className="font-semibold text-paper-white/90">{s.unit}</span>
                      <span>
                        {locale === 'ar' ? 'النطاق' : 'Range'}: {formatPrice(s.min, locale)} – {formatPrice(s.max, locale)}
                      </span>
                      <span>
                        {s.sourceCount} {locale === 'ar' ? 'مصادر' : 'sources'}
                      </span>
                      {series.length >= 2 ? (
                        <span>
                          {locale === 'ar' ? 'آخر' : 'Last'} {series.length} {locale === 'ar' ? 'يوم' : 'days'}
                        </span>
                      ) : null}
                    </div>
                    <a
                      href={`https://wa.me/201555001688?text=${encodeURIComponent(
                        locale === 'ar'
                          ? `السلام عليكم، عايز أطلب ${s.nameAr} — السعر اليوم ${formatPrice(s.median, 'ar')} ${s.unit}.\nالكمية: ___ طن`
                          : `Hello, I'd like to order ${s.nameEn} — today's price ${formatPrice(s.median, 'en')} ${s.unit}.\nQuantity: ___ tons`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-wheat-gold px-4 py-2.5 text-sm font-bold text-deep-navy transition hover:bg-wheat-gold/90"
                    >
                      🛒 {locale === 'ar' ? 'اطلب على واتساب' : 'Order on WhatsApp'}
                    </a>
                  </div>
                );
              }
              return (
                <div
                  key={s.slug}
                  className="rounded-2xl border border-navy/8 bg-white p-4 shadow-card transition hover:shadow-card-hover hover:-translate-y-0.5 dark:border-paper-white/10 dark:bg-[#152535] sm:p-5"
                >
                  {/* Mobile-first: name gets its own row at the top, then a
                      row with icon + accessories below. Desktop hides the
                      duplicate icon and uses the original 2-col layout. */}
                  <div className="mb-3 flex items-start gap-2.5">
                    <CommodityIcon slug={s.slug} iconKey={s.iconKey} nameAr={s.nameAr} size="sm" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-sm leading-tight text-deep-navy dark:text-paper-white sm:text-base line-clamp-2">{name}</h3>
                      <p className="mt-0.5 truncate text-[10px] text-navy-200 sm:text-[11px]">{subtitle}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {s.isEstimated ? (
                        <span
                          title={s.sourceRef ?? ''}
                          className="rounded-full border border-amber-400/60 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                        >
                          {locale === 'ar' ? 'تقدير' : 'estimate'}
                        </span>
                      ) : null}
                      <WatchlistStar slug={s.slug} initialPinned={watchlist.has(s.slug)} signedIn={!!userId} locale={locale} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div className="font-mono text-3xl font-bold leading-none tracking-tight text-deep-navy dark:text-paper-white sm:text-4xl" data-numeric>
                      {formatPrice(s.median, locale)}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <DeltaBadge current={s.median} previous={s.medianPrev} locale={locale} size="sm" />
                      {series.length >= 2 ? (
                        <div className="ltr" dir="ltr">
                          <Sparkline values={series} width={72} height={22} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-navy-200 dark:text-paper-white/55" data-numeric>
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
                  {/* Order CTA — pre-filled WhatsApp message routes the
                      visitor to Mohamed's WA with commodity name + today's
                      price + a quantity placeholder for the buyer to fill. */}
                  <a
                    href={`https://wa.me/201555001688?text=${encodeURIComponent(
                      locale === 'ar'
                        ? `السلام عليكم، عايز أطلب ${s.nameAr} — السعر اليوم ${formatPrice(s.median, 'ar')} ${s.unit}.\nالكمية المطلوبة: ___ طن\nالاسم: ___`
                        : `Hello, I'd like to order ${s.nameEn} — today's price ${formatPrice(s.median, 'en')} ${s.unit}.\nQuantity: ___ tons\nName: ___`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.768.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.04 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.453 3.488z" />
                    </svg>
                    {locale === 'ar' ? 'اطلب الآن' : 'Order now'}
                  </a>
                </div>
              );
            })}
          </div>
        ) : activeView === 'sources' ? (
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
        ) : (
          /* Mills view — crowd consensus from FACTORY-type sources only.
             This is the "moat" surface: shows how many mills have submitted
             today + the median + range. Builds buyer trust + signals network
             effects to mill operators ("look how many of your peers are here"). */
          <div className="mb-8">
            <div className="mb-4 rounded-2xl border border-wheat-gold/30 bg-wheat-gold/5 p-4 text-sm text-deep-navy dark:bg-wheat-gold/10 dark:text-paper-white">
              {locale === 'ar'
                ? '🏭 الأسعار اللي بعتوها أصحاب المصانع نفسهم — Crowd consensus من ' + millQuotes.length + ' سلعة. كل سعر هنا متعرّض في صورة لوحة أسعار رسمية من المصنع.'
                : `🏭 Prices submitted by mill operators themselves — crowd consensus across ${millQuotes.length} commodities. Every quote here is sourced from an official mill price-sheet photo.`}
            </div>
            {millQuotes.length === 0 ? (
              <p className="rounded-xl border border-navy/8 bg-white p-8 text-center text-navy-200 dark:border-paper-white/10 dark:bg-[#152535] dark:text-paper-white/55">
                {locale === 'ar' ? 'مفيش أسعار من المصانع لسه. شجع مصنعك يبعت /عرض على بوت تيليجرام.' : 'No mill quotes yet. Invite your mill to submit via /عرض on Telegram.'}
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {millQuotes.map((m) => {
                  const name = locale === 'ar' ? m.nameAr : m.nameEn;
                  const subtitle = locale === 'ar' ? m.nameEn : m.nameAr;
                  return (
                    <div
                      key={m.slug}
                      className="rounded-2xl border border-wheat-gold/30 bg-white p-4 shadow-card transition hover:shadow-card-hover hover:-translate-y-0.5 dark:border-wheat-gold/40 dark:bg-[#152535] sm:p-5"
                    >
                      <div className="mb-3 flex items-start gap-2.5">
                        <CommodityIcon slug={m.slug} iconKey={m.iconKey} nameAr={m.nameAr} size="sm" />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display text-sm leading-tight text-deep-navy dark:text-paper-white sm:text-base line-clamp-2">{name}</h3>
                          <p className="mt-0.5 truncate text-[10px] text-navy-200 dark:text-paper-white/55 sm:text-[11px]">{subtitle}</p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-wheat-gold/15 px-2 py-0.5 text-[11px] font-semibold text-wheat-gold">
                          🏭 {m.millCount}
                        </span>
                      </div>
                      <div className="font-mono text-2xl font-bold leading-none tracking-tight text-deep-navy dark:text-wheat-gold sm:text-3xl" data-numeric>
                        {formatPrice(m.median, locale)}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-navy-200 dark:text-paper-white/55" data-numeric>
                        <span>{m.unit}</span>
                        <span>
                          {locale === 'ar' ? 'مدى' : 'Range'}: {formatPrice(m.min, locale)} – {formatPrice(m.max, locale)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
