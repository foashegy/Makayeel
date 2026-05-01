"""
Makayeel Logo Generation — v2
Generates all 5 brand mark assets via Gemini 3 Pro Image Preview.
Saves to D:/Projects/Makayeel/brand/v2/

API key loaded from D:/Projects/Other/marketing-agents/.env at runtime.
"""

import os
import base64
import time
import requests
from pathlib import Path

# --- Load API key from project .env ---
ENV_FILE = Path("D:/Projects/Other/marketing-agents/.env")

def load_env(path: Path) -> dict:
    env = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env

_env = load_env(ENV_FILE)
GEMINI_API_KEY = _env.get("GEMINI_API_KEY", "").strip()
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in .env — abort.")

ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"gemini-3-pro-image-preview:generateContent?key={GEMINI_API_KEY}"
)

OUT_DIR = Path("D:/Projects/Makayeel/brand/v2")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def call_gemini(prompt: str, out_path: Path, retries: int = 3) -> bool:
    """Send a generation request and save the first image returned."""
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
    }
    for attempt in range(1, retries + 1):
        print(f"  Attempt {attempt}/{retries} -> {out_path.name}")
        try:
            r = requests.post(ENDPOINT, json=body, timeout=120)
            r.raise_for_status()
            data = r.json()
            for cand in data.get("candidates", []):
                for part in cand.get("content", {}).get("parts", []):
                    if "inlineData" in part:
                        img_bytes = base64.b64decode(part["inlineData"]["data"])
                        out_path.write_bytes(img_bytes)
                        print(f"  Saved {out_path.name} ({len(img_bytes) // 1024} KB)")
                        return True
            # Log what came back if no image found
            text_parts = []
            for cand in data.get("candidates", []):
                for part in cand.get("content", {}).get("parts", []):
                    if "text" in part:
                        text_parts.append(part["text"][:120])
            print(f"  WARNING: No image in response. Text preview: {text_parts}")
        except Exception as exc:
            print(f"  Error: {exc}")
        if attempt < retries:
            time.sleep(6)
    return False


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

PROMPT_1_ONNAVY = """
Brand logo mark — icon only — for MAKAYEEL, an Egyptian agricultural commodity price platform.

Canvas: 1024x1024 pixels. Solid background: Deep Navy #1A2E40.

The mark to render (centered, filling roughly 60% of canvas with 20% margin on all sides):
A stylized wheat ear built from bold geometric shapes:
- A clean vertical stem in Wheat Gold #D4A24C, medium thickness.
- 5 grain shapes per side (left and right), mirrored symmetrically about the stem.
- Each grain is a thick rounded teardrop or mandorla (almond lens), angled outward from the stem, wider at mid-height and tapering to a point at tip. Grains ascend in size from top (smallest) to bottom (largest), like a real wheat ear.
- Upper 3 grains each side: solid Wheat Gold #D4A24C fill.
- Lower 2 grains each side: solid Harvest Green #6BA368 fill.
- All shapes have THICK bodies — each grain is wide enough to read as a distinct oval at 40x40 pixel thumbnail size. No thin slivers, no fine lines, no barcode-like patterns.
- No outlines. No gradients. No drop shadows. Flat solid fills only.

No text. No letters. No hexagon. No shield. No badge border. No container shape. No decorative elements.

The final silhouette must be unmistakably a wheat ear when viewed at 40x40 pixels, not an abstract barcode or bar chart.

Output: the image only — navy canvas with the centered wheat-ear mark.
"""

PROMPT_2_ONWHITE = """
Brand logo mark — icon only — for MAKAYEEL, an Egyptian agricultural commodity price platform.

Canvas: 1024x1024 pixels. Solid white background #FFFFFF.

The mark to render (centered, filling roughly 60% of canvas with 20% margin on all sides):
A stylized wheat ear built from bold geometric shapes:
- A clean vertical stem in Deep Navy #1A2E40, medium thickness.
- 5 grain shapes per side (left and right), mirrored symmetrically about the stem.
- Each grain is a thick rounded teardrop or mandorla (almond lens), angled outward from the stem, wider at mid-height and tapering to a point at tip. Grains ascend in size from top (smallest) to bottom (largest), like a real wheat ear.
- Upper 3 grains each side: solid Wheat Gold #D4A24C fill.
- Lower 2 grains each side: solid Harvest Green #6BA368 fill.
- All shapes have THICK bodies — each grain is wide enough to read as a distinct oval at 40x40 pixel thumbnail size. No thin slivers, no fine lines, no barcode-like patterns.
- No outlines. No gradients. No drop shadows. Flat solid fills only.

No text. No letters. No hexagon. No shield. No badge border. No container shape. No decorative elements.

The final silhouette must be unmistakably a wheat ear when viewed at 40x40 pixels.

Output: the image only — white canvas with the centered wheat-ear mark.
"""

