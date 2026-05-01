import { describe, it, expect } from 'vitest';
import { stripHtml } from '../lib/mazra3ty-scraper';

describe('stripHtml', () => {
  it('removes script tags entirely', () => {
    const html = '<div>keep</div><script>alert(1)</script><p>after</p>';
    const stripped = stripHtml(html);
    expect(stripped).not.toContain('alert(1)');
    expect(stripped).toContain('keep');
    expect(stripped).toContain('after');
  });

  it('removes style tags', () => {
    expect(stripHtml('<style>body{}</style>x')).not.toContain('body{}');
  });

  it('removes HTML comments', () => {
    expect(stripHtml('<!-- secret --><p>visible</p>')).not.toContain('secret');
  });

  it('caps output at 50_000 chars', () => {
    const huge = 'x'.repeat(60_000);
    expect(stripHtml(huge).length).toBeLessThanOrEqual(50_000);
  });
});
