'use client';

import * as React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
} from 'recharts';
import { formatNumber, formatDate, formatPrice } from '../lib/format';
import type { Locale } from '@makayeel/i18n';

export interface PriceChartPoint {
  date: string; // ISO date
  value: number;
}

interface PriceChartProps {
  data: PriceChartPoint[];
  locale: Locale;
  period: '7d' | '30d' | '90d' | '1y';
  height?: number;
}

export function PriceChart({ data, locale, height = 280 }: PriceChartProps) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="makayeel-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4A24C" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#F5EFE0" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A2E4010" />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => formatDate(v, locale, 'd MMM')}
            tick={{ fill: '#8FA0B3', fontSize: 11 }}
            stroke="#1A2E4020"
          />
          <YAxis
            tickFormatter={(v: number) => formatNumber(v, locale, { maximumFractionDigits: 0 })}
            tick={{ fill: '#8FA0B3', fontSize: 11 }}
            stroke="#1A2E4020"
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #1A2E4015',
              boxShadow: '0 4px 16px rgba(26,46,64,0.08)',
              fontFamily: 'var(--font-arabic)',
            }}
            formatter={(v: number) => [formatPrice(v, locale), '']}
            labelFormatter={(v: string) => formatDate(v, locale, 'EEEE d MMMM yyyy')}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#D4A24C"
            strokeWidth={2.5}
            fill="url(#makayeel-grad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Minimal sparkline — for list rows, dashboards. */
export function PriceSparkline({
  data,
  height = 40,
  width = 120,
}: {
  data: PriceChartPoint[];
  height?: number;
  width?: number;
}) {
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke="#D4A24C" strokeWidth={1.75} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
