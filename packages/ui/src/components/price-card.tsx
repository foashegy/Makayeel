import * as React from 'react';
import { cn } from '../lib/cn';
import { formatPrice } from '../lib/format';
import type { Locale } from '@makayeel/i18n';
import { DeltaBadge } from './delta-badge';
import { CommodityIcon } from './commodity-icon';

type Numeric = number | string | { toString(): string };

interface PriceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  slug: string;
  iconKey?: string | null;
  nameAr: string;
  nameEn: string;
  unit: string;
  currentPrice: Numeric;
  previousPrice: Numeric | null;
  locale: Locale;
  sourceLabel?: string;
  compact?: boolean;
}

export function PriceCard({
  slug,
  iconKey,
  nameAr,
  nameEn,
  unit,
  currentPrice,
  previousPrice,
  locale,
  sourceLabel,
  compact = false,
  className,
  ...rest
}: PriceCardProps) {
  const name = locale === 'ar' ? nameAr : nameEn;
  const subtitle = locale === 'ar' ? nameEn : nameAr;

  return (
    <div
      className={cn(
        'rounded-2xl border border-navy/8 bg-white p-4 shadow-card transition hover:shadow-card-hover',
        compact ? 'p-3' : 'p-4',
        className,
      )}
      {...rest}
    >
      <div className="flex items-start gap-3">
        <CommodityIcon slug={slug} iconKey={iconKey} nameAr={nameAr} size={compact ? 'sm' : 'md'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-sm font-medium text-deep-navy truncate">{name}</h4>
            <DeltaBadge current={currentPrice} previous={previousPrice} locale={locale} size="sm" />
          </div>
          <p className="text-[11px] text-navy-200 truncate">{subtitle}</p>
          {sourceLabel && (
            <p className="mt-0.5 text-[11px] text-navy-200 truncate">{sourceLabel}</p>
          )}
          <p className="mt-2 font-mono text-base font-medium text-charcoal" data-numeric>
            {formatPrice(currentPrice, locale)}
          </p>
          <p className="text-[11px] text-navy-200">{unit}</p>
        </div>
      </div>
    </div>
  );
}
