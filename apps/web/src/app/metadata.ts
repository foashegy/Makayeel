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
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'Makayeel',
    url: siteUrl,
    locale: 'ar_EG',
    alternateLocale: ['en_US'],
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Makayeel — مكاييل',
      },
    ],
  },
  twitter: { card: 'summary_large_image', site: '@makayeel' },
  robots: { index: true, follow: true },
};
