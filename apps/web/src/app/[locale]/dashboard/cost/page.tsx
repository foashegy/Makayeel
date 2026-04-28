import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@makayeel/db';
import { isLocale, type Locale } from '@makayeel/i18n';
import { getTodayPrices, getActiveCommodities, cairoToday } from '@/lib/queries';
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

  const [commodities, todayPrices, latestPrice] = await Promise.all([
    getActiveCommodities(),
    getTodayPrices(),
    prisma.price.findFirst({
      where: { date: cairoToday() },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  // Cheapest source per commodity — the source we attribute the price to.
  const cheapestByCommodity = new Map<
    string,
    { value: number; sourceNameAr: string; sourceNameEn: string }
  >();
  for (const p of todayPrices) {
    const cur = cheapestByCommodity.get(p.commodityId);
    if (cur === undefined || p.value < cur.value) {
      cheapestByCommodity.set(p.commodityId, {
        value: p.value,
        sourceNameAr: p.sourceNameAr,
        sourceNameEn: p.sourceNameEn,
      });
    }
  }

  const options: CommodityOption[] = commodities
    .map((c): CommodityOption | null => {
      const cheapest = cheapestByCommodity.get(c.id);
      if (!cheapest || cheapest.value <= 0 || !Number.isFinite(cheapest.value)) return null;
      return {
        slug: c.slug,
        nameAr: c.nameAr,
        nameEn: c.nameEn,
        unit: c.unit,
        pricePerTon: cheapest.value,
        sourceNameAr: cheapest.sourceNameAr,
        sourceNameEn: cheapest.sourceNameEn,
      };
    })
    .filter((c): c is CommodityOption => c !== null);

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
        <div className="rounded-xl border border-navy/10 bg-paper-white p-8 text-center text-deep-navy">
          <p className="text-base">
            {locale === 'ar'
              ? '⏱ مفيش أسعار النهاردة لسه.'
              : '⏱ No prices for today yet.'}
          </p>
          <p className="mt-2 text-sm text-navy-200">
            {locale === 'ar'
              ? 'الإدارة بتدخل أسعار اليوم قبل الساعة ٧ صباحاً.'
              : "Admin logs today's prices before 7 AM Cairo time."}
          </p>
        </div>
      ) : (
        <CostCalculator
          commodities={options}
          locale={locale}
          lastUpdatedISO={latestPrice?.createdAt.toISOString() ?? null}
        />
      )}
    </div>
  );
}
