'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', backgroundColor: '#F5EFE0', color: '#1A2E40' }}>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', margin: 0, color: '#C44545' }}>حصلت مشكلة</h1>
          <p style={{ fontSize: '1.125rem', margin: '1rem 0' }}>حاول تاني بعد شوية.</p>
          <button
            onClick={reset}
            style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', backgroundColor: '#1A2E40', color: '#FAFAF5', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
          >
            إعادة المحاولة
          </button>
        </main>
      </body>
    </html>
  );
}
