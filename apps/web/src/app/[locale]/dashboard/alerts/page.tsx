import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { prisma } from '@makayeel/db';
import { AlertsClient } from './alerts-client';
import { isLocale, type Locale } from '@makayeel/i18n';
import { notFound, redirect } from 'next/navigation';

export default async function AlertsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const t = await getTranslations({ locale, namespace: 'alerts' });

  const [alerts, commodities, botLink] = await Promise.all([
    prisma.alert.findMany({
      where: { userId: session.user.id },
      include: { commodity: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.commodity.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } }),
    prisma.botLink.findUnique({ where: { userId: session.user.id } }),
  ]);

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <h1 className="mb-8 text-3xl font-medium text-deep-navy">{t('pageTitle')}</h1>
      <AlertsClient
        locale={locale}
        telegramLinked={Boolean(botLink)}
        initialAlerts={alerts.map((a) => ({
          id: a.id,
          commoditySlug: a.commodity.slug,
          commodityNameAr: a.commodity.nameAr,
          commodityNameEn: a.commodity.nameEn,
          threshold: Number(a.threshold),
          direction: a.direction,
          channel: a.channel,
          isActive: a.isActive,
        }))}
        commodities={commodities.map((c) => ({
          slug: c.slug,
          nameAr: c.nameAr,
          nameEn: c.nameEn,
        }))}
        labels={{
          new: t('new'),
          selectCommodity: t('selectCommodity'),
          thresholdLabel: t('thresholdLabel'),
          direction: t('direction'),
          above: t('above'),
          below: t('below'),
          channel: t('channel'),
          email: t('email'),
          telegram: t('telegram'),
          both: t('both'),
          save: t('save'),
          delete: t('delete'),
          empty: t('empty'),
          telegramDisabled: t('telegramDisabled'),
          activeBadge: t('activeBadge'),
        }}
      />
    </div>
  );
}
