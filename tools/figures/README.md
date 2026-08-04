# Project figure generation

Scripts that turn material in Gavin's project directory into the images the
project pages use. They are kept here so a figure can be regenerated when the
underlying results change, rather than being a one-off that nobody can repeat.

All three read from the external drive:

```
/run/media/gavinl/T7/Python_Projects/
```

Paths are hard-coded at the top of each script. If the drive mounts elsewhere,
edit the `BASE` / `SRC` constant.

## Setup

```bash
python3 -m venv .venv
.venv/bin/pip install Pillow matplotlib rdflib networkx pygame numpy
```

`pdftoppm` (poppler-utils) is also needed for `pdf_relational_pair.py`.
Do **not** use ImageMagick to rasterise those PDFs — it drops the embedded
fonts and the page comes out as a field of dots.

## The scripts

| script | reads | produces |
| --- | --- | --- |
| `layout_region_overlay.py` | `Layout Feature Extraction with LLMs/Examples/` | archive scans with the model's region polygons drawn over them |
| `emdutch_evaluation_chart.py` | `EMDutch-LLM-Finetune/**/bert_stats.csv`, `meteor_stats.csv` | the BERTScore / METEOR comparison, on the site palette |
| `pdf_relational_pair.py` | `Semi-Structured-Dataset-Converter/Test Runs/Zendingsarbeiders/` | source page beside the relational rows extracted from it |
| `conceptnet_subgraph.py` | `Document-to-ConceptNet-main/final_ontology_extension.ttl` | layered paper / scenario / actor graph |
| `evoman_record_match.py` | `EA_PSO-main/evoman_framework-master/PSO_EXPERIMENTS/` | frames of the evolved controller playing a match |

`evoman_record_match.py` takes the weight file, an enemy number, and an output
directory, and runs headless via `SDL_VIDEODRIVER=dummy`:

```bash
cd "/run/media/gavinl/T7/Python_Projects/EA_PSO-main/evoman_framework-master"
python evoman_record_match.py PSO_EXPERIMENTS/PSO_niching_enemy_3/best_weights_enemy_3.npy 3 /tmp/frames
magick $(ls /tmp/frames/*.png | sed -n '60~2p') -resize 560x -delay 6 -loop 0 \
  -layers Optimize -quality 62 assets/images/projects/pso-evoman-match.webp
```

It needs `pygame` and `numpy` on top of the packages above.

Each takes an output path as its argument. Example:

```bash
.venv/bin/python tools/figures/layout_region_overlay.py /tmp/out
magick /tmp/out/NL-HaNA_1.04.02_7923_0025-regions.jpg \
  -resize 1400x -quality 84 -define webp:method=6 \
  assets/images/projects/layout-regions-7923-0025.webp
```

## Palette

Anything drawn rather than photographed uses the site's own tokens, so figures
sit on the dark pages instead of punching a white rectangle through them:

```
background  #1b2b36     text        #eef2f4
muted       #8c9aa3     grid        #2c3f4c
blue        #3987e5     orange      #d95926     warm  #e5b863
```

Figures that already exist as PNGs in the project repositories (the Globalise
metrics, the DDQN curves) are shipped as they are, on their original white
ground. Redrawing them would mean re-running training, which is not worth it
for a portfolio image. They read as figures set into the page, which is a
defensible look, but it is a compromise and worth revisiting if the project
ever re-runs.
