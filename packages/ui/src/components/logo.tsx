import * as React from 'react';
import { cn } from '../lib/cn';

interface LogoProps extends React.SVGAttributes<SVGElement> {
  size?: number;
}

/**
 * The Makayeel icon — a vertical wheat stalk that doubles as a horizontal bar
 * chart. Navy stem + Wheat-Gold grain bars ascending from top to bottom.
 * The bottommost bar is Harvest Green to mark the "ground line" and tie back
 * to positive-delta coloring in the UI.
 */
export function Logo({ size = 40, className, ...rest }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn(className)}
      aria-hidden="true"
      {...rest}
    >
      <rect x="22" y="4" width="4" height="40" rx="1" fill="#1A2E40" />
      <rect x="16" y="10" width="6" height="3" rx="1.5" fill="#D4A24C" />
      <rect x="26" y="10" width="6" height="3" rx="1.5" fill="#D4A24C" />
      <rect x="14" y="16" width="8" height="3" rx="1.5" fill="#D4A24C" />
      <rect x="26" y="16" width="8" height="3" rx="1.5" fill="#D4A24C" />
      <rect x="12" y="22" width="10" height="3" rx="1.5" fill="#D4A24C" />
      <rect x="26" y="22" width="10" height="3" rx="1.5" fill="#D4A24C" />
      <rect x="10" y="28" width="12" height="3" rx="1.5" fill="#D4A24C" />
      <rect x="26" y="28" width="12" height="3" rx="1.5" fill="#D4A24C" />
      <rect x="8" y="34" width="14" height="3" rx="1.5" fill="#6BA368" />
      <rect x="26" y="34" width="14" height="3" rx="1.5" fill="#6BA368" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex flex-col leading-none', className)}>
      <span className="text-[1.375rem] font-medium text-deep-navy">مكاييل</span>
      <span
        className="mt-0.5 text-[0.6875rem] text-wheat-gold"
        style={{ fontFamily: 'var(--font-latin)', letterSpacing: '7px' }}
      >
        MAKAYEEL
      </span>
    </span>
  );
}

export function BrandMark({
  size = 40,
  className,
  wordmark = true,
}: {
  size?: number;
  className?: string;
  wordmark?: boolean;
}) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <Logo size={size} />
      {wordmark && <Wordmark />}
    </span>
  );
}
