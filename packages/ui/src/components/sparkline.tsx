import * as React from 'react';
import { cn } from '../lib/cn';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  /** Render as up/down/flat colour automatically based on first vs last point. */
  trend?: 'auto' | 'up' | 'down' | 'flat';
  className?: string;
  ariaLabel?: string;
}

/**
 * Tiny line chart with no axes — pure shape signal, like Yahoo Finance / TradingView
 * watchlist rows. Renders as inline SVG so it scales crisply at any size.
 */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  trend = 'auto',
  className,
  ariaLabel,
}: SparklineProps) {
  if (!values || values.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className={cn('opacity-30', className)}
        aria-label={ariaLabel ?? 'no history'}
      >
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const pathD = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
  const areaD = `${pathD} L${(points[points.length - 1]?.[0] ?? 0).toFixed(2)},${height} L0,${height} Z`;

  const auto =
    trend === 'auto'
      ? values[values.length - 1]! > values[0]!
        ? 'up'
        : values[values.length - 1]! < values[0]!
          ? 'down'
          : 'flat'
      : trend;

  const colour =
    auto === 'up'
      ? 'text-emerald-500'
      : auto === 'down'
        ? 'text-red-500'
        : 'text-charcoal/45';
  const fillOpacity = auto === 'flat' ? '0.04' : '0.10';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn(colour, className)}
      role="img"
      aria-label={ariaLabel ?? `${values.length}-point sparkline`}
    >
      <path d={areaD} fill="currentColor" fillOpacity={fillOpacity} />
      <path d={pathD} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
