"""Generate 4 launch-post concepts for Makayeel.com via Gemini Nano Banana.

Reads GEMINI_API_KEY from D:/Projects/Other/marketing-agents/.env
Saves PNGs to D:/Projects/Makayeel/preview/launch-posts/
"""

from __future__ import annotations

import asyncio
import base64
import sys
import io
from pathlib import Path

import httpx

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ENV_PATH = Path("D:/Projects/Other/marketing-agents/.env")
OUT_DIR = Path("D:/Projects/Makayeel/preview/launch-posts")
MODELS = ["gemini-2.5-flash-image", "nano-banana-pro-preview", "gemini-3-pro-image-preview"]


def load_key() -> str:
    for raw in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line.startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("GEMINI_API_KEY not found")


BRAND_BLOCK = """
BRAND: Makayeel (مكاييل) — Egyptian feed-grain prices platform.
Tagline: سعر يومك من الحقل (Today's price, straight from the field)
Domain: makayeel.com
Phone: 01222203810

EXACT BRAND COLORS (do not improvise):
- Deep navy #1A2E40 (primary backgrounds)
- Wheat gold #D4A24C (accents, CTA)
- Cream #F5EFE0 (text on dark)
- Harvest green #6BA368 (positive accents)
- Charcoal #2A2A2A (text on light)

TYPOGRAPHY: Modern Arabic sans-serif (Tajawal / Cairo style). Bold, clean, high contrast. Arabic text RTL right-aligned. Latin (domain/phone) LTR.

ABSOLUTE RULES:
- NO pigs, NO swine, NO alcohol, NO crosses or religious symbols
- NO people without modest clothing
- NO stock-photo people
- Photorealistic agricultural aesthetic — premium, not cheap
- Square 1:1 ratio (Facebook/Instagram post)
- Headlines must be readable on mobile
- Domain "makayeel.com" must be clearly visible

CONTENT TO INCLUDE:
- Brand wordmark: مكاييل (large, prominent)
- Hero headline: أسعار الخامات والعلف لحظة بلحظة
- Tagline: سعر يومك من الحقل
- 4 product bullets: ذرة • صويا • ردة • شعير
- CTA: makayeel.com
- WhatsApp: 01222203810
"""


