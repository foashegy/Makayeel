import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { isLocale, type Locale } from '@makayeel/i18n';
import { getTodayPrices, getActiveCommodities } from '@/lib/queries';
import CostCalculator, { type CommodityOption } from './cost-calculator';

export default async function CostPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const [commodities, todayPrices] = await Promise.all([
    getActiveCommodities(),
    getTodayPrices(),
  ]);

  // Cheapest source per commodity = the price we use for the mix.
  const minPrice = new Map<string, number>();
  for (const p of todayPrices) {
    const cur = minPrice.get(p.commodityId);
    if (cur === undefined || p.value < cur) minPrice.set(p.commodityId, p.value);
  }

  const options: CommodityOption[] = commodities
    .map((c) => ({
      slug: c.slug,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      unit: c.unit,
      pricePerTon: minPrice.get(c.id) ?? 0,
    }))
    .filter((c) => c.pricePerTon > 0);

  const noPricesToday = options.length === 0;

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <div className="mb-8">
        <h1 className="mb-1 text-3xl font-medium text-deep-navy">
          {locale === 'ar' ? 'حاسبة تكلفة العلف' : 'Feed Cost Calculator'}
        </h1>
        <p className="text-sm text-navy-200">
          {locale === 'ar'
            ? 'احسب تكلفة طن خلطتك بأسعار النهاردة، واحفظ وصفاتك للاستخدام تاني.'
            : "Compute today's cost per ton of your feed mix and save formulas for re-use."}
        </p>
      </div>

      {noPricesToday ? (
        <div className="rounded-xl border border-alert-red/20 bg-alert-red/5 p-8 text-center text-deep-navy">
          {locale === 'ar'
            ? 'مفيش أسعار النهاردة لسه. ارجع بعد ما الإدارة تدخل أسعار اليوم.'
            : 'No prices for today yet. Come back once admin has logged today\'s prices.'}
        </div>
      ) : (
        <CostCalculator commodities={options} locale={locale} />
      )}
    </div>
  );
}
