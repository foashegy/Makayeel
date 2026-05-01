import { prisma } from '@makayeel/db';
import type { Locale } from '@makayeel/i18n';
import { isLocale } from '@makayeel/i18n';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const SOURCE_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  admin_bulk: { ar: 'أدمن', en: 'Admin', color: 'bg-purple-50 text-purple-700' },
  photo_extract: { ar: 'صورة أدمن', en: 'Admin photo', color: 'bg-blue-50 text-blue-700' },
  mill_submit: { ar: 'مصنع', en: 'Mill', color: 'bg-amber-50 text-amber-800' },
  scraper_mazra3ty: { ar: 'مزرعتي', en: 'Mazra3ty', color: 'bg-emerald-50 text-emerald-700' },
  scraper_elmorshd: { ar: 'المرشد', en: 'Elmorshd', color: 'bg-emerald-50 text-emerald-700' },
};

const fmtRel = (d: Date, locale: 'ar' | 'en') => {
  const min = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return locale === 'ar' ? 'الآن' : 'now';
  if (min < 60) return locale === 'ar' ? `منذ ${min} د` : `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return locale === 'ar' ? `منذ ${h} س` : `${h}h ago`;
  return locale === 'ar' ? `منذ ${Math.floor(h / 24)} يوم` : `${Math.floor(h / 24)}d ago`;
};

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ source?: string; commodity?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const { source, commodity } = await searchParams;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const where = {
    ...(source ? { source } : {}),
    ...(commodity ? { commoditySlug: commodity } : {}),
  };

  const [rows, sourceRollup, total24h] = await Promise.all([
    prisma.priceAudit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.priceAudit.groupBy({
      by: ['source'],
      where: { createdAt: { gte: since24h } },
      _count: { id: true },
    }),
    prisma.priceAudit.count({ where: { createdAt: { gte: since24h } } }),
  ]);

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-deep-navy md:text-4xl">
          {locale === 'ar' ? '📜 سجل تعديلات الأسعار' : '📜 Price Audit Log'}
        </h1>
        <p className="mt-2 text-sm text-charcoal/70">
          {locale === 'ar'
            ? 'كل تعديل سعر بيتسجل هنا بشكل دائم — قبل وبعد + مين عدّل + امتى. السجل ده دليل قانوني للمصانع.'
            : 'Every price change is logged here permanently — before/after + who + when. Legal proof for mills.'}
        </p>
      </div>

      {/* 24h source rollup */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat
          label={locale === 'ar' ? 'إجمالي 24س' : 'Total 24h'}
          value={String(total24h)}
        />
        {sourceRollup.map((r) => {
          const meta = SOURCE_LABELS[r.source] ?? { ar: r.source, en: r.source, color: 'bg-cream text-charcoal' };
          return (
            <Stat
              key={r.source}
              label={locale === 'ar' ? meta.ar : meta.en}
              value={String(r._count.id)}
              subtle
            />
          );
        })}
      </div>

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-charcoal/60">{locale === 'ar' ? 'صفّي:' : 'Filter:'}</span>
        <a
          href={`/${locale}/admin/audit`}
          className={!source ? 'rounded-full bg-deep-navy px-3 py-1 text-paper-white' : 'rounded-full border border-navy/15 px-3 py-1 text-deep-navy hover:bg-navy/5'}
        >
          {locale === 'ar' ? 'الكل' : 'All'}
        </a>
        {Object.entries(SOURCE_LABELS).map(([key, meta]) => (
          <a
            key={key}
            href={`/${locale}/admin/audit?source=${key}`}
            className={source === key ? 'rounded-full bg-deep-navy px-3 py-1 text-paper-white' : 'rounded-full border border-navy/15 px-3 py-1 text-deep-navy hover:bg-navy/5'}
          >
            {locale === 'ar' ? meta.ar : meta.en}
          </a>
        ))}
        {commodity ? (
          <a
            href={`/${locale}/admin/audit${source ? `?source=${source}` : ''}`}
            className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-800"
          >
            ✕ {commodity}
          </a>
        ) : null}
      </div>

      {/* Last 100 rows */}
      <div className="overflow-x-auto rounded-xl border border-navy/8 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-navy/8 bg-cream/40 text-xs uppercase text-charcoal/60">
            <tr>
              <th className="px-3 py-2 text-start">{locale === 'ar' ? 'الوقت' : 'When'}</th>
              <th className="px-3 py-2 text-start">{locale === 'ar' ? 'الخامة' : 'Commodity'}</th>
              <th className="px-3 py-2 text-start">{locale === 'ar' ? 'المصدر' : 'Source'}</th>
              <th className="px-3 py-2 text-start">{locale === 'ar' ? 'تاريخ السعر' : 'Date'}</th>
              <th className="px-3 py-2 text-end">{locale === 'ar' ? 'قبل' : 'Old'}</th>
              <th className="px-3 py-2 text-end">{locale === 'ar' ? 'بعد' : 'New'}</th>
              <th className="px-3 py-2 text-end">{locale === 'ar' ? 'فرق' : 'Δ'}</th>
              <th className="px-3 py-2 text-start">{locale === 'ar' ? 'العملية' : 'Action'}</th>
              <th className="px-3 py-2 text-start">{locale === 'ar' ? 'ملاحظة' : 'Note'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-navy-200">
                  {locale === 'ar' ? 'مفيش تعديلات لسه.' : 'No audit rows.'}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const meta = SOURCE_LABELS[r.source] ?? { ar: r.source, en: r.source, color: 'bg-cream text-charcoal' };
                const oldV = r.oldValue ? Number(r.oldValue) : null;
                const newV = Number(r.newValue);
                const delta = oldV !== null && oldV !== 0 ? ((newV - oldV) / oldV) * 100 : null;
                const isArchive = r.note?.startsWith('archive:');
                return (
                  <tr key={r.id} className="border-b border-navy/5 last:border-0 align-top">
                    <td className="px-3 py-2 text-xs text-charcoal/70 whitespace-nowrap">
                      {fmtRel(r.createdAt, locale)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <a
                        href={`/${locale}/admin/audit?commodity=${r.commoditySlug}${source ? `&source=${source}` : ''}`}
                        className="font-mono text-deep-navy hover:underline"
                      >
                        {r.commoditySlug}
                      </a>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.sourceSlug}</td>
                    <td className="px-3 py-2 font-mono text-xs text-charcoal/70" data-numeric>
                      {r.date.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-3 py-2 text-end font-mono text-xs text-charcoal/60" data-numeric>
                      {oldV !== null ? oldV.toLocaleString('en-EG') : '—'}
                    </td>
                    <td className="px-3 py-2 text-end font-mono text-xs font-semibold text-deep-navy" data-numeric>
                      {newV.toLocaleString('en-EG')}
                    </td>
                    <td className="px-3 py-2 text-end font-mono text-xs" data-numeric>
                      {delta !== null && Math.abs(delta) >= 0.05 ? (
                        <span className={delta > 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-charcoal/40">·</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 ${meta.color}`}>
                        {locale === 'ar' ? meta.ar : meta.en}
                      </span>
                      {isArchive ? (
                        <span className="ms-1 rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                          {locale === 'ar' ? 'أرشيف' : 'archived'}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 max-w-[20ch] text-xs text-charcoal/60" title={r.note ?? ''}>
                      <span className="line-clamp-2">{r.note ?? '—'}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, subtle }: { label: string; value: string; subtle?: boolean }) {
  return (
    <div className={subtle ? 'rounded-xl border border-navy/8 bg-cream/40 p-3' : 'rounded-xl border border-navy/8 bg-white p-3'}>
      <div className="text-[10px] uppercase tracking-wide text-charcoal/55">{label}</div>
      <div className="mt-0.5 font-mono text-2xl font-bold tracking-tight text-deep-navy" data-numeric>{value}</div>
    </div>
  );
}
