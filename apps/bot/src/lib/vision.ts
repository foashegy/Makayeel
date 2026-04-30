import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { getCommodities } from './queries';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ExtractedPriceSchema = z.object({
  commoditySlug: z.string(),
  value: z.number().positive(),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
});
const ExtractionResultSchema = z.object({
  prices: z.array(ExtractedPriceSchema),
  sourceLabel: z.string().nullable().optional(),
  sourceSlug: z.string().regex(/^[a-z0-9-]+$/).nullable().optional(),
  sourceType: z.enum(['PORT', 'WHOLESALER', 'EXCHANGE', 'FACTORY']).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type ExtractedPrice = z.infer<typeof ExtractedPriceSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

export async function extractRawMaterialPrices(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<ExtractionResult> {
  const commodities = await getCommodities();
  const slugTable = commodities
    .map((c) => `- ${c.slug}: ${c.nameAr} (${c.nameEn}) — ${c.unit}`)
    .join('\n');

  const systemPrompt = `أنت مساعد لاستخراج أسعار خامات الأعلاف من صور لوحات أسعار مصرية.

الخامات المعروفة (استخدم slug زي ما هو):
${slugTable}

قواعد:
- ارجع JSON بس، من غير أي شرح.
- للقيمة: رقم بالـ EGP/ton الواحد. لو السعر مكتوب بالكيلو اضربه ×1000. لو مكتوب بالأردب (ذرة) اعتبر أردب الذرة = 140 كجم.
- لو الخامة مش في القائمة فوق، تجاهلها.
- لو في شك في رقم خليه confidence: "low".
- استخرج المصدر (sourceLabel) من الشعار/الترويسة (مثلاً "بركة للأعلاف"، "VETFEP"، "إكرام"، "الكيان"، "ميناء الإسكندرية").
- اقترح sourceSlug مناسب (kebab-case إنجليزي): مثال "baraka-feed", "vetfep", "ekram-feed", "al-kayan", "alex-port".
- sourceType: "FACTORY" لشركات الأعلاف، "PORT" للموانئ، "WHOLESALER" للتجار، "EXCHANGE" لمزرعتي وأي بورصة.
- لو مفيش مصدر واضح، اترك sourceLabel/sourceSlug = null (هيتسجل تحت الميناء).

شكل الـ JSON:
{
  "prices": [{"commoditySlug": "yellow-corn", "value": 18500, "confidence": "high"}, ...],
  "sourceLabel": "بركة للأعلاف" | null,
  "sourceSlug": "baraka-feed" | null,
  "sourceType": "FACTORY" | "PORT" | "WHOLESALER" | "EXCHANGE" | null,
  "notes": "..." | null
}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: 'استخرج كل الأسعار من الصورة دي.' },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Vision response had no text block');
  }
  const cleaned = textBlock.text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
  const parsed = ExtractionResultSchema.safeParse(JSON.parse(cleaned));
  if (!parsed.success) {
    throw new Error(`Vision JSON validation failed: ${parsed.error.message}`);
  }
  const knownSlugs = new Set(commodities.map((c) => c.slug));
  parsed.data.prices = parsed.data.prices.filter((p) => knownSlugs.has(p.commoditySlug));
  return parsed.data;
}
