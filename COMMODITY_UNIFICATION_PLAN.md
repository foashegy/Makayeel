# Commodity Unification Plan — 2026-05-01

**الحالي:** 37 سلعة في الـ DB (مكرر كتير من scrapers/Vision)
**الهدف:** ~16 سلعة canonical + Price.origin field

---

## 1) المشكلة الجوهرية

السكرابرز المختلفة (Baraka, Esraa, Mazra3ty, Elmorshd, Vision OCR من بوت تليجرام) كل واحد كاتب اسم المنتج بطريقة مختلفة، فبتتسجل في الـ DB كـ commodities منفصلة.

أمثلة على نفس المنتج بأسماء مختلفة:
- `super-fattening-grower-21` ≡ `super-grower-feed-21` ≡ `super-starter-grower-21`
- `super-fattening-grower-21` ≡ `super-fattening-growing-21` (grower vs growing)
- `local-bran` ≡ `wheat-bran` بس origin محلي
- `argentine-corn` ≡ `yellow-corn` بس origin أرجنتيني

كمان `displayOrder=31` متكرر مرتين.

---

## 2) Target Taxonomy (16 سلعة canonical)

### حبوب — Grains (3)
| slug | nameAr | nameEn |
|---|---|---|
| `yellow-corn` | ذرة صفراء | Yellow Corn |
| `white-corn` | ذرة بيضاء | White Corn |
| `barley` | شعير | Barley |

### بروتينات / كسب — Proteins (4)
| slug | nameAr | nameEn |
|---|---|---|
| `soybean-meal-44` | كسب فول الصويا 44% | Soybean Meal 44% |
| `soybean-meal-46` | كسب فول الصويا 46% | Soybean Meal 46% |
| `soybean-meal-48` | كسب فول الصويا 48% | Soybean Meal 48% |
| `sunflower-meal` | كسب عباد الشمس | Sunflower Meal |

### مخلفات — Byproducts (3)
| slug | nameAr | nameEn |
|---|---|---|
| `wheat-bran` | نخالة قمح | Wheat Bran |
| `ddgs` | DDGS مخلفات تقطير الذرة | DDGS |
| `corn-gluten-feed` | جلوتين فيد ذرة | Corn Gluten Feed |

### منتجات ذرة أخرى — Corn Products (1)
| slug | nameAr | nameEn |
|---|---|---|
| `corn-flakes` | ذرة فليكس | Corn Flakes |

### زيوت — Oils (3)
| slug | nameAr | nameEn |
|---|---|---|
| `soybean-oil-crude` | زيت صويا خام | Crude Soybean Oil |
| `soybean-oil-degummed` | زيت صويا منزوع الصمغ | Degummed Soybean Oil |
| `soybean-oil-refined` | زيت صويا مكرر | Refined Soybean Oil |

### أعلاف مركزة — Concentrates (محتاج رأيك ⚠️)
ده الجزء اللي مش متأكد منه — لازم تأكد:

**هل 23% vs 24% منتج مختلف فعلاً؟**
- أيوه → نخليهم منفصلين (3 starter + 3 grower + 2 finisher = 8 سطور)
- لأ، نفس المنتج تقريبًا → نوحدهم في 3 سطور: starter / grower / finisher

**فرق "super-fattening" (تسمين) عن العام:**
- "fattening" = للأبقار/العجول
- بدون "fattening" = ممكن دواجن أو عام

**اقتراحي المبدئي:** 4 سطور (لو الكل تسمين):
| slug | nameAr | nameEn |
|---|---|---|
| `fattening-starter-23` | بادئ تسمين 23% | Fattening Starter 23% |
| `fattening-starter-24` | بادئ تسمين 24% | Fattening Starter 24% |
| `fattening-grower-21` | نامي تسمين 21% | Fattening Grower 21% |
| `fattening-finisher-19` | ناهي تسمين 19% | Fattening Finisher 19% |

---

## 3) Merge Map — اللي يتشال يروح فين

