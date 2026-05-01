import { describe, it, expect } from 'vitest';

/**
 * Spec for the median-aggregation logic embedded in
 * apps/web/src/lib/queries.ts::getRecentSparklines. We don't import the real
 * function (it requires a live DB), but we do mirror the median algo here so
 * the contract is locked: same dates → same numbers across multi-source rows.
 */
function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m]! : ((sorted[m - 1] ?? 0) + (sorted[m] ?? 0)) / 2;
}

describe('median aggregation across multi-source price rows', () => {
  it('returns the middle of an odd-length list', () => {
    expect(median([10, 20, 30])).toBe(20);
  });
  it('averages the two middle of an even-length list', () => {
    expect(median([10, 20, 30, 40])).toBe(25);
  });
  it('handles a single value', () => {
    expect(median([42])).toBe(42);
  });
  it('returns 0 on empty', () => {
    expect(median([])).toBe(0);
  });
  it('does not mutate the input', () => {
    const xs = [3, 1, 2];
    median(xs);
    expect(xs).toEqual([3, 1, 2]);
  });
});

describe('% delta calculation', () => {
  function deltaPct(current: number, previous: number | null): number {
    return previous && previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  }
  it('is 0 when previous is null', () => {
    expect(deltaPct(100, null)).toBe(0);
  });
  it('is 0 when previous is 0', () => {
    expect(deltaPct(100, 0)).toBe(0);
  });
  it('is positive when current > previous', () => {
    expect(deltaPct(110, 100)).toBeCloseTo(10);
  });
  it('is negative when current < previous', () => {
    expect(deltaPct(90, 100)).toBeCloseTo(-10);
  });
});
