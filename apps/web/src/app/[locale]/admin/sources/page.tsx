import { getTranslations } from 'next-intl/server';
import { prisma } from '@makayeel/db';
import { isLocale, type Locale } from '@makayeel/i18n';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminSourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = await getTranslations({ locale, namespace: 'admin' });

  const rows = await prisma.source.findMany({ orderBy: { slug: 'asc' } });

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <h1 className="mb-8 text-3xl font-medium text-deep-navy">{t('sourcesTitle')}</h1>
      <div className="overflow-x-auto rounded-2xl border border-navy/8 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-navy/8 bg-cream/60 text-xs uppercase text-navy-300">
            <tr>
              <th className="px-4 py-3 text-start">Slug</th>
              <th className="px-4 py-3 text-start">AR</th>
              <th className="px-4 py-3 text-start">EN</th>
              <th className="px-4 py-3 text-start">{locale === 'ar' ? 'النوع' : 'Type'}</th>
              <th className="px-4 py-3 text-start">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-navy/6 last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-navy-200">{r.slug}</td>
                <td className="px-4 py-3 font-medium text-deep-navy">{r.nameAr}</td>
                <td className="px-4 py-3 text-charcoal">{r.nameEn}</td>
                <td className="px-4 py-3 text-xs text-navy-300">{r.type}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      r.isActive
                        ? 'rounded-full bg-harvest-green/12 px-2 py-0.5 text-xs text-harvest-green'
                        : 'rounded-full bg-navy/6 px-2 py-0.5 text-xs text-navy-300'
                    }
                  >
                    {r.isActive ? t('active') : t('inactive')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