| سيتشال (slug) | يتدمج في | ملاحظة |
|---|---|---|
| `argentine-corn` | `yellow-corn` | origin=AR |
| `brazilian-corn` | `yellow-corn` | origin=BR |
| `ukrainian-corn` | `yellow-corn` | origin=UA |
| `argentine-corn-flakes` | `corn-flakes` | origin=AR |
| `soybean-meal-44-local` | `soybean-meal-44` | origin=local |
| `soybean-meal-46-local` | `soybean-meal-46` | origin=local |
| `local-bran` | `wheat-bran` | origin=local |
| `local-gluten` | `corn-gluten-feed` | origin=local |
| `glutofeed` | `corn-gluten-feed` | duplicate slug |
| `crude-soybean-oil` | `soybean-oil-crude` | rename slug |
| `degummed-soybean-oil` | `soybean-oil-degummed` | rename slug |
| `refined-soybean-oil` | `soybean-oil-refined` | rename slug |
| `super-starter-24` | `fattening-starter-24` | rename + dedupe |
| `super-fattening-starter-24` | `fattening-starter-24` | rename + dedupe |
| `super-starter-feed-23` | `fattening-starter-23` | rename |
| `super-fattening-starter-23` | `fattening-starter-23` | rename |
| `super-fattening-growing-21` | `fattening-grower-21` | growing→grower |
| `super-growing-feed-21` | `fattening-grower-21` | rename |
| `super-grower-feed-21` | `fattening-grower-21` | rename |
| `super-starter-growing-21` | `fattening-grower-21` | rename |
| `super-starter-grower-21` | `fattening-grower-21` | rename |
| `super-fattening-grower-21` | `fattening-grower-21` | rename |
| `starter-growing-feed-21-5` | `fattening-grower-21` | 21.5≈21 — ⚠️ تأكد |
| `starter-grower-feed-21-5` | `fattening-grower-21` | 21.5≈21 — ⚠️ تأكد |
| `super-finishing-feed-19` | `fattening-finisher-19` | finishing→finisher |
| `super-fattening-finishing-19` | `fattening-finisher-19` | rename |
| `super-finisher-feed-19` | `fattening-finisher-19` | rename |
| `super-fattening-finisher-19` | `fattening-finisher-19` | rename |

---

## 4) Schema change

إضافة `origin` field على Price model:

```prisma
model Price {
  ...
  origin  String?   // "AR" | "BR" | "UA" | "local" | null=mixed/unspecified
  ...
  @@unique([commodityId, sourceId, date, origin])
}
```

السبب: `yellow-corn @ Alex @ 2026-05-01 @ AR` و `yellow-corn @ Alex @ 2026-05-01 @ BR` لازم يتفصلوا.

---

## 5) Migration steps (لما نتفق)

1. Schema migration: إضافة `Price.origin` (default null)
2. Data migration script:
   - لكل صف Price متعلق بـ commodity مرشح للـ merge:
     - update commodityId → target canonical commodity
     - set origin = حسب الـ map
   - حل تعارض unique constraint: لو فيه duplicates، نختار الأحدث updatedAt
3. Delete الـ commodities الفاضية بعد الـ merge
4. Update الـ scrapers:
   - `apps/bot/src/lib/baraka-scraper.ts`
   - `apps/bot/src/lib/esraatrade-scraper.ts`
   - `apps/bot/src/lib/mazra3ty-scraper.ts`
   - `apps/bot/src/lib/elmorshd-scraper.ts`
   - `apps/bot/src/lib/vision.ts`
   - يستخدموا canonical slug + origin (مش يولّدوا slug جديد لكل اسم)
5. Update fuzzy matcher في الـ bot (`apps/bot/src/lib/fuzzy.ts`)
6. تحديث seed.ts بالـ canonical list
7. اختبار محلي → deploy

---

## 6) أسئلة محتاجة قرارك قبل ما أبدأ

1. **23% vs 24%**: نفصلهم ولا ندمجهم؟
2. **"super-" prefix**: أحذفه ولا أخلّيه؟ (شخصياً أحذفه — مش مضيف معلومة)
3. **21% vs 21.5%**: نفس السؤال — اعتبرهم نفس المنتج؟
4. **fattening (تسمين) كافي؟** ولا فيه أعلاف دواجن لازم تتفصل؟
5. **lock script**: تحب أعمل سكريبت `pnpm db:check-canonical` يفشل لو فيه commodity جديد بره القائمة؟ يمنع تكرار المشكلة.
