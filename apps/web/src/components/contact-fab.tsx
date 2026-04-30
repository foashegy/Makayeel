'use client';

import * as React from 'react';
import { Phone } from 'lucide-react';

interface ContactFabProps {
  locale: 'ar' | 'en';
}

const WA_NUMBER = '201555001688';
const PHONE_NUMBER = '01222203810';

/** Sticky contact buttons fixed bottom-end of every page. WhatsApp opens
 * wa.me with a pre-filled Arabic message; call opens the dialer. Stays out
 * of the way on desktop (small) and dominant on mobile (so a 60-year-old
 * mill operator can find it immediately). */
export function ContactFab({ locale }: ContactFabProps) {
  const [open, setOpen] = React.useState(false);
  const waMessage = encodeURIComponent(
    locale === 'ar'
      ? 'السلام عليكم، استفسار عن أسعار خامات الأعلاف من مكاييل'
      : 'Hello — I have a question about Makayeel feed-grain prices',
  );
  const waHref = `https://wa.me/${WA_NUMBER}?text=${waMessage}`;
  const telHref = `tel:+2${PHONE_NUMBER}`;

  return (
    <div
      className="fixed bottom-4 z-40 flex flex-col items-end gap-2 sm:bottom-6"
      style={{ [locale === 'ar' ? 'left' : 'right']: '1rem' }}
    >
      {open ? (
        <>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700"
            aria-label={locale === 'ar' ? 'واتساب' : 'WhatsApp'}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.768.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.04 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.453 3.488z" />
            </svg>
            <span>{locale === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
            <span className="font-mono text-xs opacity-90" data-numeric>01555001688</span>
          </a>
          <a
            href={telHref}
            className="flex items-center gap-2 rounded-full bg-deep-navy px-4 py-2.5 text-sm font-semibold text-paper-white shadow-lg transition hover:bg-navy-600"
            aria-label={locale === 'ar' ? 'اتصل' : 'Call'}
          >
            <Phone className="h-4 w-4" />
            <span>{locale === 'ar' ? 'اتصل' : 'Call'}</span>
            <span className="font-mono text-xs opacity-90" data-numeric>{PHONE_NUMBER}</span>
          </a>
        </>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={locale === 'ar' ? (open ? 'إخفاء التواصل' : 'تواصل') : (open ? 'Hide contact' : 'Contact')}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-wheat-gold text-deep-navy shadow-xl transition hover:scale-105 sm:h-14 sm:w-14"
      >
        {open ? (
          <span className="text-xl font-bold">×</span>
        ) : (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15a2 2 0 0 1-2 2h-3l-4 4v-4H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
