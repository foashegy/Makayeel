"""Makayeel launch posts V2 — Nano Banana background + PIL Arabic overlay.

Pipeline:
  1) Generate 4 text-free backgrounds via Gemini 2.5 Flash Image
  2) Overlay correct Arabic text with arabic_reshaper + python-bidi + PIL

Output: D:/Projects/Makayeel/preview/launch-posts-v2/
"""

from __future__ import annotations

import asyncio
import base64
import io
import sys
from pathlib import Path

import httpx
import arabic_reshaper
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ENV_PATH = Path("D:/Projects/Other/marketing-agents/.env")
SCRIPTS = Path("D:/Projects/Makayeel/scripts")
OUT_DIR = Path("D:/Projects/Makayeel/preview/launch-posts-v2")
BG_DIR = OUT_DIR / "_bg"

FONT_BLACK = Path("C:/Windows/Fonts/segoeuib.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/segoeuib.ttf")
FONT_REG = Path("C:/Windows/Fonts/segoeui.ttf")

MODELS = ["gemini-2.5-flash-image", "nano-banana-pro-preview", "gemini-3-pro-image-preview"]

NAVY = (26, 46, 64)
GOLD = (212, 162, 76)
CREAM = (245, 239, 224)
GREEN = (107, 163, 104)
CHARCOAL = (42, 42, 42)
PAPER = (250, 250, 245)


def load_key() -> str:
    for raw in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line.startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("GEMINI_API_KEY not found")


def ar(text: str) -> str:
    """Reshape + BiDi for correct Arabic rendering in PIL."""
    return get_display(arabic_reshaper.reshape(text))


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


# ---------- BACKGROUND PROMPTS (NO TEXT) ----------

BG_PROMPTS = {
    "01_premium_dark": """Square 1080x1080 abstract decorative background ONLY. Solid dark blue-navy color throughout (NOT a color label, NOT a swatch, NOT a hex code displayed).
Add a very subtle pattern of golden wheat stalks at 10% opacity scattered diagonally across the canvas as decorative texture.
Add a soft warm gold radial glow in the center (very subtle, 15% opacity).

CRITICAL — NEGATIVE PROMPT:
- DO NOT include ANY text whatsoever
- DO NOT include any letters, words, numbers, characters, glyphs
- DO NOT include any hex codes (no "#" symbol, no "1A2E40", no color labels)
- DO NOT include any logos, watermarks, signatures, or branding
- DO NOT include any UI elements, buttons, or labels
- The image must be PURELY a wallpaper / background texture with zero typography""",

    "02_data_dashboard": """Square 1080x1080 background image with cream color #F5EFE0 as the main canvas.
Top 25%: solid deep navy #1A2E40 banner strip across the full width.
Middle 60%: cream background with NOTHING on it — must be completely empty for table overlay.
Bottom 15%: solid gold #D4A24C horizontal strip across the full width.
NO TEXT, NO LETTERS, NO WORDS, NO NUMBERS, NO TABLES, NO ICONS anywhere.
Just the three colored zones: navy strip top, empty cream middle, gold strip bottom.
Clean flat geometry only.""",

    "03_field_hero": """Square 1080x1080 photorealistic image of a golden Egyptian wheat field at sunset/golden hour.
Rich golden wheat stalks in foreground, soft warm light. NO PEOPLE, NO ANIMALS, NO BUILDINGS, NO STRUCTURES.
Strong dark gradient overlay from bottom (deep navy #1A2E40 at 90% opacity covering bottom 35% of image) fading to transparent at top 50%.
NO TEXT, NO LETTERS, NO WORDS, NO NUMBERS, NO LOGOS anywhere in the image.
Pure photographic background with gradient overlay only.
Premium agricultural photography aesthetic.""",

    "04_minimal_modern": """Square 1080x1080 ultra-minimalist background. Solid flat deep navy color #1A2E40 throughout the entire canvas.
Completely flat, completely uniform, no patterns, no textures, no gradients, no images.
NO TEXT, NO LETTERS, NO WORDS, NO NUMBERS, NO ICONS, NO LOGOS, NO DECORATIONS.
Just pure solid deep navy color filling the whole 1080x1080 square.""",
}

