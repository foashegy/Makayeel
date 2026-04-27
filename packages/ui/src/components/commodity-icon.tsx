import * as React from 'react';
import { cn } from '../lib/cn';

const ICON_MAP: Record<string, string> = {
  corn: '🌽',
  soy: '🫘',
  wheat: '🌾',
  barley: '🌾',
  sunflower: '🌻',
  ddgs: '🌰',
};

interface CommodityIconProps extends React.HTMLAttributes<HTMLDivElement> {
  slug: string;
  iconKey?: string | null;
  nameAr?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CommodityIcon({
  slug,
  iconKey,
  nameAr,
  size = 'md',
  className,
  ...rest
}: CommodityIconProps) {
  const emoji = iconKey ? ICON_MAP[iconKey] : undefined;
  const dims =
    size === 'sm' ? 'h-8 w-8 text-base' : size === 'lg' ? 'h-14 w-14 text-2xl' : 'h-10 w-10 text-lg';

  if (emoji) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl bg-brand-50',
          dims,
          className,
        )}
        role="img"
        aria-label={nameAr ?? slug}
        {...rest}
      >
        {emoji}
      </div>
    );
  }

  // Fallback — first letter of slug on a deep-navy circle.
  const letter = (nameAr?.[0] ?? slug[0] ?? '•').toUpperCase();
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl bg-deep-navy text-cream font-medium',
        dims,
        className,
      )}
      role="img"
      aria-label={nameAr ?? slug}
      {...rest}
    >
      {letter}
    </div>
  );
}
