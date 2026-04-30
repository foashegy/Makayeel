import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ScrapedProductSchema = z.object({
  nameAr: z.string().min(2),
  nameEn: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'lowercase ascii slug only'),
  category: z.enum(['GRAINS', 'PROTEINS', 'BYPRODUCTS', 'ADDITIVES', 'OILS', 'FINISHED_FEED']),
  unit: z.string().default('EGP/ton'),
  value: z.number().positive(),
  date: z.string().nullable().optional(),
});
const ScrapeResultSchema = z.object({
  products: z.array(ScrapedProductSchema),
  pageDate: z.string().nullable().optional(),
});

export type ScrapedProduct = z.infer<typeof ScrapedProductSchema>;
export type ScrapeResult = z.infer<typeof ScrapeResultSchema>;

export function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '')
    .slice(0, 50_000);
}

async function fetchPage(filter: 7 | 8): Promise<string> {
  const url = `https://mazra3ty.com/boursa-company-list?filter=${filter}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Makayeel-Bot scraper)' },
  });
  if (!res.ok) throw new Error(`mazra3ty fetch failed: ${res.status}`);
  return stripHtml(await res.text());
}

export async function extractFromHtml(
  html: string,
  pageHint: 'raw_materials' | 'compound_feeds',
  siteName = 'mazra3ty.com',
): Promise<ScrapeResult> {
  const categoryHint =
    pageHint === 'raw_materials'
      ? 'الفئة (category) ممكن تكون: GRAINS (ذرة، شعير، قمح)، PROTEINS (كسب صويا، جلوتين)، BYPRODUCTS (ردة، كسر أرز)، OILS (زيت صويا، زيت ذرة).'
      : 'الفئة (category) لازم تكون FINISHED_FEED لكل منتج.';

  const systemPrompt = `أنت مساعد لاستخراج جدول أسعار من HTML لموقع ${siteName} المصري.

المهمة:
- ابحث عن جدول الأسعار في الـ HTML.
- ارجع كل صف كمنتج بالشكل ده:
  {
    "nameAr": "الاسم بالعربي زي ما هو",
    "nameEn": "ترجمة إنجليزية واضحة",
    "slug": "kebab-case-english-slug",  // مثال: "argentine-corn", "soybean-meal-46-local", "super-starter-24"
    "category": "GRAINS" | "PROTEINS" | "BYPRODUCTS" | "ADDITIVES" | "OILS" | "FINISHED_FEED",
    "unit": "EGP/ton",
    "value": 13600,                      // رقم بـ EGP/ton
    "date": "2026-04-29" | null          // لو فيه تاريخ في الصف ارجعه ISO، غير كده null
  }
- ارجع برضه pageDate لو فيه تاريخ عام للصفحة.

${categoryHint}

ارجع JSON فقط، من غير شرح أو markdown:
{
  "products": [...],
  "pageDate": "..." | null
}

لو الجدول مش لاقيه في الـ HTML، ارجع: {"products": [], "pageDate": null}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: html }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text');
  }
  const cleaned = textBlock.text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
  const parsed = ScrapeResultSchema.safeParse(JSON.parse(cleaned));
  if (!parsed.success) {
    throw new Error(`Scrape JSON validation failed: ${parsed.error.message}`);
  }
  return parsed.data;
}

export async function scrapeRawMaterials(): Promise<ScrapeResult> {
  const html = await fetchPage(8);
  return extractFromHtml(html, 'raw_materials');
}

export async function scrapeCompoundFeeds(): Promise<ScrapeResult> {
  const html = await fetchPage(7);
  return extractFromHtml(html, 'compound_feeds');
}
