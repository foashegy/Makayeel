import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button, PriceCard } from '@makayeel/ui';
import { auth } from '@/auth';
import { prisma } from '@makayeel/db';
import { getTodayPrices, cairoDaysAgo } from '@/lib/queries';
import { isLocale, type Locale } from '@makayeel/i18n';
import { notFound, redirect } from 'next/navigation';

export default async function DashboardHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const t = await getTranslations({ locale, namespace: 'dashboard' });

  const [watchlist, alerts, botLink] = await Promise.all([
    prisma.watchlist.findMany({
      where: { userId: session.user.id },
      include: { commodity: true },
      orderBy: { position: 'asc' },
    }),
    prisma.alert.count({ where: { userId: session.user.id, isActive: true } }),
    prisma.botLink.findUnique({ where: { userId: session.user.id } }),
  ]);

  const allToday = await getTodayPrices();
  // For watchlist: take the cheapest source (ports) per commodity.
  const minByCommodity = new Map<string, (typeof allToday)[number]>();
  for (const p of allToday) {
    const existing = minByCommodity.get(p.commodityId);
    if (!existing || p.value < existing.value) minByCommodity.set(p.commodityId, p);
  }

  const cards = watchlist
    .map((w) => ({ watchlist: w, price: minByCommodity.get(w.commodityId) }))
    .filter((x) => x.price);

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <h1 className="mb-1 text-3xl font-medium text-deep-navy">
        {t('welcome', { name: session.user.name ?? session.user.email ?? '' })}
      </h1>
      <p className="mb-8 text-sm text-navy-200">
        {t('alertsCount', { count: alerts })}
      </p>

      <Link
        href={`/${locale}/dashboard/cost`}
        className="mb-8 flex items-center justify-between gap-4 rounded-xl border border-wheat-gold/40 bg-gradient-to-br from-brand-50 to-paper-white p-6 transition hover:border-wheat-gold hover:shadow-md"
      >
        <div>
          <h2 className="mb-1 text-xl font-medium text-deep-navy">
            {locale === 'ar' ? 'احسب تكلفة خلطتك' : 'Calculate your mix cost'}
          </h2>
          <p className="text-sm text-navy-200">
            {locale === 'ar'
              ? 'بأسعار النهاردة — تكلفة الطن، التكلفة اليومية للقطيع، والتكلفة الشهرية المتوقعة.'
              : "With today's prices — cost per ton, daily herd cost, and projected monthly cost."}
          </p>
        </div>
        <span className="text-3xl text-wheat-gold">{locale === 'ar' ? '←' : '→'}</span>
      </Link>

      {!botLink && (
        <div className="mb-8 flex flex-col items-start justify-between gap-3 rounded-xl border border-wheat-gold/30 bg-brand-50 p-5 sm:flex-row sm:items-center">
          <p className="text-sm text-deep-navy">{t('linkTelegramCta')}</p>
          <Button asChild size="sm">
            <Link href={`/${locale}/dashboard/link-telegram`}>
              {locale === 'ar' ? 'اربط الآن' : 'Link now'}
            </Link>
          </Button>
        </div>
      )}

      {botLink && (
        <div className="mb-8 rounded-xl border border-harvest-green/20 bg-harvest-green/10 p-4 text-sm text-harvest-green">
          {t('telegramLinked', { username: botLink.telegramUsername ?? botLink.telegramChatId })}
        </div>
      )}

      <h2 className="mb-4 text-lg font-medium text-deep-navy">{t('watchlistTitle')}</h2>
      {cards.length === 0 ? (
        <div className="rounded-xl border border-navy/8 bg-white p-8 text-center text-navy-200">
          {t('watchlistEmpty')}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ watchlist: w, price }) => (
            <Link key={w.id} href={`/${locale}/commodities/${w.commodity.slug}`}>
              <PriceCard
                slug={w.commodity.slug}
                iconKey={w.commodity.iconKey}
                nameAr={w.commodity.nameAr}
                nameEn={w.commodity.nameEn}
                unit={w.commodity.unit}
                currentPrice={price!.value}
                previousPrice={price!.previous}
                locale={locale}
                sourceLabel={locale === 'ar' ? price!.sourceNameAr : price!.sourceNameEn}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
