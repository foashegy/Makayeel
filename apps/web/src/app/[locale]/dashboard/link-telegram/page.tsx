import { randomBytes } from 'node:crypto';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { prisma } from '@makayeel/db';
import { LinkCodeCard } from './link-code-card';
import { isLocale, type Locale } from '@makayeel/i18n';
import { notFound, redirect } from 'next/navigation';

/** Create a fresh 6-char code every time the page loads — cheap, simple, safe. */
async function issueLinkCode(userId: string): Promise<string> {
  // Invalidate previous unused codes.
  await prisma.botLinkCode.updateMany({
    where: { userId, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() },
  });

  const code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
  await prisma.botLinkCode.create({
    data: {
      userId,
      code,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    },
  });
  return code;
}

export default async function LinkTelegramPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const t = await getTranslations({ locale, namespace: 'linkTelegram' });
  const code = await issueLinkCode(session.user.id);

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-3 text-3xl font-medium text-deep-navy">{t('pageTitle')}</h1>
      <p className="mb-8 text-sm text-charcoal/75">{t('intro')}</p>

      <LinkCodeCard
        code={code}
        botHandle={t('botHandle')}
        copyCta={t('codeCta')}
        copiedText={t('copied')}
      />

      <p className="mt-6 text-xs text-navy-200">
        {locale === 'ar'
          ? 'الكود ده صالح لـ ١٥ دقيقة فقط، ومستخدم مرة واحدة.'
          : 'This code is valid for 15 minutes, single use.'}
      </p>
    </div>
  );
}
