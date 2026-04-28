'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '@makayeel/i18n';

export interface CommodityOption {
  slug: string;
  nameAr: string;
  nameEn: string;
  unit: string;
  pricePerTon: number;
}

interface FormulaItem {
  commoditySlug: string;
  percent: number;
}

interface SavedFormula {
  id: string;
  name: string;
  items: FormulaItem[];
  totalTons: number;
  herdSize: number;
  kgPerHeadPerDay: number;
}

const STORAGE_KEY = 'makayeel.formulas.v1';

function emptyRow(): FormulaItem {
  return { commoditySlug: '', percent: 0 };
}

function loadSaved(): SavedFormula[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedFormula[]) : [];
  } catch {
    return [];
  }
}

export default function CostCalculator({
  commodities,
  locale,
}: {
  commodities: CommodityOption[];
  locale: Locale;
}) {
  const [items, setItems] = useState<FormulaItem[]>(() => [emptyRow(), emptyRow(), emptyRow()]);
  const [totalTons, setTotalTons] = useState<number>(1);
  const [herdSize, setHerdSize] = useState<number>(0);
  const [kgPerHeadPerDay, setKgPerHeadPerDay] = useState<number>(0);
  const [formulaName, setFormulaName] = useState<string>('');
  const [saved, setSaved] = useState<SavedFormula[]>([]);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const fmt = (n: number) =>
    n.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: 0 });
  const fmt2 = (n: number) =>
    n.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });

  const priceBySlug = useMemo(() => {
    const m = new Map<string, CommodityOption>();
    for (const c of commodities) m.set(c.slug, c);
    return m;
  }, [commodities]);

  const totalPercent = items.reduce((sum, r) => sum + (Number(r.percent) || 0), 0);

  // Cost per ton of the mix = Σ (commodity price × percent / 100).
  const costPerTon = items.reduce((sum, r) => {
    const c = priceBySlug.get(r.commoditySlug);
    if (!c) return sum;
    return sum + c.pricePerTon * ((Number(r.percent) || 0) / 100);
  }, 0);

  const totalCost = costPerTon * (Number(totalTons) || 0);
  const dailyKg = (Number(herdSize) || 0) * (Number(kgPerHeadPerDay) || 0);
  const dailyTons = dailyKg / 1000;
  const dailyCost = dailyTons * costPerTon;
  const monthlyCost = dailyCost * 30;

  const percentValid = Math.abs(totalPercent - 100) < 0.01;
  const hasAnyItem = items.some((r) => r.commoditySlug && r.percent > 0);

  function setRow(idx: number, patch: Partial<FormulaItem>) {
    setItems((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setItems((prev) => [...prev, emptyRow()]);
  }

  function removeRow(idx: number) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  function clearAll() {
    setItems([emptyRow(), emptyRow(), emptyRow()]);
    setFormulaName('');
    setHerdSize(0);
    setKgPerHeadPerDay(0);
  }

  function persist(next: SavedFormula[]) {
    setSaved(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function saveFormula() {
    if (!formulaName.trim() || !hasAnyItem) return;
    const cleanItems = items.filter((r) => r.commoditySlug && r.percent > 0);
    const next: SavedFormula = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: formulaName.trim(),
      items: cleanItems,
      totalTons: Number(totalTons) || 1,
      herdSize: Number(herdSize) || 0,
      kgPerHeadPerDay: Number(kgPerHeadPerDay) || 0,
    };
    persist([next, ...saved]);
  }

  function loadFormula(f: SavedFormula) {
    setItems(f.items.length ? f.items : [emptyRow()]);
    setTotalTons(f.totalTons || 1);
    setHerdSize(f.herdSize || 0);
    setKgPerHeadPerDay(f.kgPerHeadPerDay || 0);
    setFormulaName(f.name);
  }

  function deleteFormula(id: string) {
    persist(saved.filter((f) => f.id !== id));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      {/* ── Calculator ────────────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Mix rows */}
        <section className="rounded-xl border border-navy/8 bg-white p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-medium text-deep-navy">
              {locale === 'ar' ? 'مكوّنات الخلطة' : 'Mix components'}
            </h2>
            <span
              className={`text-sm font-medium ${
                percentValid ? 'text-harvest-green' : 'text-alert-red'
              }`}
            >
              {locale === 'ar' ? 'المجموع: ' : 'Total: '}
              {fmt2(totalPercent)}%
            </span>
          </div>

          <div className="space-y-2">
            {items.map((row, idx) => {
              const commodity = priceBySlug.get(row.commoditySlug);
              const lineCost = commodity
                ? commodity.pricePerTon * ((Number(row.percent) || 0) / 100)
                : 0;
              return (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_90px_120px_32px] items-center gap-2"
                >
                  <select
                    value={row.commoditySlug}
                    onChange={(e) => setRow(idx, { commoditySlug: e.target.value })}
                    className="rounded-lg border border-navy/10 bg-paper-white px-3 py-2 text-sm text-deep-navy focus:border-wheat-gold focus:outline-none"
                  >
                    <option value="">
                      {locale === 'ar' ? 'اختر خامة...' : 'Choose commodity...'}
                    </option>
                    {commodities.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {locale === 'ar' ? c.nameAr : c.nameEn} —{' '}
                        {fmt(c.pricePerTon)} {c.unit}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={row.percent || ''}
                    onChange={(e) =>
                      setRow(idx, { percent: Number(e.target.value) || 0 })
                    }
                    placeholder="%"
                    min={0}
                    max={100}
                    step={0.5}
                    className="rounded-lg border border-navy/10 bg-paper-white px-3 py-2 text-sm text-deep-navy focus:border-wheat-gold focus:outline-none"
                  />
                  <div className="text-right text-sm tabular-nums text-navy-200">
                    {commodity ? `${fmt(lineCost)} ${commodity.unit.split('/')[0]}` : '—'}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-navy-200 transition hover:text-alert-red"
                    aria-label={locale === 'ar' ? 'حذف' : 'Remove'}
                    disabled={items.length <= 1}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="mt-3 text-sm text-wheat-gold hover:opacity-80"
          >
            {locale === 'ar' ? '+ إضافة خامة' : '+ Add component'}
          </button>
        </section>

        {/* Optional projection */}
        <section className="rounded-xl border border-navy/8 bg-white p-6">
          <h2 className="mb-4 text-lg font-medium text-deep-navy">
            {locale === 'ar' ? 'الإسقاط على القطيع (اختياري)' : 'Herd projection (optional)'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs text-navy-200">
                {locale === 'ar' ? 'حجم الخلطة (طن)' : 'Mix size (tons)'}
              </span>
              <input
                type="number"
                value={totalTons}
                onChange={(e) => setTotalTons(Number(e.target.value) || 0)}
                min={0}
                step={0.5}
                className="w-full rounded-lg border border-navy/10 bg-paper-white px-3 py-2 text-sm text-deep-navy focus:border-wheat-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-navy-200">
                {locale === 'ar' ? 'عدد الرؤوس' : 'Number of heads'}
              </span>
              <input
                type="number"
                value={herdSize || ''}
                onChange={(e) => setHerdSize(Number(e.target.value) || 0)}
                min={0}
                className="w-full rounded-lg border border-navy/10 bg-paper-white px-3 py-2 text-sm text-deep-navy focus:border-wheat-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-navy-200">
                {locale === 'ar' ? 'كجم/راس/يوم' : 'kg / head / day'}
              </span>
              <input
                type="number"
                value={kgPerHeadPerDay || ''}
                onChange={(e) => setKgPerHeadPerDay(Number(e.target.value) || 0)}
                min={0}
                step={0.5}
                className="w-full rounded-lg border border-navy/10 bg-paper-white px-3 py-2 text-sm text-deep-navy focus:border-wheat-gold focus:outline-none"
              />
            </label>
          </div>
        </section>

        {/* Save formula */}
        <section className="rounded-xl border border-navy/8 bg-white p-6">
          <h2 className="mb-4 text-lg font-medium text-deep-navy">
            {locale === 'ar' ? 'احفظ الوصفة' : 'Save formula'}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={formulaName}
              onChange={(e) => setFormulaName(e.target.value)}
              placeholder={locale === 'ar' ? 'اسم الوصفة (مثلاً: تسمين 16%)' : 'Formula name (e.g. Fattening 16%)'}
              className="min-w-[260px] flex-1 rounded-lg border border-navy/10 bg-paper-white px-3 py-2 text-sm text-deep-navy focus:border-wheat-gold focus:outline-none"
            />
            <button
              type="button"
              onClick={saveFormula}
              disabled={!formulaName.trim() || !hasAnyItem}
              className="rounded-lg bg-deep-navy px-4 py-2 text-sm font-medium text-paper-white transition disabled:opacity-40 enabled:hover:opacity-90"
            >
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-lg border border-navy/10 px-4 py-2 text-sm text-deep-navy hover:bg-navy/5"
            >
              {locale === 'ar' ? 'مسح' : 'Clear'}
            </button>
          </div>
          <p className="mt-2 text-xs text-navy-200">
            {locale === 'ar'
              ? 'الوصفات محفوظة على هذا الجهاز فقط. مزامنة عبر الأجهزة قريباً.'
              : 'Formulas saved on this device only. Cross-device sync coming soon.'}
          </p>
        </section>
      </div>

      {/* ── Sidebar: results + saved list ─────────────────────────────── */}
      <aside className="space-y-6">
        <section className="rounded-xl border border-wheat-gold/30 bg-brand-50 p-6">
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-deep-navy/80">
            {locale === 'ar' ? 'النتائج' : 'Results'}
          </h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-navy-200">
                {locale === 'ar' ? 'تكلفة الطن' : 'Cost per ton'}
              </dt>
              <dd className="text-2xl font-semibold tabular-nums text-deep-navy">
                {fmt(costPerTon)}{' '}
                <span className="text-sm font-normal text-navy-200">EGP</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-navy-200">
                {locale === 'ar' ? 'إجمالي تكلفة الخلطة' : 'Total mix cost'}
              </dt>
              <dd className="text-xl font-medium tabular-nums text-deep-navy">
                {fmt(totalCost)}{' '}
                <span className="text-sm font-normal text-navy-200">EGP</span>
              </dd>
            </div>
            {dailyKg > 0 && (
              <>
                <hr className="border-navy/10" />
                <div>
                  <dt className="text-xs text-navy-200">
                    {locale === 'ar' ? 'استهلاك يومي' : 'Daily consumption'}
                  </dt>
                  <dd className="text-base tabular-nums text-deep-navy">
                    {fmt(dailyKg)}{' '}
                    <span className="text-sm font-normal text-navy-200">
                      {locale === 'ar' ? 'كجم/يوم' : 'kg/day'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-navy-200">
                    {locale === 'ar' ? 'تكلفة يومية' : 'Daily cost'}
                  </dt>
                  <dd className="text-xl font-medium tabular-nums text-deep-navy">
                    {fmt(dailyCost)}{' '}
                    <span className="text-sm font-normal text-navy-200">EGP</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-navy-200">
                    {locale === 'ar' ? 'تكلفة شهرية (٣٠ يوم)' : 'Monthly cost (30 days)'}
                  </dt>
                  <dd className="text-xl font-medium tabular-nums text-harvest-green">
                    {fmt(monthlyCost)}{' '}
                    <span className="text-sm font-normal text-navy-200">EGP</span>
                  </dd>
                </div>
              </>
            )}
          </dl>
          {!percentValid && hasAnyItem && (
            <p className="mt-4 rounded-lg bg-alert-red/10 px-3 py-2 text-xs text-alert-red">
              {locale === 'ar'
                ? `⚠️ مجموع النسب لازم يبقى ١٠٠٪ (الحالي: ${fmt2(totalPercent)}٪)`
                : `⚠️ Percentages must total 100% (current: ${fmt2(totalPercent)}%)`}
            </p>
          )}
        </section>

        {saved.length > 0 && (
          <section className="rounded-xl border border-navy/8 bg-white p-6">
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-deep-navy/80">
              {locale === 'ar' ? 'وصفاتي المحفوظة' : 'Saved formulas'}
            </h3>
            <ul className="space-y-2">
              {saved.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-navy/8 px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => loadFormula(f)}
                    className="flex-1 text-start text-sm text-deep-navy hover:text-wheat-gold"
                  >
                    {f.name}
                    <span className="ms-2 text-xs text-navy-200">
                      ({f.items.length}{' '}
                      {locale === 'ar' ? 'مكوّن' : 'items'})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFormula(f.id)}
                    className="text-navy-200 transition hover:text-alert-red"
                    aria-label={locale === 'ar' ? 'حذف' : 'Delete'}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
