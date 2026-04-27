import { getTranslations } from 'next-intl/server';
import { LoginForm } from './login-form';
import { BrandMark } from '@makayeel/ui';
import Link from 'next/link';
import { isLocale, type Locale } from '@makayeel/i18n';
import { notFound } from 'next/navigation';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ verify?: string; error?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = await getTranslations({ locale, namespace: 'auth' });
  const sp = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 py-12">
      <Link href={`/${locale}`} className="mb-8">
        <BrandMark />
      </Link>
      <div className="w-full rounded-2xl border border-navy/8 bg-white p-8 shadow-card">
        <h1 className="mb-2 text-2xl font-medium text-deep-navy">{t('loginTitle')}</h1>
        <p className="mb-6 text-sm text-charcoal/75">{t('loginLead')}</p>

        {sp.verify && (
          <div className="mb-5 rounded-lg bg-harvest-green/10 p-3 text-sm text-harvest-green">
            <strong className="block">{t('linkSentTitle')}</strong>
            <span>{t('linkSentBody')}</span>
          </div>
        )}

        <LoginForm locale={locale} />

        <p className="mt-6 text-center text-xs text-navy-200">{t('termsAccept')}</p>
      </div>
    </div>
  );
}