CONCEPTS = {
    "01_premium_dark": f"""{BRAND_BLOCK}

CONCEPT 1 — PREMIUM DARK (Bloomberg Terminal × grain trade):
Square 1080x1080. Deep navy #1A2E40 background with subtle wheat-stalk pattern at 5% opacity.

Top-right corner: small pill badge with harvest-green #6BA368 fill, cream text "متاح الآن" (Available now).
Top-left corner: minimalist gold wheat-stalk icon (#D4A24C), small.

CENTER (large, bold cream text #F5EFE0):
- Brand wordmark "مكاييل" in 120pt Arabic display font
- Below it gold #D4A24C tagline "سعر يومك من الحقل" 32pt
- Below tagline horizontal divider line in gold (thin, 200px wide, centered)
- Hero text two lines centered: "أسعار الخامات والعلف" then "لحظة بلحظة" 56pt cream

LOWER MIDDLE: 4 product bullets right-aligned with small gold checkmarks ✓:
✓ ذرة صفرا وبيضا
✓ صويا 46 و 48
✓ ردة قمح وشعير
✓ تحديث يومي 7 صباحاً

BOTTOM: full-width gold #D4A24C bar 120px tall containing centered charcoal #2A2A2A bold text "makayeel.com" 44pt.
Below bar small cream text centered: "📱 واتساب 01222203810"

Premium fintech feel × agricultural authority. Clean, generous whitespace. Mobile-readable.
""",

    "02_data_dashboard": f"""{BRAND_BLOCK}

CONCEPT 2 — DATA DASHBOARD MOCKUP (show the product itself):
Square 1080x1080. Cream #F5EFE0 background.

Top section (top 25%): deep navy #1A2E40 banner with brand wordmark "مكاييل" in cream 80pt on the right, gold tagline "سعر يومك من الحقل" 24pt below it. On the left of the banner: a small "متاح الآن" green pill.

CENTER (60%): a realistic mockup of a phone screen / dashboard card showing 4 commodity price rows in a clean table:
- Each row: commodity name (Arabic right) + price in EGP/طن (left, JetBrains Mono style) + small green ↑ or red ↓ indicator
- Rows: "ذرة صفرا  18,500 ↑" / "صويا 46  31,200 ↓" / "ردة قمح  12,800 ↑" / "شعير  16,400 ↑"
- Card has rounded corners, soft shadow, paper-white #FAFAF5 background, inside the cream area
- Above the card a small gold tag: "أسعار اليوم — السبت"

BOTTOM (15%): gold #D4A24C bar with charcoal text "makayeel.com  •  واتساب 01222203810"

Feel: a real SaaS product screenshot, builds trust through showing the product. Clean. Premium. Mobile-first.
""",

    "03_field_hero": f"""{BRAND_BLOCK}

CONCEPT 3 — FIELD HERO (golden wheat field photography):
Square 1080x1080. Photorealistic background: golden Egyptian wheat field at sunrise/sunset, wheat stalks in foreground, soft warm light. NO PEOPLE in the image.

Dark gradient overlay from bottom (deep navy #1A2E40 at 80% opacity) fading to transparent at top 40%.

CENTER-LEFT (RTL so text reads right-to-left starting from right):
- Large cream #F5EFE0 wordmark "مكاييل" 130pt with subtle gold glow
- Gold #D4A24C tagline below: "سعر يومك من الحقل" 36pt
- White subtitle: "أسعار الخامات والعلف لحظة بلحظة" 42pt cream

BOTTOM 25%: solid deep navy #1A2E40 strip with content:
- Right side: 4 small commodity icons in gold (corn cob, soybean, wheat husk, barley) with Arabic labels in cream
- Left side: bold gold #D4A24C button-style block with charcoal text "makayeel.com" 40pt
- Below button cream small text: "واتساب 01222203810"

Top-right small pill: harvest green "متاح الآن"

Feel: heritage × modernity. Authentic Egyptian agriculture photography meets clean digital UI overlay. Premium, trustworthy, no stock-photo cheapness.
""",

    "04_minimal_modern": f"""{BRAND_BLOCK}

CONCEPT 4 — MINIMAL MODERN (Apple keynote × Arabic typography):
Square 1080x1080. Pure deep navy #1A2E40 background, completely flat (no patterns, no images).

Use of negative space is the design — generous breathing room.

CENTER (vertically and horizontally):
- A single large gold #D4A24C wheat-stalk SVG icon at the very top center, 80px
- Below it cream #F5EFE0 wordmark "مكاييل" in massive 160pt thin-bold Arabic font
- A 2px gold horizontal line below, 120px wide, centered
- Gold #D4A24C tagline "سعر يومك من الحقل" 32pt centered below line
- Then a healthy gap (80px)
- Cream subtitle text 38pt, centered, two lines: "أسعار الخامات والعلف" then "لحظة بلحظة"

VERY BOTTOM: simple cream text centered, no bar, no decoration:
- "makayeel.com" in JetBrains-Mono-style font 36pt cream
- below it small dim cream "واتساب 01222203810" 22pt

NO bullets, NO badges, NO icons besides the single wheat icon at top.

Feel: confident, premium, Apple-like restraint. The brand is so strong it doesn't need to shout. Maximum elegance, minimum noise.
""",
}


async def gen_one(client: httpx.AsyncClient, key: str, name: str, prompt: str) -> tuple[str, str | None]:
    for model in MODELS:
        try:
            r = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
                json={
                    "contents": [{"parts": [{"text": f"Generate a square 1:1 aspect ratio Facebook/Instagram post image. {prompt}"}]}],
                    "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
                },
                headers={"Content-Type": "application/json"},
                timeout=120,
            )
            r.raise_for_status()
            data = r.json()
        except httpx.HTTPStatusError as e:
            print(f"[{name}] {model} HTTP {e.response.status_code}: {e.response.text[:200]}")
            continue
        except httpx.RequestError as e:
            print(f"[{name}] {model} request error: {e}")
            continue

        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        for part in parts:
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                OUT_DIR.mkdir(parents=True, exist_ok=True)
                path = OUT_DIR / f"{name}.png"
                path.write_bytes(base64.b64decode(inline["data"]))
                print(f"[{name}] OK via {model} -> {path}")
                return name, str(path)
        print(f"[{name}] {model} returned no image")
    return name, None


async def main() -> None:
    key = load_key()
    print(f"Generating {len(CONCEPTS)} concepts -> {OUT_DIR}")
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[gen_one(client, key, n, p) for n, p in CONCEPTS.items()])
    print("\n=== RESULTS ===")
    for name, path in results:
        print(f"  {name}: {'OK ' + path if path else 'FAILED'}")


if __name__ == "__main__":
    asyncio.run(main())
