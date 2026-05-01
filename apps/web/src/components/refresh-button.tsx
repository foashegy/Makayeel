'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';

interface RefreshButtonProps {
  locale: 'ar' | 'en';
  /** Server's lastUpdated, used for the "X min ago" counter. */
  lastUpdated: string;
}

/**
 * Small client widget that lives in the sticky freshness bar. Shows time-
 * since-last-update (counts up live so the user feels the data age) and a
 * tap-to-refresh button that hard-reloads the page (which forces Next.js
 * ISR to re-fetch from Postgres).
 */
export function RefreshButton({ locale, lastUpdated }: RefreshButtonProps) {
  const [now, setNow] = React.useState(() => Date.now());
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const updatedTs = new Date(lastUpdated).getTime();
  const minutes = Math.max(0, Math.floor((now - updatedTs) / 60_000));

  const onClick = () => {
    setRefreshing(true);
    window.location.reload();
  };

  const ageLabel = minutes < 1
    ? (locale === 'ar' ? 'الآن' : 'just now')
    : minutes < 60
      ? (locale === 'ar' ? `منذ ${minutes} د` : `${minutes}m ago`)
      : (locale === 'ar' ? `منذ ${Math.floor(minutes / 60)} س` : `${Math.floor(minutes / 60)}h ago`);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={refreshing}
      aria-label={locale === 'ar' ? 'تحديث' : 'Refresh'}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-mono text-paper-white/85 hover:bg-white/15 disabled:opacity-50"
    >
      <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
      <span data-numeric>{ageLabel}</span>
    </button>
  );
}
