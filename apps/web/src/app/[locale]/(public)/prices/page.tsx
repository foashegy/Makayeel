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
  }));

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <h1 className="mb-2 text-3xl font-medium text-deep-navy">{t('pageTitle')}</h1>
      <p className="mb-8 text-charcoal/75">{t('pageLead')}</p>

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
