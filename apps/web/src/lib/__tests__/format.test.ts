import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatPrice,
  formatDelta,
  formatDate,
} from '@makayeel/ui';

describe('formatNumber', () => {
  it('uses Arabic-Indic digits in ar-EG', () => {
    const out = formatNumber(14250, 'ar');
    expect(out).toContain('١');
    expect(out).toContain('٢');
  });

  it('uses Western digits in en-US', () => {
    expect(formatNumber(14250, 'en')).toBe('14,250');
  });

  it('handles decimal options', () => {
    expect(formatNumber(1234.56, 'en', { maximumFractionDigits: 1 })).toBe('1,234.6');
  });
});

describe('formatPrice', () => {
  it('appends EGP suffix in English', () => {
    expect(formatPrice(14250, 'en')).toBe('14,250 EGP');
  });

  it('appends ج.م suffix in Arabic', () => {
    expect(formatPrice(14250, 'ar')).toContain('ج.م');
  });

  it('accepts string inputs (Prisma Decimal)', () => {
    expect(formatPrice('14250.00', 'en')).toBe('14,250 EGP');
  });
});

describe('formatDelta', () => {
  it('returns up direction on increase', () => {
    const d = formatDelta(15000, 14000, 'en');
    expect(d.direction).toBe('up');
    expect(d.label).toContain('▲');
  });

  it('returns down direction on decrease', () => {
    const d = formatDelta(13000, 14000, 'en');
    expect(d.direction).toBe('down');
    expect(d.label).toContain('▼');
  });

  it('returns flat on tiny moves and null previous', () => {
    expect(formatDelta(14000, 14000, 'en').direction).toBe('flat');
    expect(formatDelta(14000, null, 'en').direction).toBe('flat');
  });
});

describe('formatDate', () => {
  it('formats dates in Cairo timezone for en', () => {
    const out = formatDate('2026-04-18T00:00:00Z', 'en', 'yyyy-MM-dd');
    expect(out).toMatch(/2026-04-18/);
  });

  it('formats dates for ar with Arabic month names', () => {
    const out = formatDate('2026-04-18T00:00:00Z', 'ar', 'MMMM');
    // Arabic April = أبريل / نيسان (exact value depends on locale build) — just assert Arabic text
    expect(out).toMatch(/[\u0600-\u06FF]/);
  });
});
