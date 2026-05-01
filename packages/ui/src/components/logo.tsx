import * as React from 'react';
import { cn } from '../lib/cn';

interface LogoProps extends React.SVGAttributes<SVGElement> {
  size?: number;
}

/**
 * The Makayeel mark — v2 (May 2026).
 * Stylized wheat ear: navy stem (gold in dark mode) + gold top tip + 3 gold leaf
 * pairs + 2 harvest-green leaf pairs. Mandorla (almond-lens) leaves angled outward.
 * Survives 16×16 favicons and WhatsApp circle crops.
 */
export function Logo({ size = 40, className, ...rest }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn(className)}
      aria-hidden="true"
      {...rest}
    >
      <rect
        x="30.8"
        y="6"
        width="2.4"
        height="52"
        rx="1.2"
        className="fill-deep-navy dark:fill-wheat-gold"
      />
      <path
        d="M32 4 C34.6 7 34.6 10.5 32 13 C29.4 10.5 29.4 7 32 4 Z"
        fill="#D4A24C"
      />
      <ellipse cx="25" cy="16" rx="6.5" ry="3.4" transform="rotate(-30 25 16)" fill="#D4A24C" />
      <ellipse cx="39" cy="16" rx="6.5" ry="3.4" transform="rotate(30 39 16)" fill="#D4A24C" />
      <ellipse cx="23.5" cy="22" rx="7.2" ry="3.7" transform="rotate(-30 23.5 22)" fill="#D4A24C" />
      <ellipse cx="40.5" cy="22" rx="7.2" ry="3.7" transform="rotate(30 40.5 22)" fill="#D4A24C" />
      <ellipse cx="22" cy="29" rx="8" ry="4" transform="rotate(-30 22 29)" fill="#D4A24C" />
      <ellipse cx="42" cy="29" rx="8" ry="4" transform="rotate(30 42 29)" fill="#D4A24C" />
      <ellipse cx="20.5" cy="38" rx="9" ry="4.4" transform="rotate(-30 20.5 38)" fill="#6BA368" />
      <ellipse cx="43.5" cy="38" rx="9" ry="4.4" transform="rotate(30 43.5 38)" fill="#6BA368" />
      <ellipse cx="19" cy="48" rx="10" ry="4.8" transform="rotate(-30 19 48)" fill="#6BA368" />
      <ellipse cx="45" cy="48" rx="10" ry="4.8" transform="rotate(30 45 48)" fill="#6BA368" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex flex-col leading-none', className)}>
      <span className="text-[1.375rem] font-medium text-deep-navy dark:text-paper-white">مكاييل</span>
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