PROMPT_3_LOCKUP_WHITE = """
Brand logo horizontal lockup for MAKAYEEL — Egyptian agricultural price platform.

Canvas: 2400x800 pixels, solid white background #FFFFFF.

Layout (RTL Arabic reading order): mark icon on the RIGHT half, wordmark text on the LEFT half, both vertically centered together.

RIGHT HALF — wheat mark icon:
A stylized wheat ear: 5 thick rounded teardrop/mandorla grains per side of a central vertical stem, mirrored symmetrically. Lower 2 grains per side in Harvest Green #6BA368; upper 3 grains per side in Wheat Gold #D4A24C. Stem in Deep Navy #1A2E40. Flat solid fills, no gradients, no shadows. Icon height ~520px, vertically centered at roughly x=1800, y=400.

LEFT HALF — wordmark text stacked:
Line 1: Arabic text exactly "مكاييل" — bold geometric Arabic typeface (Cairo Black style), color Deep Navy #1A2E40, large (~220px cap height). Correct RTL letter-joining: the word connects as م-ك-ا-ي-ي-ل with proper Arabic shaping. Horizontally centered in the left half.
Line 2: Latin text exactly "MAKAYEEL" — geometric sans-serif, all uppercase, generous letter-spacing, color Wheat Gold #D4A24C, size ~70px. Horizontally centered below the Arabic, ~30px gap.

Divider: a thin vertical rule in Wheat Gold #D4A24C between the two halves (optional, subtle).

Must avoid: hexagon, badge border, drop shadows, any extra text, medical cross, animals, people, pigs, barcode patterns.

Output: clean horizontal lockup on white canvas, no outer border or mockup frame.
"""

PROMPT_4_LOCKUP_NAVY = """
Brand logo horizontal lockup for MAKAYEEL — Egyptian agricultural price platform.

Canvas: 2400x800 pixels, solid Deep Navy background #1A2E40.

Layout (RTL Arabic reading order): mark icon on the RIGHT half, wordmark text on the LEFT half, both vertically centered together.

RIGHT HALF — wheat mark icon:
A stylized wheat ear: 5 thick rounded teardrop/mandorla grains per side of a central vertical stem, mirrored symmetrically. Lower 2 grains per side in Harvest Green #6BA368; upper 3 grains per side in Wheat Gold #D4A24C. Stem in Wheat Gold #D4A24C. Flat solid fills, no gradients, no shadows. Icon height ~520px, vertically centered at roughly x=1800, y=400.

LEFT HALF — wordmark text stacked:
Line 1: Arabic text exactly "مكاييل" — bold geometric Arabic typeface (Cairo Black style), color Wheat Gold #D4A24C, large (~220px cap height). Correct RTL letter-joining: the word connects as م-ك-ا-ي-ي-ل with proper Arabic shaping. Horizontally centered in the left half.
Line 2: Latin text exactly "MAKAYEEL" — geometric sans-serif, all uppercase, generous letter-spacing, color white #FFFFFF, size ~70px. Horizontally centered below the Arabic, ~30px gap.

Must avoid: hexagon, badge border, drop shadows, any extra text, medical cross, animals, people, pigs, barcode patterns.

Output: clean horizontal lockup on navy canvas, no outer border or mockup frame.
"""

PROMPT_5_WATERMARK = """
Brand watermark stamp for MAKAYEEL — Egyptian agricultural price platform.
Will be used at 40% opacity in price-list post corners. Must be legible but unobtrusive.

Canvas: 600x600 pixels. White background (the output serves as a watermark PNG; render it on white).

Composition: stacked vertically, centered.
TOP: wheat mark icon — compact version, ~260x280px. Same design: 5 thick rounded teardrop/mandorla grains per side, mirrored, lower 2 per side in Harvest Green #6BA368, upper 3 per side in Wheat Gold #D4A24C, stem in Deep Navy #1A2E40. Flat solid fills.
MIDDLE: Arabic text "مكاييل" in bold geometric Arabic (Cairo Black style), Deep Navy #1A2E40, ~90px cap height, correct RTL letter-joining, centered below the mark with ~20px gap.
BOTTOM: Latin "MAKAYEEL" in geometric sans-serif UPPERCASE, Wheat Gold #D4A24C, ~32px, generous letter-spacing, centered below the Arabic with ~10px gap.

Total composition centered in the 600x600 canvas with ~40px padding all sides.

Must avoid: outer border, hexagon, badge container, drop shadows, extra text, medical cross, barcode, animals, people, pigs.

Output: clean stacked watermark stamp on white canvas, no border.
"""


# ─────────────────────────────────────────────────────────────────────────────
# GENERATE
# ─────────────────────────────────────────────────────────────────────────────

ASSETS = [
    ("makayeel-mark-onnavy-1024.png",          PROMPT_1_ONNAVY),
    ("makayeel-mark-onwhite-1024.png",         PROMPT_2_ONWHITE),
    ("makayeel-lockup-horizontal-onwhite.png", PROMPT_3_LOCKUP_WHITE),
    ("makayeel-lockup-horizontal-onnavy.png",  PROMPT_4_LOCKUP_NAVY),
    ("makayeel-watermark-transparent.png",     PROMPT_5_WATERMARK),
]

print(f"Generating {len(ASSETS)} Makayeel brand assets -> {OUT_DIR}\n")

results = []
for filename, prompt in ASSETS:
    out_path = OUT_DIR / filename
    print(f"\n{'='*60}")
    print(f"Asset: {filename}")
    print(f"{'='*60}")
    ok = call_gemini(prompt, out_path)
    results.append((filename, ok))
    time.sleep(4)   # brief pause between API calls

print("\n\n" + "="*60)
print("FINAL SUMMARY")
print("="*60)
for fname, ok in results:
    print(f"  [{'OK  ' if ok else 'FAIL'}] {fname}")

failed = [f for f, ok in results if not ok]
if failed:
    print(f"\n{len(failed)} asset(s) failed — check prompts / API quota and re-run.")
else:
    print(f"\nAll {len(ASSETS)} assets generated successfully.")
print(f"Output: {OUT_DIR}")
