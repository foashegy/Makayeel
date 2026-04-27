import { getTranslations } from 'next-intl/server';
import { getActiveCommodities, getActiveSources, cairoToday } from '@/lib/queries';
import { prisma } from '@makayeel/db';
import { AdminPricesGrid } from './admin-prices-grid';
import { isLocale, type Locale } from '@makayeel/i18n';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminPricesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = await getTranslations({ locale, namespace: 'admin' });

  const [commodities, sources, todaysPrices] = await Promise.all([
    getActiveCommodities(),
    getActiveSources(),
    prisma.price.findMany({ where: { date: cairoToday() } }),
  ]);

  const priceMap: Record<string, Record<string, number>> = {};
  for (const p of todaysPrices) {
    priceMap[p.commodityId] ??= {};
    priceMap[p.commodityId]![p.sourceId] = Number(p.value);
  }

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <h1 className="mb-2 text-3xl font-medium text-deep-navy">{t('pricesPageTitle')}</h1>
      <p className="mb-8 text-sm text-charcoal/75">{t('pricesLead')}</p>

      <AdminPricesGrid
        locale={locale}
        commodities={commodities.map((c) => ({
          id: c.id,
          slug: c.slug,
          nameAr: c.nameAr,
          nameEn: c.nameEn,
          unit: c.unit,
        }))}
        sources={sources.map((s) => ({
          id: s.id,
          slug: s.slug,
          nameAr: s.nameAr,
          nameEn: s.nameEn,
        }))}
        initial={priceMap}
        saveLabel={t('saveAll')}
        savedLabel={t('savedToast', { count: 0 })}
      />
    </div>
  );
}
