import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import {
  PriceChart,
  DeltaBadge,
  CommodityIcon,
  SourceBadge,
  formatPrice,
  formatDate,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@makayeel/ui';
import {
  getCommodityBySlug,
  getCommodityHistory,
  getCommoditySourceBreakdown,
  getActiveCommodities,
} from '@/lib/queries';
import type { Locale } from '@makayeel/i18n';
import { isLocale } from '@makayeel/i18n';
import Link from 'next/link';

export const revalidate = 300;

export default async function CommodityPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const commodity = await getCommodityBySlug(slug);
  if (!commodity) notFound();

  const t = await getTranslations({ locale, namespace: 'commodity' });
  const [history30, breakdown, others] = await Promise.all([
    getCommodityHistory(slug, 30),
    getCommoditySourceBreakdown(slug),
    getActiveCommodities(),
  ]);

  const name = locale === 'ar' ? commodity.nameAr : commodity.nameEn;
  const altName = locale === 'ar' ? commodity.nameEn : commodity.nameAr;

  const today = history30?.series.at(-1)?.value ?? null;
  const yesterday = history30?.series.at(-2)?.value ?? null;

  const related = others.filter((c) => c.slug !== commodity.slug && c.category === commodity.category).slice(0, 4);

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <div className="mb-8 flex items-start gap-4">
        <CommodityIcon
          slug={commodity.slug}
          iconKey={commodity.iconKey}
          nameAr={commodity.nameAr}
          size="lg"
        />
        <div>
          <h1 className="text-3xl font-medium text-deep-navy">{name}</h1>
          <p className="mt-1 text-sm text-navy-200">{altName} · {commodity.unit}</p>
          {today !== null && (
            <div className="mt-3 flex items-center gap-3">
              <span className="font-mono text-2xl font-medium text-charcoal" data-numeric>
                {formatPrice(today, locale)}
              </span>
              <DeltaBadge current={today} previous={yesterday} locale={locale} />
            </div>
          )}
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-navy/8 bg-white p-6 shadow-card">
        <Tabs defaultValue="30d">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium text-deep-navy">{t('month')}</h3>
            <TabsList>
              <TabsTrigger value="7d">{t('history7')}</TabsTrigger>
              <TabsTrigger value="30d">{t('history30')}</TabsTrigger>
              <TabsTrigger value="90d">{t('history90')}</TabsTrigger>
              <TabsTrigger value="365d">{t('history365')}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="7d">
            <HistoryChart locale={locale} slug={slug} days={7} />
          </TabsContent>
          <TabsContent value="30d">
            <PriceChart data={history30?.series ?? []} locale={locale} period="30d" />
          </TabsContent>
          <TabsContent value="90d">
            <HistoryChart locale={locale} slug={slug} days={90} />
          </TabsContent>
          <TabsContent value="365d">
            <HistoryChart locale={locale} slug={slug} days={365} />
          </TabsContent>
        </Tabs>
      </div>

      {breakdown && breakdown.length > 0 && (
        <section className="mb-8">
          <h3 className="mb-4 font-medium text-deep-navy">{t('sourceBreakdown')}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {breakdown.map((b) => (
              <div
                key={b.sourceSlug}
                className="rounded-xl border border-navy/8 bg-white p-4"
              >
                <SourceBadge
                  nameAr={b.sourceNameAr}
                  nameEn={b.sourceNameEn}
                  type={b.sourceType}
                  locale={locale}
                />
                <p className="mt-3 font-mono text-lg font-medium text-charcoal" data-numeric>
                  {formatPrice(b.value, locale)}
                </p>
                <p className="text-xs text-navy-200">{commodity.unit}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section>
          <h3 className="mb-4 font-medium text-deep-navy">{t('related')}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((c) => (
              <Link
                key={c.slug}
                href={`/${locale}/commodities/${c.slug}`}
                className="flex items-center gap-3 rounded-xl border border-navy/8 bg-white p-3 transition hover:shadow-card-hover"
              >
                <CommodityIcon slug={c.slug} iconKey={c.iconKey} nameAr={c.nameAr} size="sm" />
                <span className="text-sm font-medium text-deep-navy">
                  {locale === 'ar' ? c.nameAr : c.nameEn}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-12 text-xs text-navy-200">
        {formatDate(new Date(), locale, 'EEEE d MMMM yyyy')}
      </p>
    </div>
  );
}

async function HistoryChart({
  locale,
  slug,
  days,
}: {
  locale: Locale;
  slug: string;
  days: number;
}) {
  const data = await getCommodityHistory(slug, days);
  return (
    <PriceChart
      data={data?.series ?? []}
      locale={locale}
      period={days === 7 ? '7d' : days === 30 ? '30d' : days === 90 ? '90d' : '1y'}
    />
  );
}
