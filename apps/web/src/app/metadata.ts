import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'مكاييل — Makayeel',
    template: '%s · مكاييل',
  },
  description: 'منصة أسعار خامات الأعلاف اليومية في السوق المصري — موثوقة، محدثة، ومربوطة بتليجرام.',
  applicationName: 'Makayeel',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'Makayeel',
    url: siteUrl,
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
};
