import { describe, it, expect } from 'vitest';
import { fmtNum, sparkline, mdEscape } from '../lib/format';

describe('fmtNum', () => {
  it('formats with Arabic-Indic digits in ar', () => {
    expect(fmtNum(14250, 'ar')).toMatch(/[٠-٩]/);
  });
  it('formats with Western digits in en', () => {
    expect(fmtNum(14250, 'en')).toBe('14,250');
  });
});

describe('sparkline', () => {
  it('returns empty string for empty input', () => {
    expect(sparkline([])).toBe('');
  });
  it('returns one char per value', () => {
    const s = sparkline([1, 2, 3, 4, 5]);
    expect(s.length).toBe(5);
  });
  it('uses low chars for low values', () => {
    const s = sparkline([1, 1, 1, 1]);
    // All same value → all chars equal (min index)
    expect(new Set(s).size).toBe(1);
  });
});

describe('mdEscape', () => {
  it('escapes Telegram MarkdownV2 reserved chars', () => {
    expect(mdEscape('Hello. [World]!')).toBe('Hello\\. \\[World\\]\\!');
  });
  it('leaves safe text alone', () => {
    expect(mdEscape('hello')).toBe('hello');
  });
});
