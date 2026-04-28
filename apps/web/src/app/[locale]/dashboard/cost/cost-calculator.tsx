'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '@makayeel/i18n';

export interface CommodityOption {
  slug: string;
  nameAr: string;
  nameEn: string;
  unit: string;
  pricePerTon: number;
  sourceNameAr: string;
  sourceNameEn: string;
}

interface FormulaItem {
  id: string;
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
  fcr: number;
  outputPricePerKg: number;
  outputKind: OutputKind;
}

interface ApiFormulaItem {
  commoditySlug: string;
  percent: number;
}

interface ApiFormula {
  id: string;
  name: string;
  items: ApiFormulaItem[];
  totalTons: number;
  herdSize: number;
  kgPerHeadPerDay: number;
  fcr: number;
  outputPricePerKg: number;
  outputKind: OutputKind;
}

type OutputKind = 'meat' | 'milk' | 'eggs' | 'custom';

const STORAGE_KEY = 'makayeel.formulas.v1';
const INITIAL_ROW_COUNT = 3;

const OUTPUT_KIND_LABELS: Record<OutputKind, { ar: string; en: string }> = {
  meat: { ar: 'لحم', en: 'Meat' },
  milk: { ar: 'لبن', en: 'Milk' },
  eggs: { ar: 'بيض', en: 'Eggs' },
  custom: { ar: 'مُخصّص', en: 'Custom' },
};

