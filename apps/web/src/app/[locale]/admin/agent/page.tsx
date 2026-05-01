import { prisma } from '@makayeel/db';
import type { Locale } from '@makayeel/i18n';
import { isLocale } from '@makayeel/i18n';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const fmtDuration = (ms: number) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);

const fmtRelative = (date: Date, locale: 'ar' | 'en'): string => {
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return locale === 'ar' ? 'الآن' : 'now';
  if (min < 60) return locale === 'ar' ? `منذ ${min} د` : `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return locale === 'ar' ? `منذ ${h} س` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return locale === 'ar' ? `منذ ${d} يوم` : `${d}d ago`;
};

export default async function AgentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [runs, rollup24h, rollup7d, totalToday] = await Promise.all([
    prisma.scrapeRun.findMany({ orderBy: { startedAt: 'desc' }, take: 50 }),
    prisma.scrapeRun.groupBy({
      by: ['siteSlug'],
      where: { startedAt: { gte: since24h } },
      _sum: { pricesWritten: true, productsRead: true },
      _count: { id: true },
    }),
    prisma.scrapeRun.groupBy({
      by: ['siteSlug', 'pageHint'],
      where: { startedAt: { gte: since7d } },
      _sum: { pricesWritten: true },
      _count: { id: true },
    }),
    prisma.price.count({ where: { archivedAt: null, createdAt: { gte: since24h } } }),
  ]);

  const errorCount24h = await prisma.scrapeRun.count({
    where: { startedAt: { gte: since24h }, NOT: { error: null } },
  });
  const totalRuns24h = rollup24h.reduce((acc, r) => acc + r._count.id, 0);
  const totalWritten24h = rollup24h.reduce((acc, r) => acc + (r._sum.pricesWritten ?? 0), 0);

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-deep-navy md:text-4xl">
          {locale === 'ar' ? '🤖 الايجنت اليومي' : '🤖 Daily Agent'}
        </h1>
        <p className="mt-2 text-sm text-charcoal/70">
          {locale === 'ar'
            ? 'الايجنت بيشتغل تلقائي 6 صباحاً توقيت القاهرة على mazra3ty.com + elmorshdledwagn.com.'
            : 'Cron at 06:00 Cairo against mazra3ty.com + elmorshdledwagn.com.'}
        </p>
      </div>

      {/* 24h KPIs */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={locale === 'ar' ? 'تشغيلات 24س' : 'Runs / 24h'} value={String(totalRuns24h)} />
        <Stat label={locale === 'ar' ? 'أسعار اتسجلت' : 'Prices written'} value={String(totalWritten24h)} accent="emerald" />
        <Stat
          label={locale === 'ar' ? 'أسعار جديدة في DB' : 'New rows in DB'}
          value={String(totalToday)}
        />
        <Stat
          label={locale === 'ar' ? 'أخطاء' : 'Errors'}
          value={String(errorCount24h)}
          accent={errorCount24h > 0 ? 'red' : 'navy'}
        />
      </div>

      {/* Per-site rollup (24h) */}
      <h2 className="mb-3 font-display text-xl text-deep-navy">
        {locale === 'ar' ? 'حسب الموقع — آخر 24 ساعة' : 'By site — last 24h'}
      </h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {rollup24h.length === 0 ? (
          <p className="rounded-xl border border-navy/8 bg-white p-6 text-center text-sm text-navy-200">
            {locale === 'ar' ? 'مفيش تشغيلات في آخر 24 ساعة.' : 'No runs in the last 24h.'}
          </p>
        ) : (
          rollup24h.map((r) => (
            <div key={r.siteSlug} className="rounded-xl border border-navy/8 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-deep-navy">{r.siteSlug}</span>
                <span className="rounded-full bg-cream px-2 py-0.5 text-xs text-charcoal/70">
                  {r._count.id} {locale === 'ar' ? 'تشغيل' : 'runs'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-navy-200">
                <span data-numeric>📥 {r._sum.productsRead ?? 0} {locale === 'ar' ? 'منتج' : 'read'}</span>
                <span data-numeric>✅ {r._sum.pricesWritten ?? 0} {locale === 'ar' ? 'كتب' : 'written'}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 7d page rollup */}
      <h2 className="mb-3 font-display text-xl text-deep-navy">
        {locale === 'ar' ? 'حسب الصفحة — آخر 7 أيام' : 'By page — last 7d'}
      </h2>
      <div className="mb-8 overflow-x-auto rounded-xl border border-navy/8 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-navy/8 bg-cream/40 text-xs uppercase text-charcoal/60">
            <tr>
              <th className="px-3 py-2 text-start">{locale === 'ar' ? 'الموقع' : 'Site'}</th>
              <th className="px-3 py-2 text-start">{locale === 'ar' ? 'الصفحة' : 'Page'}</th>
              <th className="px-3 py-2 text-end">{locale === 'ar' ? 'تشغيلات' : 'Runs'}</th>
              <th className="px-3 py-2 text-end">{locale === 'ar' ? 'أسعار' : 'Written'}</th>
            </tr>
          </thead>
          <tbody>
            {rollup7d.map((r) => (
              <tr key={`${r.siteSlug}-${r.pageHint}`} className="border-b border-navy/5 last:border-0">
                <td className="px-3 py-2 font-mono">{r.siteSlug}</td>
                <td className="px-3 py-2 text-charcoal/80">{r.pageHint}</td>
                <td className="px-3 py-2 text-end font-mono" data-numeric>{r._count.id}</td>
                <td className="px-3 py-2 text-end font-mono" data-numeric>{r._sum.pricesWritten ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Run history */}
      <h2 className="mb-3 font-display text-xl text-deep-navy">
        {locale === 'ar' ? 'آخر 50 تشغيل' : 'Last 50 runs'}
      </h2>
      <div className="overflow-x-auto rounded-xl border border-navy/8 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-navy/8 bg-cream/40 text-xs uppercase text-charcoal/60">
            <tr>
              <th className="px-3 py-2 text-start">{locale === 'ar' ? 'الوقت' : 'When'}</th>
              <th className="px-3 py-2 text-start">{locale === 'ar' ? 'الموقع' : 'Site'}</th>
              <th className="px-3 py-2 text-start">{locale === 'ar' ? 'الصفحة' : 'Page'}</th>
              <th className="px-3 py-2 text-start">{locale === 'ar' ? 'مصدر' : 'Trigger'}</th>
              <th className="px-3 py-2 text-end">{locale === 'ar' ? 'مدة' : 'Duration'}</th>
              <th className="px-3 py-2 text-end">{locale === 'ar' ? 'مقروء' : 'Read'}</th>
              <th className="px-3 py-2 text-end">{locale === 'ar' ? 'مكتوب' : 'Written'}</th>
              <th className="px-3 py-2 text-start">{locale === 'ar' ? 'حالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-navy-200">
                  {locale === 'ar' ? 'مفيش تشغيلات لسه.' : 'No runs yet.'}
                </td>
              </tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id} className="border-b border-navy/5 last:border-0 align-top">
                  <td className="px-3 py-2 text-xs text-charcoal/70">
                    {fmtRelative(r.startedAt, locale)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.siteSlug}</td>
                  <td className="px-3 py-2 text-xs text-charcoal/80">{r.pageHint}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className={r.trigger === 'cron' ? 'rounded-full bg-blue-50 px-2 py-0.5 text-blue-700' : 'rounded-full bg-amber-50 px-2 py-0.5 text-amber-800'}>
                      {r.trigger}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-end font-mono text-xs" data-numeric>{fmtDuration(r.durationMs)}</td>
                  <td className="px-3 py-2 text-end font-mono text-xs" data-numeric>{r.productsRead}</td>
                  <td className="px-3 py-2 text-end font-mono text-xs" data-numeric>{r.pricesWritten}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.error ? (
                      <span className="line-clamp-2 max-w-[24ch] text-red-700" title={r.error}>
                        ❌ {r.error.slice(0, 60)}
                      </span>
                    ) : r.createdSlugs.length > 0 ? (
                      <span className="text-emerald-700" title={r.createdSlugs.join(', ')}>
                        ✅ +{r.createdSlugs.length} {locale === 'ar' ? 'جديد' : 'new'}
                      </span>
                    ) : (
                      <span className="text-emerald-700">✅ ok</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'navy' | 'emerald' | 'red';
}) {
  const color =
    accent === 'red' ? 'text-red-600' : accent === 'emerald' ? 'text-emerald-600' : 'text-deep-navy';
  return (
    <div className="rounded-xl border border-navy/8 bg-white p-4">
      <div className="text-[11px] uppercase tracking-wide text-charcoal/55">{label}</div>
      <div className={`mt-1 font-mono text-3xl font-bold tracking-tight ${color}`} data-numeric>{value}</div>
    </div>
  );
}
