"""
Sync brand/v2 assets into apps/web/public/ at the right sizes,
and emit a Telegram-ready 640x640 mark for BotFather.

Inputs (from D:/Projects/Makayeel/brand/v2):
  - makayeel-mark-onwhite-1024.png
  - makayeel-lockup-horizontal-onnavy.png

Outputs (web):
  - apps/web/public/icon-16.png        (16x16)
  - apps/web/public/icon-32.png        (32x32)
  - apps/web/public/icon-192.png       (192x192)
  - apps/web/public/icon-512.png       (512x512)
  - apps/web/public/apple-icon.png     (180x180)
  - apps/web/public/opengraph-image.png (1200x630, navy bg with lockup centered)

Outputs (bot):
  - brand/v2/makayeel-bot-profile-640.png (640x640, white bg, mark centered — upload via @BotFather /setuserpic)
"""

from pathlib import Path
from PIL import Image

ROOT = Path("D:/Projects/Makayeel")
BRAND = ROOT / "brand" / "v2"
WEB_PUBLIC = ROOT / "apps" / "web" / "public"

MARK = BRAND / "makayeel-mark-onwhite-1024.png"
LOCKUP_NAVY = BRAND / "makayeel-lockup-horizontal-onnavy.png"

NAVY = (26, 46, 64)  # #1A2E40

assert MARK.exists(), f"missing {MARK}"
assert LOCKUP_NAVY.exists(), f"missing {LOCKUP_NAVY}"
assert WEB_PUBLIC.exists(), f"missing {WEB_PUBLIC}"


def resize_square(src: Image.Image, size: int) -> Image.Image:
    return src.resize((size, size), Image.LANCZOS)


def make_icons():
    mark = Image.open(MARK).convert("RGBA")

    sizes = {
        "icon-16.png": 16,
        "icon-32.png": 32,
        "icon-192.png": 192,
        "icon-512.png": 512,
        "apple-icon.png": 180,
    }
    for name, size in sizes.items():
        out = WEB_PUBLIC / name
        resized = resize_square(mark, size)
        resized.save(out, "PNG", optimize=True)
        print(f"  {name:24s} -> {size}x{size}  ({out.stat().st_size // 1024} KB)")


def make_og_image():
    """
    Build a 1200x630 OG image with the navy lockup centered.
    The lockup PNG is 2400x800; we scale to fit width with padding then center on navy bg.
    """
    lockup = Image.open(LOCKUP_NAVY).convert("RGBA")
    canvas = Image.new("RGB", (1200, 630), NAVY)

    target_w = 1080  # 60px padding each side
    scale = target_w / lockup.width
    new_h = int(lockup.height * scale)
    if new_h > 540:  # cap height with vertical padding
        scale = 540 / lockup.height
        target_w = int(lockup.width * scale)
        new_h = 540
    resized = lockup.resize((target_w, new_h), Image.LANCZOS)

    x = (1200 - target_w) // 2
    y = (630 - new_h) // 2
    canvas.paste(resized, (x, y), resized)

    out = WEB_PUBLIC / "opengraph-image.png"
    canvas.save(out, "PNG", optimize=True)
    print(f"  opengraph-image.png      -> 1200x630 ({out.stat().st_size // 1024} KB)")


def make_bot_profile():
    """640x640 square, white bg, mark centered with padding — suitable for @BotFather /setuserpic."""
    mark = Image.open(MARK).convert("RGBA")
    canvas = Image.new("RGB", (640, 640), (255, 255, 255))

    target = 560  # 40px padding each side
    scale = target / max(mark.width, mark.height)
    new_w = int(mark.width * scale)
    new_h = int(mark.height * scale)
    resized = mark.resize((new_w, new_h), Image.LANCZOS)

    x = (640 - new_w) // 2
    y = (640 - new_h) // 2
    canvas.paste(resized, (x, y), resized)

    out = BRAND / "makayeel-bot-profile-640.png"
    canvas.save(out, "PNG", optimize=True)
    print(f"  makayeel-bot-profile-640.png -> 640x640 ({out.stat().st_size // 1024} KB)")


print("== Generating web icons ==")
make_icons()
print("\n== Generating OG image ==")
make_og_image()
print("\n== Generating bot profile photo ==")
make_bot_profile()
print("\nDone.")
