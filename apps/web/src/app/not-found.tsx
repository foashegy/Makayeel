import Link from 'next/link';
import { defaultLocale } from '@makayeel/i18n';

export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', backgroundColor: '#F5EFE0', color: '#1A2E40' }}>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '4rem', margin: 0, color: '#D4A24C' }}>404</h1>
          <p style={{ fontSize: '1.25rem', margin: '1rem 0' }}>الصفحة مش موجودة</p>
          <Link href={`/${defaultLocale}`} style={{ color: '#1A2E40', textDecoration: 'underline' }}>
            ارجع للرئيسية
          </Link>
        </main>
      </body>
    </html>
  );
}
