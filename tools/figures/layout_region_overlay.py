"""Render the layout model's detected regions over the real archive scan.

Genuine output: the polygons come from the model's own coordinate JSON in
'Layout Feature Extraction with LLMs/Examples', drawn over the matching
NL-HaNA page scan. Nothing here is illustrative.
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

SRC = Path("/run/media/gavinl/T7/Python_Projects/Layout Feature Extraction with LLMs/Examples")
OUT = Path(sys.argv[1])

# Categorical, distinguishable, and legible over aged paper.
COLORS = {
    "paragraph":   (58, 130, 200),
    "marginalia":  (222, 120, 60),
    "header":      (120, 90, 190),
    "page-number": (200, 170, 50),
    "catch-word":  (60, 160, 120),
    "signature-mark": (200, 70, 70),
}
DEFAULT = (130, 130, 130)

def render(stem, scale=2400):
    scan = SRC / "Page Scans" / f"{stem}.jpg"
    coords = SRC / "Coordinate JSON" / f"{stem}.json"
    img = Image.open(scan).convert("RGB")
    regions = json.load(open(coords))

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    line_w = max(4, img.width // 400)
    for r in regions:
        poly = [tuple(p) for p in r.get("simplified_polygon", [])]
        if len(poly) < 3:
            continue
        c = COLORS.get(r.get("type"), DEFAULT)
        d.polygon(poly, fill=c + (58,), outline=c + (235,), width=line_w)

    out = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    w = scale
    out = out.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
    dest = OUT / f"{stem}-regions.jpg"
    out.save(dest, quality=88)

    plain = Image.open(scan).convert("RGB")
    plain = plain.resize((w, round(plain.height * w / plain.width)), Image.LANCZOS)
    plain.save(OUT / f"{stem}-scan.jpg", quality=88)

    counts = {}
    for r in regions:
        counts[r.get("type")] = counts.get(r.get("type"), 0) + 1
    print(stem, dict(sorted(counts.items())))

OUT.mkdir(parents=True, exist_ok=True)
for s in ["NL-HaNA_1.04.02_7923_0025", "NL-HaNA_1.04.02_7923_0036", "NL-HaNA_1.04.02_7923_0050"]:
    render(s)
