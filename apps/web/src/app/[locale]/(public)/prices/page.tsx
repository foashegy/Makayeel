import { getTranslations } from 'next-intl/server';
import { PriceTable, type PriceTableRow } from '@makayeel/ui';
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
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const { category } = await searchParams;

  const t = await getTranslations({ locale, namespace: 'prices' });
  const active = (category?.toUpperCase() ?? null) as CommodityCategory | null;
  const rows = await getTodayPrices(active ? { category: active } : undefined);

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

  // WhatsApp CTA — ATEN STUDIO ops number; mill owners trust a phone number more
  // than a contact form (per Risk + Product/UX seat memos, 29 Apr 2026 board).
  const waNumber = '201557999780';
  const waMessage = encodeURIComponent(
    locale === 'ar'
      ? 'السلام عليكم — استفسار عن أسعار خامات الأعلاف'
      : 'Hello — feed-grain price inquiry',
  );
  const waHref = `https://wa.me/${waNumber}?text=${waMessage}`;

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <h1 className="mb-2 text-3xl font-medium text-deep-navy">{t('pageTitle')}</h1>
      <p className="mb-3 text-charcoal/75">{t('pageLead')}</p>
      <div className="mb-8 flex flex-wrap items-center gap-3 text-sm">
        {updatedLabelAr ? (
          <span className="rounded-full bg-cream/60 px-3 py-1.5 text-charcoal/80">
            {locale === 'ar'
              ? `آخر تحديث: ${updatedLabelAr}`
              : `Last updated: ${updatedLabelEn}`}
          </span>
        ) : null}
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 font-medium text-white shadow-sm hover:bg-emerald-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.768.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.04 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.453 3.488z" />
          </svg>
          {locale === 'ar' ? 'تأكيد سعر على واتساب' : 'Confirm price on WhatsApp'}
        </a>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((f) => {
          const href = f.value
            ? `/${locale}/prices?category=${f.value.toLowerCase()}`
            : `/${locale}/prices`;
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
  );
}