function rowId(): string {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyRow(): FormulaItem {
  return { id: rowId(), commoditySlug: '', percent: 0 };
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function clampNonNegative(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

// Strict validator — rejects malformed entries instead of casting blindly.
function parseFormula(raw: unknown): SavedFormula | null {
  if (!raw || typeof raw !== 'object') return null;
  const f = raw as Record<string, unknown>;
  if (typeof f.id !== 'string' || typeof f.name !== 'string') return null;
  if (!Array.isArray(f.items)) return null;
  const items: FormulaItem[] = [];
  for (const it of f.items) {
    if (!it || typeof it !== 'object') return null;
    const r = it as Record<string, unknown>;
    if (typeof r.commoditySlug !== 'string') return null;
    if (typeof r.percent !== 'number' || !Number.isFinite(r.percent)) return null;
    items.push({
      id: typeof r.id === 'string' ? r.id : rowId(),
      commoditySlug: r.commoditySlug,
      percent: clampPercent(r.percent),
    });
  }
  const outputKind: OutputKind =
    f.outputKind === 'meat' || f.outputKind === 'milk' || f.outputKind === 'eggs' || f.outputKind === 'custom'
      ? f.outputKind
      : 'meat';
  return {
    id: f.id,
    name: f.name,
    items,
    totalTons: clampNonNegative(typeof f.totalTons === 'number' ? f.totalTons : 1),
    herdSize: clampNonNegative(typeof f.herdSize === 'number' ? f.herdSize : 0),
    kgPerHeadPerDay: clampNonNegative(typeof f.kgPerHeadPerDay === 'number' ? f.kgPerHeadPerDay : 0),
    fcr: clampNonNegative(typeof f.fcr === 'number' ? f.fcr : 0),
    outputPricePerKg: clampNonNegative(typeof f.outputPricePerKg === 'number' ? f.outputPricePerKg : 0),
    outputKind,
  };
}

function loadLocalLegacy(): SavedFormula[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseFormula).filter((f): f is SavedFormula => f !== null);
  } catch {
    return [];
  }
}

function clearLocalLegacy() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function fromApi(a: ApiFormula): SavedFormula {
  return {
    id: a.id,
    name: a.name,
    items: a.items.map((it) => ({
      id: rowId(),
      commoditySlug: it.commoditySlug,
      percent: clampPercent(it.percent),
    })),
    totalTons: clampNonNegative(a.totalTons),
    herdSize: clampNonNegative(a.herdSize),
    kgPerHeadPerDay: clampNonNegative(a.kgPerHeadPerDay),
    fcr: clampNonNegative(a.fcr),
    outputPricePerKg: clampNonNegative(a.outputPricePerKg),
    outputKind: a.outputKind,
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

async function apiFetchFormulas(): Promise<ApiFormula[]> {
  const res = await fetch('/api/v1/formulas', { cache: 'no-store' });
  if (!res.ok) throw new Error(`fetch_formulas_${res.status}`);
  const json = (await res.json()) as ApiResponse<ApiFormula[]>;
  return Array.isArray(json.data) ? json.data : [];
}

interface CreatePayload {
  name: string;
  items: ApiFormulaItem[];
  totalTons: number;
  herdSize: number;
  kgPerHeadPerDay: number;
  fcr: number;
  outputPricePerKg: number;
  outputKind: OutputKind;
}

async function apiCreateFormula(p: CreatePayload): Promise<ApiFormula | null> {
  const res = await fetch('/api/v1/formulas', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(p),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as ApiResponse<ApiFormula>;
  return json.data ?? null;
}

async function apiDeleteFormula(id: string): Promise<boolean> {
  const res = await fetch(`/api/v1/formulas/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return res.ok;
}

function relativeFreshness(iso: string | null, locale: Locale): string {
  if (!iso) return locale === 'ar' ? 'مش متوفر' : 'unavailable';
  const updated = new Date(iso).getTime();
  const now = Date.now();
  const minutes = Math.max(0, Math.round((now - updated) / 60_000));
  if (minutes < 1) return locale === 'ar' ? 'منذ لحظات' : 'moments ago';
  if (minutes < 60) {
    return locale === 'ar' ? `من ${minutes} دقيقة` : `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return locale === 'ar' ? `من ${hours} ساعة` : `${hours} hr ago`;
  }
  const days = Math.round(hours / 24);
  return locale === 'ar' ? `من ${days} يوم` : `${days} d ago`;
}

export default function CostCalculator({
  commodities,
  locale,
  lastUpdatedISO,
}: {
  commodities: CommodityOption[];
  locale: Locale;
  lastUpdatedISO: string | null;
}) {
  const [items, setItems] = useState<FormulaItem[]>(() =>
    Array.from({ length: INITIAL_ROW_COUNT }, emptyRow),
  );
  const [totalTons, setTotalTons] = useState<number>(1);
  const [herdSize, setHerdSize] = useState<number>(0);
  const [kgPerHeadPerDay, setKgPerHeadPerDay] = useState<number>(0);
  const [fcr, setFcr] = useState<number>(0);
  const [outputPricePerKg, setOutputPricePerKg] = useState<number>(0);
  const [outputKind, setOutputKind] = useState<OutputKind>('meat');
  const [formulaName, setFormulaName] = useState<string>('');
  const [saved, setSaved] = useState<SavedFormula[]>([]);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'error'>('idle');

  // Hydrate from API; on first load, migrate any legacy localStorage formulas
  // to the server, then wipe local storage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await apiFetchFormulas();
        if (cancelled) return;

        const legacy = loadLocalLegacy();
        if (legacy.length > 0 && remote.length === 0) {
          // Migrate each legacy entry to the server.
          const created: ApiFormula[] = [];
          for (const f of legacy) {
            const cleanItems = f.items
              .filter((r) => r.commoditySlug && r.percent > 0)
              .map((r) => ({ commoditySlug: r.commoditySlug, percent: r.percent }));
            if (cleanItems.length === 0) continue;
            const out = await apiCreateFormula({
              name: f.name,
              items: cleanItems,
              totalTons: f.totalTons || 1,
              herdSize: f.herdSize,
              kgPerHeadPerDay: f.kgPerHeadPerDay,
              fcr: f.fcr,
              outputPricePerKg: f.outputPricePerKg,
              outputKind: f.outputKind,
            });
            if (out) created.push(out);
          }
          if (created.length > 0) clearLocalLegacy();
          if (!cancelled) setSaved(created.map(fromApi));
        } else {
          setSaved(remote.map(fromApi));
          if (legacy.length > 0) clearLocalLegacy();
        }
      } catch {
        // Network failure — leave the saved list empty; user can still use the calculator.
      }
    })();
    return () => {
      cancelled = true;
    };
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

  // Breakeven: cost per kg of output = (cost per kg feed) × FCR.
  // costPerTon ÷ 1000 = cost per kg of feed.
  const costPerKgFeed = costPerTon / 1000;
  const costPerKgOutput = costPerKgFeed * (Number(fcr) || 0);
  const marginPerKg = (Number(outputPricePerKg) || 0) - costPerKgOutput;
  const marginPercent =
    outputPricePerKg > 0 ? (marginPerKg / outputPricePerKg) * 100 : 0;
  const showBreakeven = fcr > 0 && outputPricePerKg > 0;
  const showHerdProjection = dailyKg > 0 && costPerTon > 0;
  const heroIsMonthly = showHerdProjection;

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
    setItems(Array.from({ length: INITIAL_ROW_COUNT }, emptyRow));
    setFormulaName('');
    setHerdSize(0);
    setKgPerHeadPerDay(0);
    setFcr(0);
    setOutputPricePerKg(0);
  }

  const canSave = formulaName.trim().length > 0 && hasAnyItem && percentValid;

  async function saveFormula() {
    if (!canSave || savingState === 'saving') return;
    const cleanItems = items
      .filter((r) => r.commoditySlug && r.percent > 0)
      .map((r) => ({ commoditySlug: r.commoditySlug, percent: r.percent }));
    setSavingState('saving');
    const created = await apiCreateFormula({
      name: formulaName.trim(),
      items: cleanItems,
      totalTons: clampNonNegative(Number(totalTons) || 1),
      herdSize: clampNonNegative(Number(herdSize) || 0),
      kgPerHeadPerDay: clampNonNegative(Number(kgPerHeadPerDay) || 0),
      fcr: clampNonNegative(Number(fcr) || 0),
      outputPricePerKg: clampNonNegative(Number(outputPricePerKg) || 0),
      outputKind,
    });
    if (!created) {
      setSavingState('error');
      return;
    }
    setSaved((prev) => [fromApi(created), ...prev]);
    setSavingState('idle');
  }

  function loadFormula(f: SavedFormula) {
    setItems(f.items.length ? f.items.map((r) => ({ ...r, id: rowId() })) : [emptyRow()]);
    setTotalTons(f.totalTons || 1);
    setHerdSize(f.herdSize || 0);
    setKgPerHeadPerDay(f.kgPerHeadPerDay || 0);
    setFcr(f.fcr || 0);
    setOutputPricePerKg(f.outputPricePerKg || 0);
    setOutputKind(f.outputKind || 'meat');
    setFormulaName(f.name);
  }

  async function deleteFormula(id: string) {
    // Optimistic — rollback on failure.
    const prev = saved;
    setSaved((s) => s.filter((f) => f.id !== id));
    const ok = await apiDeleteFormula(id);
    if (!ok) setSaved(prev);
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
              const sourceLabel = commodity
                ? locale === 'ar'
                  ? commodity.sourceNameAr
                  : commodity.sourceNameEn
                : '';
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-2 gap-2 rounded-lg bg-navy/[0.02] p-3 sm:grid-cols-[1fr_90px_140px_44px] sm:items-center sm:gap-2 sm:rounded-none sm:bg-transparent sm:p-0"
                >
                  <label className="col-span-2 sm:col-span-1">
                    <span className="sr-only">
                      {locale === 'ar' ? `الخامة ${idx + 1}` : `Commodity ${idx + 1}`}
                    </span>
                    <select
                      value={row.commoditySlug}
                      onChange={(e) => setRow(idx, { commoditySlug: e.target.value })}
                      className="w-full rounded-lg border border-navy/10 bg-paper-white px-3 py-2 text-sm text-deep-navy focus:border-wheat-gold focus:outline-none"
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
                    {sourceLabel && (
                      <span className="mt-1 block text-[11px] text-navy-200">
                        {locale === 'ar' ? 'المصدر: ' : 'Source: '}
                        {sourceLabel}
                      </span>
                    )}
                  </label>
                  <label className="block">
                    <span className="sr-only">
                      {locale === 'ar' ? 'النسبة المئوية' : 'Percentage'}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={row.percent || ''}
                      onChange={(e) =>
                        setRow(idx, { percent: clampPercent(Number(e.target.value)) })
                      }
                      placeholder="%"
                      min={0}
                      max={100}
                      step={0.5}
                      className="w-full rounded-lg border border-navy/10 bg-paper-white px-3 py-2 text-sm text-deep-navy focus:border-wheat-gold focus:outline-none"
                    />
                  </label>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="text-xs text-navy-200 sm:hidden">
                      {locale === 'ar' ? 'السطر:' : 'Line:'}
                    </span>
                    <span className="text-sm tabular-nums text-navy-200">
                      {commodity ? fmt(lineCost) : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-navy-200 transition hover:bg-alert-red/10 hover:text-alert-red disabled:opacity-30"
                      aria-label={locale === 'ar' ? 'حذف الخامة' : 'Remove component'}
                      disabled={items.length <= 1}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  </div>
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

        {/* Herd projection */}
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
                inputMode="decimal"
                value={totalTons}
                onChange={(e) => setTotalTons(clampNonNegative(Number(e.target.value)))}
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
                inputMode="numeric"
                value={herdSize || ''}
                onChange={(e) => setHerdSize(clampNonNegative(Number(e.target.value)))}
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
                inputMode="decimal"
                value={kgPerHeadPerDay || ''}
                onChange={(e) => setKgPerHeadPerDay(clampNonNegative(Number(e.target.value)))}
                min={0}
                step={0.5}
                className="w-full rounded-lg border border-navy/10 bg-paper-white px-3 py-2 text-sm text-deep-navy focus:border-wheat-gold focus:outline-none"
              />
            </label>
          </div>
        </section>

        {/* Breakeven */}
        <section className="rounded-xl border border-navy/8 bg-white p-6">
          <h2 className="mb-1 text-lg font-medium text-deep-navy">
            {locale === 'ar' ? 'تحليل الربحية (اختياري)' : 'Breakeven analysis (optional)'}
          </h2>
          <p className="mb-4 text-xs text-navy-200">
            {locale === 'ar'
              ? 'دخّل معامل التحويل وسعر بيع الكيلو علشان تشوف هتكسب ولا تخسر.'
              : 'Enter your FCR and selling price per kg to see your margin.'}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs text-navy-200">
                {locale === 'ar' ? 'نوع المنتج' : 'Output kind'}
              </span>
              <select
                value={outputKind}
                onChange={(e) => setOutputKind(e.target.value as OutputKind)}
                className="w-full rounded-lg border border-navy/10 bg-paper-white px-3 py-2 text-sm text-deep-navy focus:border-wheat-gold focus:outline-none"
              >
                {(Object.keys(OUTPUT_KIND_LABELS) as OutputKind[]).map((k) => (
                  <option key={k} value={k}>
                    {OUTPUT_KIND_LABELS[k][locale === 'ar' ? 'ar' : 'en']}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-navy-200">
                {locale === 'ar' ? 'معامل التحويل (FCR)' : 'FCR (kg feed / kg output)'}
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={fcr || ''}
                onChange={(e) => setFcr(clampNonNegative(Number(e.target.value)))}
                min={0}
                step={0.1}
                placeholder={outputKind === 'milk' ? '0.5' : outputKind === 'eggs' ? '2.5' : '6.5'}
                className="w-full rounded-lg border border-navy/10 bg-paper-white px-3 py-2 text-sm text-deep-navy focus:border-wheat-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-navy-200">
                {locale === 'ar' ? 'سعر بيع الكيلو (EGP)' : 'Selling price (EGP/kg)'}
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={outputPricePerKg || ''}
                onChange={(e) => setOutputPricePerKg(clampNonNegative(Number(e.target.value)))}
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
              disabled={!canSave || savingState === 'saving'}
              title={
                !canSave && hasAnyItem && !percentValid
                  ? locale === 'ar'
                    ? 'مجموع النسب لازم يكون 100% قبل الحفظ'
                    : 'Percentages must total 100% before saving'
                  : undefined
              }
              className="rounded-lg bg-deep-navy px-4 py-2 text-sm font-medium text-paper-white transition disabled:opacity-40 enabled:hover:opacity-90"
            >
              {savingState === 'saving'
                ? locale === 'ar'
                  ? 'جاري الحفظ...'
                  : 'Saving...'
                : locale === 'ar'
                  ? 'حفظ'
                  : 'Save'}
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-lg border border-navy/10 px-4 py-2 text-sm text-deep-navy hover:bg-navy/5"
            >
              {locale === 'ar' ? 'مسح' : 'Clear'}
            </button>
          </div>

          {savingState === 'error' && (
            <p className="mt-3 rounded-lg bg-alert-red/10 px-3 py-2 text-xs text-alert-red">
              {locale === 'ar'
                ? '⚠️ فشل الحفظ. حاول تاني بعد لحظات.'
                : '⚠️ Save failed. Try again in a moment.'}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2 rounded-lg border border-harvest-green/20 bg-harvest-green/5 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-deep-navy/90">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-harvest-green"
                aria-hidden
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {locale === 'ar'
                ? 'وصفاتك متزامنة على كل أجهزتك.'
                : 'Your formulas sync across all your devices.'}
            </p>
          </div>
        </section>
      </div>

      {/* ── Sidebar: results + saved list ─────────────────────────────── */}
      <aside className="space-y-6">
        <section className="rounded-xl border border-wheat-gold/30 bg-brand-50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-deep-navy/80">
              {locale === 'ar' ? 'النتائج' : 'Results'}
            </h3>
            <span
              className="inline-flex items-center gap-1 rounded-full bg-harvest-green/10 px-2 py-0.5 text-[11px] text-harvest-green"
              title={lastUpdatedISO ?? undefined}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-harvest-green" aria-hidden />
              {locale === 'ar' ? 'محدّث ' : 'updated '}
              {relativeFreshness(lastUpdatedISO, locale)}
            </span>
          </div>

          <dl className="space-y-3">
            {/* Hero stat: monthly cost when herd is set, otherwise cost per ton. */}
            {heroIsMonthly ? (
              <>
                <div>
                  <dt className="text-xs text-navy-200">
                    {locale === 'ar' ? 'تكلفة شهرية متوقعة (٣٠ يوم)' : 'Projected monthly cost (30 days)'}
                  </dt>
                  <dd className="text-3xl font-semibold tabular-nums text-deep-navy">
                    {fmt(monthlyCost)}{' '}
                    <span className="text-base font-normal text-navy-200">EGP</span>
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-navy/10 pt-3">
                  <div>
                    <dt className="text-xs text-navy-200">
                      {locale === 'ar' ? 'تكلفة يومية' : 'Daily cost'}
                    </dt>
                    <dd className="text-base font-medium tabular-nums text-deep-navy">
                      {fmt(dailyCost)}{' '}
                      <span className="text-xs font-normal text-navy-200">EGP</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-navy-200">
                      {locale === 'ar' ? 'تكلفة الطن' : 'Cost per ton'}
                    </dt>
                    <dd className="text-base font-medium tabular-nums text-deep-navy">
                      {fmt(costPerTon)}{' '}
                      <span className="text-xs font-normal text-navy-200">EGP</span>
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-navy-200">
                      {locale === 'ar' ? 'استهلاك يومي' : 'Daily consumption'}
                    </dt>
                    <dd className="text-sm tabular-nums text-deep-navy">
                      {fmt(dailyKg)}{' '}
                      <span className="text-xs font-normal text-navy-200">
                        {locale === 'ar' ? 'كجم/يوم' : 'kg/day'}
                      </span>
                    </dd>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <dt className="text-xs text-navy-200">
                    {locale === 'ar' ? 'تكلفة الطن' : 'Cost per ton'}
                  </dt>
                  <dd className="text-3xl font-semibold tabular-nums text-deep-navy">
                    {fmt(costPerTon)}{' '}
                    <span className="text-base font-normal text-navy-200">EGP</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-navy-200">
                    {locale === 'ar' ? 'إجمالي تكلفة الخلطة' : 'Total mix cost'}
                  </dt>
                  <dd className="text-lg font-medium tabular-nums text-deep-navy">
                    {fmt(totalCost)}{' '}
                    <span className="text-sm font-normal text-navy-200">EGP</span>
                  </dd>
                </div>
              </>
            )}

            {/* Breakeven block */}
            {showBreakeven && (
              <div className="border-t border-navy/10 pt-3">
                <dt className="mb-2 text-xs text-navy-200">
                  {locale === 'ar' ? 'تحليل الربحية' : 'Profitability'}
                </dt>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-navy-200">
                      {locale === 'ar' ? 'تكلفة كيلو ' : 'Cost per kg of '}
                      {OUTPUT_KIND_LABELS[outputKind][locale === 'ar' ? 'ar' : 'en']}
                    </span>
                    <span className="text-sm font-medium tabular-nums text-deep-navy">
                      {fmt2(costPerKgOutput)} EGP
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-navy-200">
                      {locale === 'ar' ? 'هامش الربح/كيلو' : 'Margin per kg'}
                    </span>
                    <span
                      className={`text-sm font-medium tabular-nums ${
                        marginPerKg >= 0 ? 'text-harvest-green' : 'text-alert-red'
                      }`}
                    >
                      {marginPerKg >= 0 ? '+' : ''}
                      {fmt2(marginPerKg)} EGP
                    </span>
                  </div>
                  <div
                    className={`rounded-md px-3 py-2 text-xs font-medium ${
                      marginPerKg >= 0
                        ? 'bg-harvest-green/10 text-harvest-green'
                        : 'bg-alert-red/10 text-alert-red'
                    }`}
                  >
                    {marginPerKg >= 0
                      ? locale === 'ar'
                        ? `✓ ربح ${fmt2(marginPercent)}٪ على البيع`
                        : `✓ Profit margin ${fmt2(marginPercent)}%`
                      : locale === 'ar'
                        ? `✗ خسارة ${fmt2(Math.abs(marginPercent))}٪ — لازم سعر بيع أعلى أو خلطة أرخص`
                        : `✗ Loss ${fmt2(Math.abs(marginPercent))}% — raise selling price or cheaper mix`}
                  </div>
                </div>
              </div>
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
            <h3 className="mb-4 text-sm font-medium text-deep-navy/80">
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
                      ({f.items.length} {locale === 'ar' ? 'مكوّن' : 'items'})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFormula(f.id)}
                    className="text-navy-200 transition hover:text-alert-red"
                    aria-label={locale === 'ar' ? 'حذف' : 'Delete'}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
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
