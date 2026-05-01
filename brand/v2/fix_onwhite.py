"""
Fix-pass: regenerate makayeel-mark-onwhite-1024.png with harder emphasis on solid fills.
The first generation rendered the lower green grains as hollow outlines — this corrects that.
"""

import base64
import time
import requests
from pathlib import Path

ENV_FILE = Path("D:/Projects/Other/marketing-agents/.env")

def load_env(path):
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
ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"gemini-3-pro-image-preview:generateContent?key={GEMINI_API_KEY}"
)

OUT_DIR = Path("D:/Projects/Makayeel/brand/v2")

PROMPT = """
Brand logo mark — icon only — for MAKAYEEL, an Egyptian agricultural commodity price platform.

Canvas: 1024x1024 pixels. Solid WHITE background #FFFFFF.

The mark (centered, ~60% of canvas, 20% margin all sides):

A stylized wheat ear. All shapes are FULLY SOLID filled — no outlines, no strokes, no hollow centers, no empty shapes. Every grain must be 100% opaque solid color inside, like a flat vector.

Vertical stem: solid rectangle, Deep Navy #1A2E40, medium thickness, runs the full height of the mark.

5 grain shapes per side (left and right), mirrored symmetrically about the stem. Each grain is a solid-filled teardrop/mandorla shape (like a plump leaf or almond), angled outward at roughly 30-45 degrees from the stem, no hollow interior:
- Grains ascend in size from top (smallest, ~50px wide) to bottom (largest, ~120px wide), matching a natural wheat ear silhouette that is narrower at top and wider at base.
- Upper 3 grains per side (6 total): SOLID FILL Wheat Gold #D4A24C — completely opaque inside, NOT an outline.
- Lower 2 grains per side (4 total): SOLID FILL Harvest Green #6BA368 — completely opaque inside, NOT an outline.
- Every single grain is a fully painted solid shape, like colored paper cutouts. No see-through. No strokes without fill.

No outlines. No gradients. No drop shadows. No hollow/empty shapes. No badge. No hexagon. No border. No text. No letters.

Output: white canvas with the centered fully-solid wheat-ear mark.
"""

def call_gemini(prompt, out_path, retries=3):
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
    }
    for attempt in range(1, retries + 1):
        print(f"  Attempt {attempt}/{retries}")
        try:
            r = requests.post(ENDPOINT, json=body, timeout=120)
            r.raise_for_status()
            data = r.json()
            for cand in data.get("candidates", []):
                for part in cand.get("content", {}).get("parts", []):
                    if "inlineData" in part:
                        img_bytes = base64.b64decode(part["inlineData"]["data"])
                        out_path.write_bytes(img_bytes)
                        print(f"  Saved {out_path.name} ({len(img_bytes)//1024} KB)")
                        return True
            print("  No image returned.")
        except Exception as e:
            print(f"  Error: {e}")
        if attempt < retries:
            time.sleep(6)
    return False

out = OUT_DIR / "makayeel-mark-onwhite-1024.png"
print(f"Regenerating {out.name}...")
ok = call_gemini(PROMPT, out)
print("Done." if ok else "FAILED.")
