import * as React from 'react';
import { cn } from '../lib/cn';

type SourceType = 'PORT' | 'WHOLESALER' | 'EXCHANGE' | 'FACTORY';

interface SourceBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  nameAr: string;
  nameEn: string;
  type: SourceType;
  locale: 'ar' | 'en';
}

const TYPE_COLORS: Record<SourceType, string> = {
  PORT: 'bg-blue-50 text-blue-700',
  WHOLESALER: 'bg-amber-50 text-amber-800',
  EXCHANGE: 'bg-purple-50 text-purple-700',
  FACTORY: 'bg-emerald-50 text-emerald-700',
};

export function SourceBadge({
  nameAr,
  nameEn,
  type,
  locale,
  className,
  ...rest
}: SourceBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        TYPE_COLORS[type],
        className,
      )}
      {...rest}
    >
      {locale === 'ar' ? nameAr : nameEn}
    </span>
  );
}
