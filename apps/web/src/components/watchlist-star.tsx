'use client';

import * as React from 'react';
import { Star } from 'lucide-react';

interface WatchlistStarProps {
  slug: string;
  initialPinned: boolean;
  signedIn: boolean;
  locale: 'ar' | 'en';
}

export function WatchlistStar({ slug, initialPinned, signedIn, locale }: WatchlistStarProps) {
  const [pinned, setPinned] = React.useState(initialPinned);
  const [loading, setLoading] = React.useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      window.location.href = `/${locale}/login?next=/${locale}/prices`;
      return;
    }
    if (loading) return;
    const next = !pinned;
    setPinned(next);
    setLoading(true);
    try {
      const res = next
        ? await fetch('/api/v1/watchlist', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ slug }),
          })
        : await fetch(`/api/v1/watchlist?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });
      if (!res.ok) {
        // revert on failure
        setPinned(!next);
      }
    } catch {
      setPinned(!next);
    } finally {
      setLoading(false);
    }
  };

  const label = pinned
    ? locale === 'ar' ? 'إزالة من المفضلة' : 'Remove from watchlist'
    : locale === 'ar' ? 'إضافة للمفضلة' : 'Add to watchlist';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ' +
        (pinned
          ? 'border-wheat-gold/40 bg-wheat-gold/15 text-wheat-gold hover:bg-wheat-gold/25'
          : 'border-navy/10 text-navy-200 hover:border-wheat-gold/40 hover:text-wheat-gold dark:border-paper-white/15 dark:text-paper-white/55')
      }
    >
      <Star className="h-3.5 w-3.5" fill={pinned ? 'currentColor' : 'none'} strokeWidth={2} />
    </button>
  );
}
