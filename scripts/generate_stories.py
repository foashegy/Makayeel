"""Makayeel launch — Stories format (1080x1920) for the 3 finalist concepts.

Concepts ported: 02_data_dashboard, 03_field_hero, 04_minimal_modern.
Same Nano Banana + PIL Arabic overlay pipeline, vertical layout.

Output: D:/Projects/Makayeel/preview/launch-posts-v2/stories/
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
OUT_DIR = Path("D:/Projects/Makayeel/preview/launch-posts-v2/stories")
BG_DIR = OUT_DIR / "_bg"
W, H = 1080, 1920

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
    return get_display(arabic_reshaper.reshape(text))


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def draw_text_centered(d, text, y, f, color, canvas_w=W):
    bbox = d.textbbox((0, 0), text, font=f)
    w = bbox[2] - bbox[0]
    d.text(((canvas_w - w) // 2 - bbox[0], y), text, font=f, fill=color)


def draw_text_right(d, text, x_right, y, f, color):
    bbox = d.textbbox((0, 0), text, font=f)
    w = bbox[2] - bbox[0]
    d.text((x_right - w - bbox[0], y), text, font=f, fill=color)


def pill(d, x, y, text, f, fill, text_color, padding=(28, 14)):
    bbox = d.textbbox((0, 0), text, font=f)
    w = bbox[2] - bbox[0] + padding[0] * 2
    h = bbox[3] - bbox[1] + padding[1] * 2
    d.rounded_rectangle([x, y, x + w, y + h], radius=h // 2, fill=fill)
    d.text((x + padding[0] - bbox[0], y + padding[1] - bbox[1]), text, font=f, fill=text_color)
    return w, h


# ---------- BACKGROUND PROMPTS (NO TEXT, vertical 9:16) ----------

BG_PROMPTS = {
    "03_field_hero_story": """Vertical 1080x1920 photorealistic image of a golden Egyptian wheat field at sunset/golden hour.
