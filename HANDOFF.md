# Handoff: real media for the remaining project pages

Seven of the fourteen project pages now carry real media. This document is for
whoever picks up the other seven.

Read `tools/figures/README.md` first — it has the setup, the palette, and the
working scripts.

---

## What "done" means here

Gavin's complaint was that the site had no character because every project
panel was a small invented SVG. The fix is to replace those with material that
is genuinely his. Three kinds count, in his own priority order:

1. **Real outputs from his runs** — metrics, curves, importances, heatmaps.
2. **Real archive scans and source documents**, ideally with the model's own
   output drawn over them. These carry the most character on the whole site.
3. **Screen recordings of the tools actually running.** One exists: the EvoMan
   match on `particle-swarm-game-agents`. The two startup entries still need
   theirs, and that is the highest-value remaining work.

What does **not** count: invented diagrams, stock imagery, anything generated to
look like a result. If a figure is drawn rather than photographed, the numbers
behind it must come from his data.

Archive scans are cleared for publication: Nationaal Archief / Globalise
material, credited with its NL-HaNA inventory reference in `source_label`.

---

## Done (7 projects)

| project | hero image | source |
| --- | --- | --- |
| `ner-layout-feature-pipeline` | 1755 VOC page with detected regions | `Layout Feature Extraction with LLMs/Examples/` |
| `voc-archival-document-segmentation` | five-model performance heatmap | `Globalise Document Segmentation/images/` |
| `pumped-hydroelectric-energy-arbitrage` | cumulative profit curve | `Project RL/Code/DQN Agent (Updated)/Figures/` |
| `early-modern-dutch-llm-finetuning` | BERTScore / METEOR comparison | `EMDutch-LLM-Finetune/**/bert_stats.csv` |
| `pdf-to-relational-data-tool` | source page beside extracted rows | `Semi-Structured-Dataset-Converter/Test Runs/` |

Each has a hero (`image` + `image_alt`) and a `visuals:` gallery of one to three
figures with real captions.

Then Gavin copied three more directories onto the drive and these two were
finished as well, bringing the total to seven:

| project | hero image | source |
| --- | --- | --- |
| `particle-swarm-game-agents` | animated match recording | `EA_PSO-main/` + `evo_man_group103-main/` |
| `document-to-conceptnet` | layered paper/scenario/actor graph | `Document-to-ConceptNet-main/` |

The PSO project is split across two directories, as Gavin said. The results and
saved controllers live in `EA_PSO-main/evoman_framework-master/PSO_EXPERIMENTS/`;
`evo_man_group103-main/` is the group's earlier working copy. Take results from
the former.

---

## Remaining (7 projects)

### Tier 1 — material exists, just needs fetching

Both original Tier 1 entries are done. `tools/figures/evoman_record_match.py`
shows the pattern for anything else with a pygame front end: force
`SDL_VIDEODRIVER=dummy`, monkey-patch `pygame.display.flip` to save every other
frame, then assemble with ImageMagick. It runs headless and needs no display.

### Tier 2 — related material on the T7, needs Gavin to confirm the mapping

The directory names do not match the project slugs. **Ask before assuming.**
Unmapped candidates worth asking about:

```
Globalise Inventory Meta-data Analysis/   728 images
Renate Inventory Analysis/                histogram_total_regions.png
binary_renate_classifier/                 8 notebooks
TANAP Segmentation (Neural Network)/      8 notebooks
Document Segmentation using NER & Visual Features (Dataset creation)/
NIAA Project Data Analysis/               8 notebooks
XML_segmentation_old/                     18 notebooks
FoB/                                      14 images, bioinformatics
ML4QS/ · HPML-course-materials/ · archivist/ · youtube_to_mp3/
```

Several of these are probably earlier stages of projects already on the site
rather than separate entries. Notebooks often hold rendered plot outputs in
their JSON — extract those before re-running anything.

