"""Regenerate Threadnote Office desktop icons from the Threadnote book mark.

Requires Pillow. The SVG wordmark remains in the shell renderer assets.
"""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "apps" / "shell" / "build"


def icon(size: int) -> Image.Image:
    scale = 4
    width = size * scale
    image = Image.new("RGBA", (width, width), (0, 0, 0, 0))
    pixels = image.load()
    top = (180, 156, 244)
    bottom = (112, 88, 184)
    for y in range(width):
        mix = y / max(width - 1, 1)
        color = tuple(round(a * (1 - mix) + b * mix) for a, b in zip(top, bottom))
        for x in range(width):
            pixels[x, y] = (*color, 255)

    mask = Image.new("L", (width, width), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, width - 1, width - 1), radius=width // 4, fill=255)
    image.putalpha(mask)
    draw = ImageDraw.Draw(image)

    def point(x: float, y: float) -> tuple[int, int]:
        return round(x * width / 64), round(y * width / 64)

    draw.polygon([point(16, 17.5), point(24, 18), point(32, 22.7), point(32, 50.5), point(24, 46), point(16, 45.3)], fill=(255, 255, 255, 245))
    draw.polygon([point(48, 17.5), point(40, 18), point(32, 22.7), point(32, 50.5), point(40, 46), point(48, 45.3)], fill=(255, 255, 255, 209))
    for y in (26, 32):
        draw.line([point(21, y), point(27.5, y)], fill=(117, 96, 189), width=max(1, round(width * 2.5 / 64)))
        draw.line([point(36.5, y), point(43, y)], fill=(117, 96, 189), width=max(1, round(width * 2.5 / 64)))
    return image.resize((size, size), Image.Resampling.LANCZOS)


if __name__ == "__main__":
    BUILD.mkdir(parents=True, exist_ok=True)
    base = icon(1024)
    base.save(BUILD / "icon.png")
    base.save(BUILD / "icon-mac.png")
    icon_dir = BUILD / "icons"
    icon_dir.mkdir(exist_ok=True)
    for size in (16, 32, 48, 64, 128, 256, 512, 1024):
        icon(size).save(icon_dir / f"{size}x{size}.png")
    base.save(BUILD / "icon.ico", format="ICO", sizes=[(size, size) for size in (16, 24, 32, 48, 64, 128, 256)])
    base.save(BUILD / "icon.icns", format="ICNS")
