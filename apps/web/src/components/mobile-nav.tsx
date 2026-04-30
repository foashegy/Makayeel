'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

interface MobileNavLink {
  href: string;
  label: string;
}

interface MobileNavProps {
  links: MobileNavLink[];
  locale: 'ar' | 'en';
  ctaHref: string;
  ctaLabel: string;
}

export function MobileNav({ links, locale, ctaHref, ctaLabel }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={locale === 'ar' ? 'افتح القائمة' : 'Open menu'}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-navy/15 text-deep-navy hover:bg-navy/5 md:hidden dark:border-paper-white/15 dark:text-paper-white dark:hover:bg-paper-white/10"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-deep-navy/60 backdrop-blur-sm"
          />
          <aside
            className={
              'absolute top-0 h-full w-[78%] max-w-[340px] bg-paper-white p-6 shadow-xl dark:bg-[#0E1A26] ' +
              (locale === 'ar' ? 'right-0' : 'left-0')
            }
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-xl text-deep-navy dark:text-paper-white">
                {locale === 'ar' ? 'القائمة' : 'Menu'}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-deep-navy hover:bg-navy/5 dark:text-paper-white dark:hover:bg-paper-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-base font-medium text-deep-navy hover:bg-cream dark:text-paper-white dark:hover:bg-paper-white/5"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <Link
              href={ctaHref}
              onClick={() => setOpen(false)}
              className="mt-6 flex items-center justify-center rounded-lg bg-deep-navy px-4 py-3 text-sm font-semibold text-paper-white hover:bg-deep-navy/90 dark:bg-wheat-gold dark:text-deep-navy dark:hover:bg-wheat-gold/90"
            >
              {ctaLabel}
            </Link>
          </aside>
        </div>
      ) : null}
    </>
  );
}
