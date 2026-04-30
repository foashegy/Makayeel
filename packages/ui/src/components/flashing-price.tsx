'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

interface FlashingPriceProps {
  /** The numeric value to render. When this changes, the element flashes. */
  value: number;
  /** Locale for number formatting. */
  locale: 'ar' | 'en';
  className?: string;
  /** Optional render override; receives the formatted string. */
  format?: (value: number, locale: 'ar' | 'en') => string;
}

const defaultFormat = (v: number, locale: 'ar' | 'en') =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(v);

/**
 * Renders a price with TradingView-style flash on update — green when the new
 * value is higher than the prior render, red when lower. Uses .price-flash-up
 * / .price-flash-down keyframes defined in globals.css.
 */
export function FlashingPrice({ value, locale, className, format = defaultFormat }: FlashingPriceProps) {
  const previous = React.useRef<number>(value);
  const [direction, setDirection] = React.useState<'up' | 'down' | null>(null);
  const tokenRef = React.useRef(0);

  React.useEffect(() => {
    if (previous.current === value) return;
    const dir: 'up' | 'down' = value > previous.current ? 'up' : 'down';
    setDirection(dir);
    previous.current = value;
    const myToken = ++tokenRef.current;
    const t = setTimeout(() => {
      // Only clear if no newer flash superseded us.
      if (myToken === tokenRef.current) setDirection(null);
    }, 700);
    return () => clearTimeout(t);
  }, [value]);

  const flashClass =
    direction === 'up' ? 'price-flash-up rounded-md px-1' :
    direction === 'down' ? 'price-flash-down rounded-md px-1' :
    '';

  return (
    <span className={cn(flashClass, className)} data-numeric>
      {format(value, locale)}
    </span>
  );
}
