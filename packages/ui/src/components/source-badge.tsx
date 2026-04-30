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
  PORT: 'bg-blue-50 text-blue-800 border-blue-200/60',
  WHOLESALER: 'bg-amber-50 text-amber-900 border-amber-200/60',
  EXCHANGE: 'bg-purple-50 text-purple-800 border-purple-200/60',
  FACTORY: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
};

const TYPE_ICONS: Record<SourceType, React.ReactNode> = {
  PORT: (
    // anchor / port
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v15M5 12H2a10 10 0 0 0 20 0h-3M8 11h8" />
    </svg>
  ),
  FACTORY: (
    // factory
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
      <path d="M2 20h20V8l-6 4V8l-6 4V4H6v16Z" />
      <path d="M6 20v-4M10 20v-4M14 20v-4M18 20v-4" />
    </svg>
  ),
  EXCHANGE: (
    // bar chart / exchange
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
      <path d="M3 21V10M9 21V4M15 21v-8M21 21v-5" />
    </svg>
  ),
  WHOLESALER: (
    // warehouse / package
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
      <path d="M3 9l9-6 9 6v12H3V9Z" />
      <path d="M9 21V12h6v9" />
    </svg>
  ),
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
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        TYPE_COLORS[type],
        className,
      )}
      {...rest}
    >
      <span className="opacity-70">{TYPE_ICONS[type]}</span>
      {locale === 'ar' ? nameAr : nameEn}
    </span>
  );
}
