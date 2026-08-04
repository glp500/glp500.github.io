"""Draw the table structure the extraction tool produces.

Column names are read from the tool's own output CSVs; no row is ever opened,
so the figure carries the schema and none of the personal data the source
directories contain.
"""
import csv, sys
from PIL import Image, ImageDraw, ImageFont

BASE = ("/run/media/gavinl/T7/Python_Projects/Semi-Structured-Dataset-Converter"
        "/Test Runs/Zendingsarbeiders/Output")
TABLES = [("Individuals", "Individuals(1).csv"), ("Events", "Events(1).csv"),
          ("Spouses", "Spouses(1).csv")]

GLASS, INK, MUTED, ACCENT, RULE, KEY = "#1b2b36", "#eef2f4", "#8c9aa3", "#e88950", "#3d5567", "#e5b863"

def font(sz, bold=False):
    for p in (f"/usr/share/fonts/dejavu-sans-fonts/DejaVuSans{'-Bold' if bold else ''}.ttf",
              f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if bold else ''}.ttf"):
        try: return ImageFont.truetype(p, sz)
        except OSError: pass
    return ImageFont.load_default(size=sz)

schemas = []
for label, fn in TABLES:
    with open(f"{BASE}/{fn}", encoding="utf-8", errors="replace") as f:
        schemas.append((label, next(csv.reader(f))))   # header row only

W, H = 1500, 760
img = Image.new("RGB", (W, H), GLASS)
d = ImageDraw.Draw(img)
d.text((40, 34), "What comes out: three linked tables", font=font(30, True), fill=INK)
d.text((40, 78), "Column names are the tool's own output. No records are shown.",
       font=font(17), fill=MUTED)

BW, x0, top, rowh = 420, 40, 150, 38
boxes = {}
for i, (label, cols) in enumerate(schemas):
    x = x0 + i * (BW + 90)
    h = 54 + len(cols) * rowh + 16
    d.rounded_rectangle([x, top, x + BW, top + h], radius=12, outline=RULE, width=2)
    d.rounded_rectangle([x, top, x + BW, top + 46], radius=12, outline=RULE, width=2, fill="#22323d")
    d.text((x + 18, top + 12), label, font=font(21, True), fill=ACCENT)
    boxes[label] = (x, top, x + BW, top + h)
    for j, c in enumerate(cols):
        y = top + 60 + j * rowh
        # Spouses is a join table: both of its ID columns point at Individuals.
        own = label.rstrip("s").lower()
        is_pk = c.endswith("ID") and c[:-2].lower() == own and label != "Spouses"
        is_fk = c.endswith("ID") and not is_pk
        d.text((x + 18, y), c, font=font(17, True if (is_pk or is_fk) else False),
               fill=KEY if is_pk else (ACCENT if is_fk else INK))
        tag = "primary key" if is_pk else ("foreign key" if is_fk else "")
        if tag:
            d.text((x + BW - 18 - d.textlength(tag, font=font(13)), y + 3), tag,
                   font=font(13), fill=MUTED)

# Every table hangs off the same person identifier. The Spouses link is routed
# under the Events box rather than through it.
ax = boxes["Individuals"][2]
ey = top + 98
d.line([ax + 6, ey, boxes["Events"][0] - 6, ey], fill=ACCENT, width=2)
d.polygon([(boxes["Events"][0] - 6, ey), (boxes["Events"][0] - 18, ey - 6),
           (boxes["Events"][0] - 18, ey + 6)], fill=ACCENT)

drop = boxes["Events"][3] + 46
sx = boxes["Spouses"][0]
d.line([ax + 6, ey + 40, ax + 6, drop], fill=ACCENT, width=2)
d.line([ax + 6, drop, sx + 120, drop], fill=ACCENT, width=2)
d.line([sx + 120, drop, sx + 120, boxes["Spouses"][3] + 6], fill=ACCENT, width=2)
d.polygon([(sx + 120, boxes["Spouses"][3] + 6), (sx + 114, boxes["Spouses"][3] + 18),
           (sx + 126, boxes["Spouses"][3] + 18)], fill=ACCENT)

d.text((40, H - 46), "IndividualID is derived from the name and birth year, not assigned by the "
                     "model, so a person resolves to the same key on every run.",
       font=font(16), fill=MUTED)
img.save(sys.argv[1], quality=92)
print("tables:", [(l, len(c)) for l, c in schemas])