Rich golden wheat stalks filling the frame, soft warm light. NO PEOPLE, NO ANIMALS, NO BUILDINGS.
NO TEXT, NO LETTERS, NO WORDS, NO NUMBERS, NO LOGOS — pure photographic background only.
Premium agricultural photography aesthetic. 9:16 vertical aspect ratio for mobile.""",
}


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
                    "contents": [{"parts": [{"text": f"Generate a vertical 9:16 image. {prompt}"}]}],
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


# ---------- COMPOSITORS ----------

def compose_dashboard_story(out: Path) -> None:
    """V3 — same creative-director feedback as 1:1 version, scaled for Stories."""
    img = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(img)

    # Top navy banner (taller for stories)
    d.rectangle([0, 0, W, 420], fill=NAVY)

    # "متاح الآن" pill at top-left
    pill(d, 60, 90, ar("متاح الآن"), font(FONT_BOLD, 32), GREEN, CREAM)

    # Brand wordmark centered in banner
    draw_text_centered(d, ar("مكاييل"), 170, font(FONT_BLACK, 150), CREAM)
    draw_text_centered(d, ar("سعر يومك من الحقل"), 350, font(FONT_BOLD, 36), GOLD)

    # ---- VALUE PROP STRIP (gold) ----
    d.rectangle([0, 420, W, 510], fill=GOLD)
    draw_text_centered(d, ar("10 خامات  •  4 موانئ  •  تحديث يومي 7ص"), 446, font(FONT_BOLD, 32), CHARCOAL)

    # ---- CARD ----
    cx1, cy1, cx2, cy2 = 60, 560, 1020, 1640
    d.rounded_rectangle([cx1, cy1, cx2, cy2], radius=28, fill=PAPER, outline=(220, 215, 200), width=2)

    # Free-week urgency badge top-left of card
    pill(d, cx1 + 30, cy1 + 35, ar("مجاناً للأسبوع الأول"), font(FONT_BOLD, 28), (196, 69, 69), CREAM, padding=(22, 12))

    # Header — generic, no day
    draw_text_right(d, ar("أسعار اليوم"), cx2 - 50, cy1 + 40, font(FONT_BOLD, 38), CHARCOAL)
    draw_text_right(d, ar("جنيه / طن"), cx2 - 50, cy1 + 92, font(FONT_REG, 26), (140, 130, 110))

    # Divider
    d.line([(cx1 + 50, cy1 + 170), (cx2 - 50, cy1 + 170)], fill=(220, 215, 200), width=2)

    rows = [
        ("ذرة صفرا", "18,500", "↑", GREEN),
        ("صويا 46", "31,200", "↓", (196, 69, 69)),
        ("صويا 48", "33,800", "↑", GREEN),
        ("ردة قمح", "12,800", "↑", GREEN),
        ("شعير",    "16,400", "↑", GREEN),
        ("عباد الشمس", "21,600", "↓", (196, 69, 69)),
    ]
    f_label = font(FONT_BOLD, 38)
    f_price = font(FONT_BLACK, 46)
    f_arrow = font(FONT_BOLD, 40)
    row_y = cy1 + 215
    for label, price, arrow, arrow_color in rows:
        draw_text_right(d, ar(label), cx2 - 50, row_y, f_label, CHARCOAL)
        d.text((cx1 + 100, row_y - 4), price, font=f_price, fill=NAVY)
        d.text((cx1 + 55, row_y - 2), arrow, font=f_arrow, fill=arrow_color)
        d.line([(cx1 + 50, row_y + 70), (cx2 - 50, row_y + 70)], fill=(235, 230, 215), width=1)
        row_y += 115

    # Watermark
    draw_text_right(d, ar("أسعار توضيحية"), cx2 - 50, cy2 - 45, font(FONT_BOLD, 22), (180, 170, 150))

    # ---- BOTTOM NAVY CTA STRIP ----
    d.rectangle([0, 1660, W, H], fill=NAVY)

    # WhatsApp HERO pill
    wa_text = ar("واتساب  01222203810")
    f_wa = font(FONT_BLACK, 46)
    bbox = d.textbbox((0, 0), wa_text, font=f_wa)
    wa_w = bbox[2] - bbox[0] + 100
    wa_h = bbox[3] - bbox[1] + 50
    wa_x = (W - wa_w) // 2
    wa_y = 1700
    d.rounded_rectangle([wa_x, wa_y, wa_x + wa_w, wa_y + wa_h], radius=wa_h // 2, fill=GREEN)
    d.text((wa_x + 50 - bbox[0], wa_y + 25 - bbox[1]), wa_text, font=f_wa, fill=CREAM)

    # Website secondary
    draw_text_centered(d, "makayeel.com", 1830, font(FONT_BOLD, 42), GOLD)

    # Swipe-up convention (use plain arrow, no emoji)
    draw_text_centered(d, ar("↑  افتح الموقع"), 1885, font(FONT_BOLD, 26), CREAM)

    img.save(out)
    print(f"[compose] {out}")


def compose_field_hero_story(bg_path: str, out: Path) -> None:
    img = Image.open(bg_path).convert("RGB").resize((W, H))

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    # Top dim
    for i in range(220):
        alpha = int(110 * (1 - i / 220))
        od.rectangle([0, i, W, i + 1], fill=(*NAVY, alpha))
    # Bottom: solid 350px navy strip + 250px fade above
    for i in range(250):
        alpha = int(255 * (i / 250))
        od.rectangle([0, 1570 - 250 + i, W, 1570 - 250 + i + 1], fill=(*NAVY, alpha))
    od.rectangle([0, 1570, W, H], fill=(*NAVY, 255))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    d = ImageDraw.Draw(img)

    # Top-right pill
    pill(d, W - 260, 80, ar("متاح الآن"), font(FONT_BOLD, 32), GREEN, CREAM)

    # Brand wordmark with shadow over the field, vertically centered around y=720
    wordmark = ar("مكاييل")
    f_word = font(FONT_BLACK, 220)
    bbox = d.textbbox((0, 0), wordmark, font=f_word)
    w = bbox[2] - bbox[0]
    x = (W - w) // 2 - bbox[0]
    for dx, dy in [(5, 5), (-5, 5), (5, -5), (-5, -5), (0, 8)]:
        d.text((x + dx, 700 + dy), wordmark, font=f_word, fill=(0, 0, 0))
    d.text((x, 700), wordmark, font=f_word, fill=CREAM)

    # Tagline
    tag = ar("سعر يومك من الحقل")
    f_tag = font(FONT_BOLD, 52)
    bbox2 = d.textbbox((0, 0), tag, font=f_tag)
    w2 = bbox2[2] - bbox2[0]
    x2 = (W - w2) // 2 - bbox2[0]
    d.text((x2 + 2, 982), tag, font=f_tag, fill=(0, 0, 0))
    d.text((x2, 980), tag, font=f_tag, fill=GOLD)

    # Bottom CTA
    draw_text_centered(d, "makayeel.com", 1640, font(FONT_BLACK, 80), CREAM)
    draw_text_centered(d, ar("واتساب  01222203810"), 1760, font(FONT_BOLD, 38), GOLD)

    # Swipe-up hint (Stories convention)
    draw_text_centered(d, ar("↑  افتح الموقع"), 1860, font(FONT_BOLD, 30), CREAM)

    img.save(out)
    print(f"[compose] {out}")


def compose_minimal_modern_story(out: Path) -> None:
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)

    # Wheat icon at top-center
    cx = W // 2
    icon_y = 380
    d.line([(cx, icon_y - 50), (cx, icon_y + 100)], fill=GOLD, width=6)
    for i, dy in enumerate([0, 26, 52, 78]):
        d.ellipse([cx - 30, icon_y - 50 + dy, cx - 8, icon_y - 22 + dy], fill=GOLD)
        d.ellipse([cx + 8, icon_y - 50 + dy, cx + 30, icon_y - 22 + dy], fill=GOLD)

    # Brand wordmark
    draw_text_centered(d, ar("مكاييل"), 660, font(FONT_BLACK, 240), CREAM)

    # Gold divider
    d.rectangle([460, 1010, 620, 1015], fill=GOLD)

    # Tagline
    draw_text_centered(d, ar("سعر يومك من الحقل"), 1050, font(FONT_BOLD, 48), GOLD)

    # Subtitle two lines
    draw_text_centered(d, ar("أسعار الخامات والعلف"), 1280, font(FONT_BOLD, 60), CREAM)
    draw_text_centered(d, ar("لحظة بلحظة"), 1370, font(FONT_BOLD, 60), CREAM)

    # Bottom domain
    draw_text_centered(d, "makayeel.com", 1700, font(FONT_BLACK, 64), CREAM)
    draw_text_centered(d, ar("واتساب  01222203810"), 1790, font(FONT_REG, 32), (180, 175, 160))

    img.save(out)
    print(f"[compose] {out}")


# ---------- MAIN ----------

async def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    BG_DIR.mkdir(parents=True, exist_ok=True)

    print("Step 1: generating wheat-field background (vertical)...")
    key = load_key()
    field_bg = None
    async with httpx.AsyncClient() as client:
        field_bg = await gen_bg(client, key, "03_field_hero_story", BG_PROMPTS["03_field_hero_story"])

    if not field_bg:
        print("[bg] field-hero failed — using solid navy fallback")
        fb = BG_DIR / "03_field_hero_story.png"
        Image.new("RGB", (W, H), NAVY).save(fb)
        field_bg = str(fb)

    print("\nStep 2: composing 3 stories...")
    compose_dashboard_story(OUT_DIR / "02_data_dashboard_story.png")
    compose_field_hero_story(field_bg, OUT_DIR / "03_field_hero_story.png")
    compose_minimal_modern_story(OUT_DIR / "04_minimal_modern_story.png")

    print("\n=== DONE ===")
    for p in OUT_DIR.glob("*_story.png"):
        print(f"  {p}")


if __name__ == "__main__":
    asyncio.run(main())
