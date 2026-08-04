"""Redraw the boundary-detection model comparison, legibly and on the palette.

Numbers are transcribed from the MODEL PERFORMANCE SUMMARY printed by
notebooks/06_model_comparison_analysis.ipynb in the Globalise Document
Segmentation repository. That table is used rather than the repository's
heatmap.png, because the two disagree and the notebook output is the one that
states what it is measuring.
"""
import sys
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

GLASS, INK, MUTED, GRID = "#1b2b36", "#eef2f4", "#8c9aa3", "#2c3f4c"
BLUE, ORANGE = "#3987e5", "#d95926"

# model: (accuracy, weighted F1)
MODELS = [
    ("XGBoost",             0.9136, 0.9086),
    ("Random Forest",       0.8933, 0.8828),
    ("SVM",                 0.8530, 0.8396),
    ("Logistic Regression", 0.8387, 0.8120),
    ("Neural Network",      0.8122, 0.8318),
]
FEATURES = [                       # XGBoost, top 5
    ("num_words",             0.2127),
    ("num_text_lines",        0.0503),
    ("delta_next_num_tokens", 0.0438),
    ("punctuation_density",   0.0354),
    ("delta_prev_num_tokens", 0.0308),
]

fig, (a1, a2) = plt.subplots(1, 2, figsize=(13, 5.4), dpi=200,
                             gridspec_kw={"width_ratios": [1.25, 1]})
fig.patch.set_facecolor(GLASS)

names = [m[0] for m in MODELS]
y = np.arange(len(MODELS))[::-1]
a1.set_facecolor(GLASS)
a1.barh(y + 0.19, [m[1] for m in MODELS], 0.36, color=BLUE, label="Accuracy")
a1.barh(y - 0.19, [m[2] for m in MODELS], 0.36, color=ORANGE, label="F1 (weighted)")
for i, (n, acc, f1) in zip(y, MODELS):
    a1.text(acc + 0.008, i + 0.19, f"{acc:.3f}", va="center", color=INK, fontsize=9)
    a1.text(f1 + 0.008, i - 0.19, f"{f1:.3f}", va="center", color=INK, fontsize=9)
a1.set_yticks(y); a1.set_yticklabels(names, color=INK, fontsize=10)
a1.set_xlim(0, 1.04); a1.tick_params(axis="x", colors=MUTED, labelsize=9)
a1.xaxis.grid(True, color=GRID, linewidth=0.8); a1.set_axisbelow(True)
for s in a1.spines.values(): s.set_visible(False)
a1.set_title("Five models on the same held-out inventory", color=INK,
             fontsize=12.5, loc="left", pad=12)
leg = a1.legend(loc="upper center", bbox_to_anchor=(0.5, -0.06), ncols=2,
                frameon=False, fontsize=9.5)
for t in leg.get_texts(): t.set_color(INK)

a2.set_facecolor(GLASS)
fy = np.arange(len(FEATURES))[::-1]
a2.barh(fy, [f[1] for f in FEATURES], 0.55, color=ORANGE)
for i, (n, v) in zip(fy, FEATURES):
    a2.text(v + 0.004, i, f"{v:.3f}", va="center", color=INK, fontsize=9)
a2.set_yticks(fy); a2.set_yticklabels([f[0] for f in FEATURES], color=INK, fontsize=9.5)
a2.set_xlim(0, 0.25); a2.tick_params(axis="x", colors=MUTED, labelsize=9)
a2.xaxis.grid(True, color=GRID, linewidth=0.8); a2.set_axisbelow(True)
for s in a2.spines.values(): s.set_visible(False)
a2.set_title("What XGBoost leans on", color=INK, fontsize=12.5, loc="left", pad=12)

fig.text(0.012, 0.02,
         "Transcribed from notebooks/06_model_comparison_analysis.ipynb. "
         "Class-wise figures are omitted: the notebook estimates them from overall performance.",
         color=MUTED, fontsize=8.5)
fig.tight_layout(rect=[0, 0.035, 1, 1])
fig.savefig(sys.argv[1], facecolor=GLASS)
print("ok")
