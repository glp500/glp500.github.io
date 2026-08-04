"""Re-render the Early Modern Dutch evaluation on the site's own palette.

The numbers are read straight from the thesis result CSVs; only the drawing
is new, so the figure sits on the dark pages instead of punching a white
rectangle through them.
"""
import csv, glob, sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

BASE = "/run/media/gavinl/T7/Python_Projects/EMDutch-LLM-Finetune"

def means(pattern):
    path = glob.glob(f"{BASE}/**/{pattern}", recursive=True)[0]
    out = {}
    with open(path, encoding="utf-8", errors="replace") as f:
        for row in csv.DictReader(f):
            name = row[""].strip()
            if name:
                out[name] = float(row["mean"])
    return out

bert, meteor = means("bert_stats.csv"), means("meteor_stats.csv")
models = [m for m in bert if m in meteor]
models.sort(key=lambda m: bert[m])

INK, GLASS, MUTED, GRID = "#eef2f4", "#1b2b36", "#8c9aa3", "#2c3f4c"
BLUE, ORANGE, WARM = "#3987e5", "#d95926", "#e5b863"
# The adapted variants are the point of the study, so they are the lit bars.
TUNED = {"Llama 3 Unsloth", "mistral unsloth", "Llama 2 Unsloth", "Tiny Llama Unsloth", "Llama & Assistant"}

fig, ax = plt.subplots(figsize=(9, 5.4), dpi=200)
fig.patch.set_facecolor(GLASS); ax.set_facecolor(GLASS)
y = range(len(models)); h = 0.38

ax.barh([v + h/2 for v in y], [bert[m] for m in models], h,
        color=[BLUE if m in TUNED else "#31536b" for m in models],
        edgecolor="none", label="BERTScore (mean)")
ax.barh([v - h/2 for v in y], [meteor[m] for m in models], h,
        color=[ORANGE if m in TUNED else "#6b452e" for m in models],
        edgecolor="none", label="METEOR (mean)")

ax.set_yticks(list(y))
ax.set_yticklabels(models, color=INK, fontsize=9)
ax.set_xlim(0, 1)
ax.tick_params(axis="x", colors=MUTED, labelsize=8)
for s in ax.spines.values(): s.set_visible(False)
ax.xaxis.grid(True, color=GRID, linewidth=0.8)
ax.set_axisbelow(True)
ax.set_xlabel("score", color=MUTED, fontsize=9)
ax.set_title("Early Modern Dutch translation, ten model variants",
             color=INK, fontsize=12, loc="left", pad=14)
leg = ax.legend(loc="lower right", frameon=False, fontsize=9)
for t in leg.get_texts(): t.set_color(INK)
fig.text(0.01, 0.015, "Lit bars are the fine-tuned variants.", color=MUTED, fontsize=8)
fig.tight_layout()
fig.savefig(sys.argv[1], facecolor=GLASS)
print("models:", len(models))
for m in models[-3:]:
    print(f"  {m}: BERT {bert[m]:.3f}  METEOR {meteor[m]:.3f}")