**`latent-structure-benchmark`**, **`stable-representations-benchmark`**,
**`age-aware-eeg-developmental-deviation`**,
**`connectivity-preserving-eeg-phenotype-dimension-reduction`** · the two EEG
projects are the CNCR internship and the data is patient data. Do not go looking
for it. Ask Gavin what he is permitted to show; the answer may be nothing but a
method diagram, in which case leave the panel without an image rather than
inventing one.

### Tier 3 — needs Gavin, and needs a recording

**`story-machines`** and **`gauntlet-local-ai-analysis-sandbox`** are the two
startup entries and the two most poorly served by a static image. Both are
software that does something visible. The EvoMan recording shows the standard
to match: a real run, captured, with the actual result stated in the caption.

Ask him to record 10–20 seconds of each, silently, at 1280×720 or larger:
drop a file in, let it work, show the result. `ffmpeg` can convert:

```bash
ffmpeg -i raw.mov -vf "fps=15,scale=1000:-2" -c:v libwebp -lossless 0 -q:v 70 -loop 0 out.webp
```

An animated WebP under about 2 MB is the right target. The post template already
supports `video_url` and `video_embed` if he would rather host a real video.

---

## Style template for a project entry

Match what the seven completed ones do.

```yaml
image: /assets/images/projects/<slug>-<what-it-shows>.webp
image_alt: "Plain description of what is visible, for someone who cannot see it"
visuals:
  - type: image | chart | diagram
    src: /assets/images/projects/<file>.webp
    alt: "..."
    caption: "..."
    source_label: "Nationaal Archief, NL-HaNA 1.04.02 inv. 7923"   # or "Repository output"
    source_url: ""                                                  # when a public URL backs it
```

**Captions carry the character, not the images.** The house style is: say what
is on screen, then say the one thing a reader would otherwise get wrong. Look at
what shipped:

> "The ragged paragraph outline is the model's actual output, not a cleaned-up
> version of it."

> "Twenty episodes is few, and the curve is still climbing at the end; the
> honest reading is that this was stopped when it was good enough for the
> assignment, not when it converged."

> "Read as a ranking rather than as absolute quality: both metrics reward
> surface overlap, which is exactly what fine-tuning on this corpus optimises."

Do not write captions that oversell. Gavin's whole framing is a working archive,
not a portfolio, and a caption that admits a limit is worth more here than one
that claims a result.

### Image conventions

- WebP, 1400px wide for heroes, `-quality 84` to `88`.
- Named `<project>-<what-it-shows>.webp` in `assets/images/projects/`.
- Anything newly drawn uses the site palette in `tools/figures/README.md`.
- Existing repository PNGs ship on their original white ground. It is a
  compromise; do not spend a day fixing it.

---

## Things that will bite you

- **Firefox headless is broken on this machine.** `--screenshot` hangs and
  fails with `RenderCompositorSWGL failed mapping default framebuffer`, even on
  a blank local file. It worked earlier in the session and then stopped. There
  is no Chromium, no xvfb, no Playwright. Until that is fixed you cannot verify
  visually — build, check the markup, and ask Gavin to look.
- **Some paths on the T7 contain a private-use Unicode character** (U+F022)
  where a slash was on the original macOS volume. `EMDutch-LLM-Finetune` is the
  one that bites: `ls` and `cat` on the literal name fail. Use Python `glob`
  with `recursive=True` instead of shell globbing.
- **`._` AppleDouble files are everywhere.** Filter them out or they will be
  treated as images.
- **The site is single-theme dark.** A white figure dropped onto a project page
  reads as a bright rectangle. That is accepted for existing repository output
  and not for anything new.
- **`[hidden]` needs `display: none !important`** in this stylesheet — several
  component rules set `display` and would otherwise beat the UA rule. Already
  handled; do not remove it.

---

## Also outstanding, unrelated to projects

- The Mini-Lab page is still live at `/mini-lab/` but no longer linked from the
  homepage. That was deliberate. It still works.
- `_posts/` has exactly one entry, now listed at `/blog/`. The Blog is built and
  empty-stated but has nothing to show yet.
- The static chart image on the Early Modern Dutch project detail page's hero
  slot was replaced, but the light-ground repository PNGs on other pages remain.
