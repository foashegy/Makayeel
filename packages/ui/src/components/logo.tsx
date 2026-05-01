import * as React from 'react';
import { cn } from '../lib/cn';

interface LogoProps extends React.SVGAttributes<SVGElement> {
  size?: number;
}

/**
 * The Makayeel mark — a stylized wheat ear in solid mandorla grains.
 * Wheat-Gold stem and apex + 6 gold grains (top three pairs) + 4 harvest-green
 * grains (bottom two pairs). Designed to survive 40×40 thumbnails and the
 * WhatsApp circle crop. v2 — May 2026.
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
      <rect x="23" y="6" width="2" height="36" rx="1" fill="#D4A24C" />
      <path d="M24 2 Q26.2 5 24 8 Q21.8 5 24 2 Z" fill="#D4A24C" />
      <path d="M13 12 Q17 9.8 21 12 Q17 14.2 13 12 Z" fill="#D4A24C" />
      <path d="M27 12 Q31 9.8 35 12 Q31 14.2 27 12 Z" fill="#D4A24C" />
      <path d="M11 18 Q16 15.6 21 18 Q16 20.4 11 18 Z" fill="#D4A24C" />
      <path d="M27 18 Q32 15.6 37 18 Q32 20.4 27 18 Z" fill="#D4A24C" />
      <path d="M9 24 Q15 21.4 21 24 Q15 26.6 9 24 Z" fill="#D4A24C" />
      <path d="M27 24 Q33 21.4 39 24 Q33 26.6 27 24 Z" fill="#D4A24C" />
      <path d="M8 31 Q14.5 28.2 21 31 Q14.5 33.8 8 31 Z" fill="#6BA368" />
      <path d="M27 31 Q33.5 28.2 40 31 Q33.5 33.8 27 31 Z" fill="#6BA368" />
      <path d="M7 38 Q14 35 21 38 Q14 41 7 38 Z" fill="#6BA368" />
      <path d="M27 38 Q34 35 41 38 Q34 41 27 38 Z" fill="#6BA368" />
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
