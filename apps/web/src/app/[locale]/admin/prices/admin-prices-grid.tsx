'use client';

import * as React from 'react';
import { Button } from '@makayeel/ui';
import type { Locale } from '@makayeel/i18n';

interface Commodity {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  unit: string;
}
interface Source {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
}

interface Props {
  locale: Locale;
  commodities: Commodity[];
  sources: Source[];
  initial: Record<string, Record<string, number>>;
  saveLabel: string;
  savedLabel: string;
}

export function AdminPricesGrid({
  locale,
  commodities,
  sources,
  initial,
  saveLabel,
  savedLabel,
}: Props) {
  const [values, setValues] = React.useState<Record<string, Record<string, string>>>(() => {
    const out: Record<string, Record<string, string>> = {};
    for (const c of commodities) {
      out[c.id] = {};
      for (const s of sources) {
        const v = initial[c.id]?.[s.id];
        out[c.id]![s.id] = v !== undefined ? String(v) : '';
      }
    }
    return out;
  });
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  function onChange(cId: string, sId: string, v: string) {
    setValues((prev) => ({ ...prev, [cId]: { ...prev[cId], [sId]: v } }));
  }

  async function onSave() {
    setSaving(true);
    try {
      const prices: { commoditySlug: string; sourceSlug: string; value: number }[] = [];
      for (const c of commodities) {
        for (const s of sources) {
          const raw = values[c.id]?.[s.id];
          if (!raw) continue;
          const num = Number(raw);
          if (Number.isFinite(num) && num > 0) {
            prices.push({ commoditySlug: c.slug, sourceSlug: s.slug, value: num });
          }
        }
      }
      const res = await fetch('/api/v1/admin/prices/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prices }),
      });
      if (res.ok) {
        const body = (await res.json()) as { data: { saved: number } };
        setToast(savedLabel.replace('{count}', String(body.data.saved)) || `Saved ${body.data.saved}`);
        window.setTimeout(() => setToast(null), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-navy/8 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-navy/8 bg-cream/60 text-xs uppercase text-navy-300">
            <tr>
              <th className="sticky start-0 bg-cream/60 px-4 py-3 text-start">
                {locale === 'ar' ? 'الخامة' : 'Commodity'}
              </th>
              {sources.map((s) => (
                <th key={s.id} className="px-4 py-3 text-center whitespace-nowrap">
                  {locale === 'ar' ? s.nameAr : s.nameEn}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {commodities.map((c) => (
              <tr key={c.id} className="border-b border-navy/6 last:border-0">
                <td className="sticky start-0 bg-white px-4 py-3 font-medium text-deep-navy">
                  {locale === 'ar' ? c.nameAr : c.nameEn}
                </td>
                {sources.map((s) => (
                  <td key={s.id} className="px-2 py-2 text-center">
                    <input
                      type="number"
                      step="25"
                      min="0"
                      value={values[c.id]?.[s.id] ?? ''}
                      onChange={(e) => onChange(c.id, s.id, e.target.value)}
                      className="h-10 w-28 rounded-md border border-navy/15 bg-white px-2 text-center font-mono text-sm tabular-nums focus-visible:border-wheat-gold focus-visible:outline-none"
                      placeholder="—"
                      data-numeric
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        {toast ? (
          <span className="rounded-lg bg-harvest-green/12 px-3 py-1 text-sm text-harvest-green">
            {toast}
          </span>
        ) : (
          <span />
        )}
        <Button onClick={onSave} disabled={saving}>
          {saving ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : saveLabel}
        </Button>
      </div>
    </>
  );
}
