import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { LangToggle } from '@makayeel/ui';
import { isLocale, type Locale } from '@makayeel/i18n';
import { notFound, redirect } from 'next/navigation';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const t = await getTranslations({ locale, namespace: 'settings' });

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-8 text-3xl font-medium text-deep-navy">{t('pageTitle')}</h1>

      <section className="mb-6 rounded-2xl border border-navy/8 bg-white p-6">
        <h2 className="mb-3 text-base font-medium text-deep-navy">{t('languageLabel')}</h2>
        <LangToggle current={locale} />
      </section>

      <section className="rounded-2xl border border-navy/8 bg-white p-6">
        <h2 className="mb-3 text-base font-medium text-deep-navy">{t('profileTitle')}</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-navy-200">{locale === 'ar' ? 'الاسم' : 'Name'}</dt>
            <dd className="font-medium text-deep-navy">{session.user.name ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-navy-200">{locale === 'ar' ? 'البريد' : 'Email'}</dt>
            <dd className="font-medium text-deep-navy" dir="ltr">{session.user.email}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