# ---------- BACKGROUND GENERATION ----------

async def gen_bg(client: httpx.AsyncClient, key: str, name: str, prompt: str) -> str | None:
    BG_DIR.mkdir(parents=True, exist_ok=True)
    out = BG_DIR / f"{name}.png"
    if out.exists():
        print(f"[bg/{name}] cached -> {out}")
        return str(out)
    for model in MODELS:
        try:
            r = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
                json={
                    "contents": [{"parts": [{"text": f"Generate a square 1:1 image. {prompt}"}]}],
                    "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
                },
                headers={"Content-Type": "application/json"},
                timeout=120,
            )
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            print(f"[bg/{name}] {model} failed: {e}")
            continue

        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        for part in parts:
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                out.write_bytes(base64.b64decode(inline["data"]))
                print(f"[bg/{name}] OK via {model} -> {out}")
                return str(out)
        print(f"[bg/{name}] {model} returned no image")
    return None


def fallback_bg(name: str) -> str:
    """If Nano Banana fails, build a simple flat background in PIL."""
    BG_DIR.mkdir(parents=True, exist_ok=True)
    out = BG_DIR / f"{name}.png"
    img = Image.new("RGB", (1080, 1080), NAVY)
    if name == "02_data_dashboard":
        d = ImageDraw.Draw(img)
        img.paste(CREAM, (0, 270, 1080, 920))
        d.rectangle([0, 920, 1080, 1080], fill=GOLD)
        d.rectangle([0, 0, 1080, 270], fill=NAVY)
    elif name == "04_minimal_modern":
        pass  # already flat navy
    else:
        pass
    img.save(out)
    print(f"[bg/{name}] FALLBACK flat -> {out}")
    return str(out)


# ---------- OVERLAY HELPERS ----------

