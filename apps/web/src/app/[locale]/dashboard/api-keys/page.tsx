import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { prisma } from '@makayeel/db';
import { ApiKeysClient } from './api-keys-client';
import { isLocale, type Locale } from '@makayeel/i18n';
import { notFound, redirect } from 'next/navigation';

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const t = await getTranslations({ locale, namespace: 'apiKeys' });
  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id, revokedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <h1 className="text-3xl font-medium text-deep-navy">{t('pageTitle')}</h1>
      <p className="mb-8 mt-1 text-sm text-charcoal/75">{t('pageLead')}</p>
      <ApiKeysClient
        locale={locale}
        initialKeys={keys.map((k) => ({
          id: k.id,
          name: k.name,
          prefix: k.prefix,
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
          createdAt: k.createdAt.toISOString(),
        }))}
        labels={{
          new: t('new'),
          nameLabel: t('nameLabel'),
          create: t('create'),
          copyWarning: t('copyWarning'),
          prefix: t('prefix'),
          lastUsed: t('lastUsed'),
          revoke: t('revoke'),
          empty: t('empty'),
        }}
      />
    </div>
  );
}
