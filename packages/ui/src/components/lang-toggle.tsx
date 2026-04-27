'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/cn';
import { locales, type Locale } from '@makayeel/i18n';

interface LangToggleProps {
  current: Locale;
  className?: string;
}

/**
 * Simple 2-locale switcher — swaps the leading `/ar` ↔ `/en` segment.
 * Preserves the rest of the path and search params.
 */
export function LangToggle({ current, className }: LangToggleProps) {
  const pathname = usePathname();
  const other: Locale = current === 'ar' ? 'en' : 'ar';
  const pathWithoutLocale = pathname.replace(
    new RegExp(`^/(${locales.join('|')})(?=/|$)`),
    '',
  );
  const target = `/${other}${pathWithoutLocale || ''}` || `/${other}`;

  return (
    <Link
      href={target}
      className={cn(
        'inline-flex items-center justify-center rounded-md border border-navy/15 px-3 py-1.5 text-xs font-medium text-deep-navy',
        'hover:bg-navy/5 transition-colors',
        className,
      )}
      aria-label={`Switch to ${other === 'ar' ? 'Arabic' : 'English'}`}
    >
      {other === 'ar' ? 'عربي' : 'EN'}
    </Link>
  );
}
