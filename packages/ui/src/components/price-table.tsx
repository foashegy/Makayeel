'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '../lib/cn';
import { formatPrice } from '../lib/format';
import { DeltaBadge } from './delta-badge';
import { CommodityIcon } from './commodity-icon';
import { SourceBadge } from './source-badge';
import type { Locale } from '@makayeel/i18n';

type Numeric = number | string | { toString(): string };

export interface PriceTableRow {
  priceId: string;
  commoditySlug: string;
  commodityIconKey: string | null;
  commodityNameAr: string;
  commodityNameEn: string;
  commodityCategory: string;
  sourceSlug: string;
  sourceNameAr: string;
  sourceNameEn: string;
  sourceType: 'PORT' | 'WHOLESALER' | 'EXCHANGE' | 'FACTORY';
  value: Numeric;
  previous: Numeric | null;
  unit: string;
  date: string;
}

interface PriceTableProps {
  rows: PriceTableRow[];
  locale: Locale;
  labels: {
    commodity: string;
    source: string;
    price: string;
    delta: string;
    unit: string;
  };
  emptyLabel: string;
}

export function PriceTable({ rows, locale, labels, emptyLabel }: PriceTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-navy/8 bg-white p-12 text-center text-navy-200">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-navy/8 bg-white shadow-card">
      <table className="w-full text-sm">
        <thead className="border-b border-navy/8 bg-cream/60">
          <tr className="text-start text-xs font-medium uppercase tracking-wider text-navy-300">
            <th className="px-4 py-3 text-start">{labels.commodity}</th>
            <th className="px-4 py-3 text-start">{labels.source}</th>
            <th className="px-4 py-3 text-end">{labels.price}</th>
            <th className="px-4 py-3 text-end">{labels.delta}</th>
            <th className="px-4 py-3 text-start">{labels.unit}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const name = locale === 'ar' ? row.commodityNameAr : row.commodityNameEn;
            return (
              <tr
                key={row.priceId}
                className="border-b border-navy/6 last:border-0 hover:bg-cream/30"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/${locale}/commodities/${row.commoditySlug}`}
                    className="flex items-center gap-3"
                  >
                    <CommodityIcon
                      slug={row.commoditySlug}
                      iconKey={row.commodityIconKey}
                      nameAr={row.commodityNameAr}
                      size="sm"
                    />
                    <span className="font-medium text-deep-navy">{name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <SourceBadge
                    nameAr={row.sourceNameAr}
                    nameEn={row.sourceNameEn}
                    type={row.sourceType}
                    locale={locale}
                  />
                </td>
                <td
                  className={cn('px-4 py-3 text-end font-mono font-medium text-charcoal')}
                  data-numeric
                >
                  {formatPrice(row.value, locale)}
                </td>
                <td className="px-4 py-3 text-end">
                  <DeltaBadge current={row.value} previous={row.previous} locale={locale} />
                </td>
                <td className="px-4 py-3 text-xs text-navy-200">{row.unit}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
