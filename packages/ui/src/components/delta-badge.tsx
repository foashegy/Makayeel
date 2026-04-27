import * as React from 'react';
import { cn } from '../lib/cn';
import { formatDelta } from '../lib/format';
import type { Locale } from '@makayeel/i18n';

type Numeric = number | string | { toString(): string };

interface DeltaBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  current: Numeric;
  previous: Numeric | null | undefined;
  locale: Locale;
  size?: 'sm' | 'md';
}

export function DeltaBadge({
  current,
  previous,
  locale,
  size = 'md',
  className,
  ...rest
}: DeltaBadgeProps) {
  const { label, direction } = formatDelta(current, previous, locale);
  return (
    <span
      data-numeric
      dir="ltr"
      className={cn(
        'inline-flex items-center justify-center rounded-full font-mono font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-xs min-w-16' : 'px-2.5 py-1 text-xs min-w-20',
        direction === 'up' && 'bg-harvest-green/12 text-harvest-green',
        direction === 'down' && 'bg-alert-red/10 text-alert-red',
        direction === 'flat' && 'bg-navy/6 text-navy-200',
        className,
      )}
      {...rest}
    >
      {label}
    </span>
  );
}