def draw_text_centered(d: ImageDraw.ImageDraw, text: str, y: int, f: ImageFont.FreeTypeFont, color, canvas_w=1080):
    bbox = d.textbbox((0, 0), text, font=f)
    w = bbox[2] - bbox[0]
    d.text(((canvas_w - w) // 2 - bbox[0], y), text, font=f, fill=color)


def draw_text_right(d: ImageDraw.ImageDraw, text: str, x_right: int, y: int, f: ImageFont.FreeTypeFont, color):
    bbox = d.textbbox((0, 0), text, font=f)
    w = bbox[2] - bbox[0]
    d.text((x_right - w - bbox[0], y), text, font=f, fill=color)


def rounded_rect(d: ImageDraw.ImageDraw, xy, radius: int, fill):
    d.rounded_rectangle(xy, radius=radius, fill=fill)


def pill(d: ImageDraw.ImageDraw, x: int, y: int, text: str, f: ImageFont.FreeTypeFont, fill, text_color, padding=(28, 14)):
    bbox = d.textbbox((0, 0), text, font=f)
    w = bbox[2] - bbox[0] + padding[0] * 2
    h = bbox[3] - bbox[1] + padding[1] * 2
    rounded_rect(d, [x, y, x + w, y + h], radius=h // 2, fill=fill)
    d.text((x + padding[0] - bbox[0], y + padding[1] - bbox[1]), text, font=f, fill=text_color)
    return w, h


# ---------- COMPOSITORS (one per concept) ----------

def compose_premium_dark(bg_path: str, out: Path) -> None:
    img = Image.open(bg_path).convert("RGB").resize((1080, 1080))
    d = ImageDraw.Draw(img)

    # Top-right "متاح الآن" pill
    pill_text = ar("متاح الآن")
    pw, ph = pill(d, 0, 0, pill_text, font(FONT_BOLD, 26), GREEN, CREAM)
    pill(d, 1080 - pw - 40, 40, pill_text, font(FONT_BOLD, 26), GREEN, CREAM)

    # Brand wordmark
    draw_text_centered(d, ar("مكاييل"), 150, font(FONT_BLACK, 140), CREAM)

    # Tagline
    draw_text_centered(d, ar("سعر يومك من الحقل"), 320, font(FONT_BOLD, 36), GOLD)

    # Divider
    d.rectangle([440, 395, 640, 399], fill=GOLD)

    # Hero
    draw_text_centered(d, ar("أسعار الخامات والعلف"), 430, font(FONT_BOLD, 54), CREAM)
    draw_text_centered(d, ar("لحظة بلحظة"), 500, font(FONT_BOLD, 54), CREAM)

    # Bullets (right-aligned)
    bullets = [
        "ذرة صفرا وبيضا",
        "صويا 46 و 48",
        "ردة قمح وشعير",
        "تحديث يومي 7 صباحاً",
    ]
    f_bullet = font(FONT_REG, 32)
    f_check = font(FONT_BOLD, 32)
    y = 620
    for b in bullets:
        # checkmark on the right (RTL: list marker is on the right)
        draw_text_right(d, ar(b), 920, y, f_bullet, CREAM)
        d.text((940, y), "✓", font=f_check, fill=GOLD)
        y += 55

    # Bottom CTA bar
    d.rectangle([0, 920, 1080, 1020], fill=GOLD)
    draw_text_centered(d, "makayeel.com", 942, font(FONT_BLACK, 56), CHARCOAL)

    # Phone line
    draw_text_centered(d, ar("واتساب 01555001688  •  اتصال 01222203810"), 1035, font(FONT_BOLD, 22), CREAM)

    img.save(out)
    print(f"[compose] {out}")


def compose_data_dashboard(bg_path: str, out: Path) -> None:
    """V3 — applied creative-director feedback:
    - Removed hardcoded day from header (just 'أسعار اليوم')
    - Added 'أسعار توضيحية' watermark inside card
    - Added value-prop strip under banner (10 خامات • 4 موانئ • تحديث 7ص)
    - Added urgency/free badge top-right of card
    - WhatsApp now hero CTA (large, navy pill), website secondary
    - Softened bottom strip — full navy instead of gold-on-cream clash
    """
    img = Image.new("RGB", (1080, 1080), CREAM)
    d = ImageDraw.Draw(img)

    # Navy banner top — slightly shorter to make room for value strip
    d.rectangle([0, 0, 1080, 200], fill=NAVY)

    # Brand wordmark right side of banner
    draw_text_right(d, ar("مكاييل"), 1030, 35, font(FONT_BLACK, 80), CREAM)
    draw_text_right(d, ar("سعر يومك من الحقل"), 1030, 138, font(FONT_BOLD, 26), GOLD)

    # "متاح الآن" pill left side of banner
    pill(d, 50, 80, ar("متاح الآن"), font(FONT_BOLD, 24), GREEN, CREAM)

    # ---- VALUE PROP STRIP (gold) ----
    d.rectangle([0, 200, 1080, 270], fill=GOLD)
    f_strip = font(FONT_BOLD, 26)
    # Right to left: 10 خامات • 4 موانئ • تحديث 7ص
    strip_text = ar("10 خامات  •  4 موانئ  •  تحديث يومي 7ص")
    draw_text_centered(d, strip_text, 217, f_strip, CHARCOAL)

    # ---- CARD ----
    card_x1, card_y1, card_x2, card_y2 = 60, 305, 1020, 870
    d.rounded_rectangle([card_x1, card_y1, card_x2, card_y2], radius=24, fill=PAPER, outline=(220, 215, 200), width=2)

    # Top-right urgency badge inside card (red free-week)
    pill(d, card_x1 + 30, card_y1 + 25, ar("مجاناً للأسبوع الأول"), font(FONT_BOLD, 24), (196, 69, 69), CREAM, padding=(20, 11))

    # Header — generic, no hardcoded day
    draw_text_right(d, ar("أسعار اليوم"), card_x2 - 40, card_y1 + 30, font(FONT_BOLD, 30), CHARCOAL)
    draw_text_right(d, ar("جنيه / طن"), card_x2 - 40, card_y1 + 75, font(FONT_REG, 22), (140, 130, 110))

    # Divider
    d.line([(card_x1 + 40, card_y1 + 130), (card_x2 - 40, card_y1 + 130)], fill=(220, 215, 200), width=2)

    # Rows
    rows = [
        ("ذرة صفرا", "18,500", "↑", GREEN),
        ("صويا 46", "31,200", "↓", (196, 69, 69)),
        ("ردة قمح", "12,800", "↑", GREEN),
        ("شعير",    "16,400", "↑", GREEN),
    ]
    f_label = font(FONT_BOLD, 34)
    f_price = font(FONT_BLACK, 42)
    f_arrow = font(FONT_BOLD, 36)
    row_y = card_y1 + 165
    for label, price, arrow, arrow_color in rows:
        draw_text_right(d, ar(label), card_x2 - 40, row_y, f_label, CHARCOAL)
        d.text((card_x1 + 90, row_y - 4), price, font=f_price, fill=NAVY)
        d.text((card_x1 + 50, row_y - 2), arrow, font=f_arrow, fill=arrow_color)
        d.line([(card_x1 + 40, row_y + 65), (card_x2 - 40, row_y + 65)], fill=(235, 230, 215), width=1)
        row_y += 95

    # "أسعار توضيحية" watermark — diagonal subtle inside card
    wm_text = ar("أسعار توضيحية")
    f_wm = font(FONT_BOLD, 20)
    draw_text_right(d, wm_text, card_x2 - 40, card_y2 - 35, f_wm, (180, 170, 150))

    # ---- BOTTOM CTA STRIP (full navy) ----
    d.rectangle([0, 880, 1080, 1080], fill=NAVY)

    # WhatsApp = HERO CTA (green pill, large)
    wa_text = ar("واتساب  01555001688")
    f_wa = font(FONT_BLACK, 38)
    bbox = d.textbbox((0, 0), wa_text, font=f_wa)
    wa_w = bbox[2] - bbox[0] + 80
    wa_h = bbox[3] - bbox[1] + 40
    wa_x = (1080 - wa_w) // 2
    wa_y = 905
    d.rounded_rectangle([wa_x, wa_y, wa_x + wa_w, wa_y + wa_h], radius=wa_h // 2, fill=GREEN)
    d.text((wa_x + 40 - bbox[0], wa_y + 20 - bbox[1]), wa_text, font=f_wa, fill=CREAM)

    # Website = secondary
    draw_text_centered(d, "makayeel.com", 1015, font(FONT_BOLD, 36), GOLD)

    img.save(out)
    print(f"[compose] {out}")


def compose_field_hero(bg_path: str, out: Path) -> None:
    img = Image.open(bg_path).convert("RGB").resize((1080, 1080))

    # Light top dim for badge + softer bottom fade so wheat field stays visible behind text
    overlay = Image.new("RGBA", (1080, 1080), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    # Top: light dim
    for i in range(160):
        alpha = int(110 * (1 - i / 160))
        od.rectangle([0, i, 1080, i + 1], fill=(*NAVY, alpha))
    # Bottom: solid CTA strip only in last 200px, soft fade above for 200px
    for i in range(200):
        alpha = int(255 * (i / 200))
        od.rectangle([0, 880 - 200 + i, 1080, 880 - 200 + i + 1], fill=(*NAVY, alpha))
    od.rectangle([0, 880, 1080, 1080], fill=(*NAVY, 255))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    d = ImageDraw.Draw(img)

    # Top-right pill
    pill(d, 1080 - 220, 50, ar("متاح الآن"), font(FONT_BOLD, 28), GREEN, CREAM)

    # Brand wordmark over the field — with shadow for legibility
    wordmark = ar("مكاييل")
    f_word = font(FONT_BLACK, 180)
    # shadow
    bbox = d.textbbox((0, 0), wordmark, font=f_word)
    w = bbox[2] - bbox[0]
    x = (1080 - w) // 2 - bbox[0]
    for dx, dy in [(4, 4), (-4, 4), (4, -4), (-4, -4), (0, 6)]:
        d.text((x + dx, 360 + dy), wordmark, font=f_word, fill=(0, 0, 0))
    d.text((x, 360), wordmark, font=f_word, fill=CREAM)

    # Gold tagline (with subtle shadow)
    tag = ar("سعر يومك من الحقل")
    f_tag = font(FONT_BOLD, 42)
    bbox2 = d.textbbox((0, 0), tag, font=f_tag)
    w2 = bbox2[2] - bbox2[0]
    x2 = (1080 - w2) // 2 - bbox2[0]
    d.text((x2 + 2, 582), tag, font=f_tag, fill=(0, 0, 0))
    d.text((x2, 580), tag, font=f_tag, fill=GOLD)

    # Bottom CTA on solid navy strip
    draw_text_centered(d, "makayeel.com", 910, font(FONT_BLACK, 64), CREAM)
    draw_text_centered(d, ar("واتساب 01555001688  •  اتصال 01222203810"), 1000, font(FONT_BOLD, 24), GOLD)

    img.save(out)
    print(f"[compose] {out}")


def draw_text_centered_in_rect(d, text, x1, y1, x2, y2, f, color):
    bbox = d.textbbox((0, 0), text, font=f)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    cx = (x1 + x2) // 2
    cy = (y1 + y2) // 2
    d.text((cx - w // 2 - bbox[0], cy - h // 2 - bbox[1]), text, font=f, fill=color)


def compose_minimal_modern(bg_path: str, out: Path) -> None:
    img = Image.new("RGB", (1080, 1080), NAVY)
    d = ImageDraw.Draw(img)

    # Single gold wheat icon at top center (use unicode wheat emoji rendered as gold via shape)
    # Draw a simple stylized wheat stalk with lines
    cx = 540
    icon_y = 180
    # stem
    d.line([(cx, icon_y - 30), (cx, icon_y + 60)], fill=GOLD, width=4)
    # grains (pairs)
    for i, dy in enumerate([0, 18, 36, 54]):
        d.ellipse([cx - 22, icon_y - 30 + dy, cx - 6, icon_y - 10 + dy], fill=GOLD)
        d.ellipse([cx + 6, icon_y - 30 + dy, cx + 22, icon_y - 10 + dy], fill=GOLD)

    # Brand wordmark — large
    draw_text_centered(d, ar("مكاييل"), 290, font(FONT_BLACK, 180), CREAM)

    # Gold horizontal divider
    d.rectangle([480, 510, 600, 514], fill=GOLD)

    # Tagline gold
    draw_text_centered(d, ar("سعر يومك من الحقل"), 540, font(FONT_BOLD, 36), GOLD)

    # Subtitle two lines
    draw_text_centered(d, ar("أسعار الخامات والعلف"), 670, font(FONT_BOLD, 44), CREAM)
    draw_text_centered(d, ar("لحظة بلحظة"), 740, font(FONT_BOLD, 44), CREAM)

    # Bottom domain
    draw_text_centered(d, "makayeel.com", 940, font(FONT_BLACK, 48), CREAM)
    draw_text_centered(d, ar("واتساب 01555001688  •  اتصال 01222203810"), 1010, font(FONT_REG, 22), (180, 175, 160))

    img.save(out)
    print(f"[compose] {out}")


COMPOSERS = {
    "01_premium_dark": compose_premium_dark,
    "02_data_dashboard": compose_data_dashboard,
    "03_field_hero": compose_field_hero,
    "04_minimal_modern": compose_minimal_modern,
}


# ---------- MAIN ----------

async def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    BG_DIR.mkdir(parents=True, exist_ok=True)

    # Concepts that need a real generated background
    bg_concepts = ["01_premium_dark", "03_field_hero"]

    print("Step 1: generating backgrounds via Nano Banana...")
    key = load_key()
    bgs: dict[str, str] = {}
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(
            *[gen_bg(client, key, n, BG_PROMPTS[n]) for n in bg_concepts],
            return_exceptions=True,
        )
    for n, r in zip(bg_concepts, results):
        if isinstance(r, Exception) or not r:
            print(f"[bg/{n}] failed -> using fallback")
            bgs[n] = fallback_bg(n)
        else:
            bgs[n] = r

    bgs["02_data_dashboard"] = ""  # built in PIL directly
    bgs["04_minimal_modern"] = ""  # flat solid, built in PIL directly

    print("\nStep 2: compositing Arabic text overlays...")
    for name, composer in COMPOSERS.items():
        out = OUT_DIR / f"{name}.png"
        composer(bgs[name], out)

    print("\n=== DONE ===")
    for name in COMPOSERS:
        print(f"  {OUT_DIR / (name + '.png')}")


if __name__ == "__main__":
    asyncio.run(main())
