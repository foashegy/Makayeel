import { ImageResponse } from 'next/og';
import { getCommodityBySlug, getCommodityHistory } from '@/lib/queries';

export const runtime = 'nodejs';
export const alt = 'Makayeel — daily Egyptian feed-grain price';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { locale: string; slug: string } }) {
  const commodity = await getCommodityBySlug(params.slug);
  if (!commodity) {
    return new ImageResponse(<div>Makayeel</div>, size);
  }
  const history = await getCommodityHistory(params.slug, 30);
  const last = history?.series.at(-1)?.value ?? null;
  const prev = history?.series.at(-2)?.value ?? null;
  const delta = prev && prev !== 0 && last !== null ? ((last - prev) / prev) * 100 : 0;
  const arrow = delta > 0.05 ? '▲' : delta < -0.05 ? '▼' : '●';
  const deltaColor = delta > 0.05 ? '#22c55e' : delta < -0.05 ? '#ef4444' : '#94a3b8';
  const deltaLabel = Math.abs(delta) < 0.05 ? '' : `${arrow} ${Math.abs(delta).toFixed(1)}%`;

  const isAr = params.locale === 'ar';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(160deg, #1A2E40 0%, #0E1A26 100%)',
          padding: '60px 70px',
          fontFamily: 'sans-serif',
          color: '#F5EFE0',
          direction: isAr ? 'rtl' : 'ltr',
          position: 'relative',
        }}
      >
        {/* Top row: brand + tagline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30 }}>
          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: '#D4A24C',
              letterSpacing: 2,
            }}
          >
            مكاييل · MAKAYEEL
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 18, color: '#F5EFE0', opacity: 0.55 }}>
            {isAr ? 'أسعار اليوم — مباشر' : 'Live daily prices'}
          </div>
        </div>

        {/* Commodity name + delta */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, marginTop: 40 }}>
          <div style={{ fontSize: 92, fontWeight: 900, color: '#F5EFE0', lineHeight: 1 }}>
            {isAr ? commodity.nameAr : commodity.nameEn}
          </div>
          {deltaLabel ? (
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: deltaColor,
                background: `${deltaColor}26`,
                padding: '8px 20px',
                borderRadius: 12,
              }}
            >
              {deltaLabel}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', fontSize: 24, color: '#F5EFE0', opacity: 0.65, marginTop: 12 }}>
          {isAr ? commodity.nameEn : commodity.nameAr} · {commodity.unit}
        </div>

        <div style={{ flex: 1 }} />

        {/* Big price */}
        {last !== null ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
            <div
              style={{
                fontSize: 200,
                fontWeight: 900,
                color: '#D4A24C',
                fontFamily: 'monospace',
                lineHeight: 0.95,
                letterSpacing: -2,
              }}
            >
              {Math.round(last).toLocaleString('en-US')}
            </div>
            <div style={{ fontSize: 36, color: '#F5EFE0', opacity: 0.7 }}>EGP/ton</div>
          </div>
        ) : (
          <div style={{ fontSize: 64, color: '#F5EFE0', opacity: 0.55 }}>—</div>
        )}

        {/* Bottom row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 30,
            fontSize: 18,
            color: '#F5EFE0',
            opacity: 0.55,
            borderTop: '1px solid rgba(245, 239, 224, 0.12)',
            paddingTop: 20,
          }}
        >
          <div>makayeel.com</div>
          <div>{isAr ? 'منتج من ATEN STUDIO × بركة للأعلاف' : 'A product of ATEN STUDIO × Baraka Feeds'}</div>
        </div>
      </div>
    ),
    size,
  );
}
