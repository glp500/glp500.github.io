"""Source page beside the relational rows the tool extracted from it.

Both halves are real: the left is page 1 of the Zendingsarbeiders directory,
the right is the tool's own Individuals/Events output for a person on it.
"""
import csv, sys
from PIL import Image, ImageDraw, ImageFont

BASE = "/run/media/gavinl/T7/Python_Projects/Semi-Structured-Dataset-Converter/Test Runs/Zendingsarbeiders"
GLASS, INK, MUTED, ACCENT, RULE = "#1b2b36", "#eef2f4", "#8c9aa3", "#e88950", "#2c3f4c"

def font(sz, bold=False):
    for p in ("/usr/share/fonts/dejavu-sans-fonts/DejaVuSans%s.ttf" % ("-Bold" if bold else ""),
              "/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if bold else "")):
        try: return ImageFont.truetype(p, sz)
        except OSError: pass
    return ImageFont.load_default(size=sz)

page = Image.open(sys.argv[1]).convert("RGB")
PH = 900
page = page.resize((round(page.width * PH / page.height), PH), Image.LANCZOS)

W, H = page.width + 760, PH
canvas = Image.new("RGB", (W + 60, H + 90), GLASS)
d = ImageDraw.Draw(canvas)
canvas.paste(page, (30, 60))

d.text((30, 26), "the page", font=font(19, True), fill=MUTED)
x0 = page.width + 60
d.text((x0, 26), "what the tool returns", font=font(19, True), fill=ACCENT)

rows = list(csv.DictReader(open(f"{BASE}/Output/Individuals(1).csv")))
ev = list(csv.DictReader(open(f"{BASE}/Output/Events(1).csv")))
person = next(r for r in rows if r["IndividualID"] == "zuidema-jacob-poppkes-1860")
events = [e for e in ev if e["IndividualID"] == person["IndividualID"]][:6]

y = 70
d.text((x0, y), "Individuals", font=font(16, True), fill=INK); y += 30
for k in ("IndividualID", "Name", "Title", "Nationality", "Lifespan"):
    d.text((x0, y), k, font=font(13), fill=MUTED)
    d.text((x0 + 150, y), (person[k] or "—")[:52], font=font(13), fill=INK)
    y += 24
y += 18
d.line((x0, y, x0 + 700, y), fill=RULE, width=1); y += 24
d.text((x0, y), "Events, linked by IndividualID", font=font(16, True), fill=INK); y += 30
for e in events:
    d.text((x0, y), e["Period"] or "—", font=font(13), fill=ACCENT)
    d.text((x0 + 110, y), e["EventName"][:46], font=font(13), fill=INK)
    y += 22
    d.text((x0 + 110, y), (e["Location"] or "") + ("   " + e["Organization"] if e["Organization"] else ""),
           font=font(12), fill=MUTED)
    y += 30

d.text((30, H + 62), "Zendingsarbeiders directory, 2023: one page in, normalised tables out.",
       font=font(13), fill=MUTED)
canvas.save(sys.argv[2], quality=90)
print("ok", canvas.size)
