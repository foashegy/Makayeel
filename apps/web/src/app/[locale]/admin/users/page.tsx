import { getTranslations } from 'next-intl/server';
import { prisma } from '@makayeel/db';
import { formatDate } from '@makayeel/ui';
import { isLocale, type Locale } from '@makayeel/i18n';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = await getTranslations({ locale, namespace: 'admin' });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { alerts: true, apiKeys: true } },
      botLink: true,
    },
  });

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <h1 className="mb-8 text-3xl font-medium text-deep-navy">{t('usersTitle')}</h1>
      <div className="overflow-x-auto rounded-2xl border border-navy/8 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-navy/8 bg-cream/60 text-xs uppercase text-navy-300">
            <tr>
              <th className="px-4 py-3 text-start">{locale === 'ar' ? 'البريد' : 'Email'}</th>
              <th className="px-4 py-3 text-start">{locale === 'ar' ? 'الدور' : 'Role'}</th>
              <th className="px-4 py-3 text-start">{locale === 'ar' ? 'اللغة' : 'Locale'}</th>
              <th className="px-4 py-3 text-center">TG</th>
              <th className="px-4 py-3 text-center">{locale === 'ar' ? 'تنبيهات' : 'Alerts'}</th>
              <th className="px-4 py-3 text-center">API</th>
              <th className="px-4 py-3 text-start">{locale === 'ar' ? 'انضم' : 'Joined'}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-navy/6 last:border-0">
                <td className="px-4 py-3 font-medium text-deep-navy" dir="ltr">
                  {u.email}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={
                      u.role === 'ADMIN'
                        ? 'rounded-full bg-wheat-gold/15 px-2 py-0.5 text-wheat-gold'
                        : 'rounded-full bg-navy/6 px-2 py-0.5 text-navy-300'
                    }
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-navy-300">{u.locale}</td>
                <td className="px-4 py-3 text-center">{u.botLink ? '✓' : '—'}</td>
                <td className="px-4 py-3 text-center font-mono text-navy-300" data-numeric>
                  {u._count.alerts}
                </td>
                <td className="px-4 py-3 text-center font-mono text-navy-300" data-numeric>
                  {u._count.apiKeys}
                </td>
                <td className="px-4 py-3 text-xs text-navy-200">
                  {formatDate(u.createdAt, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
