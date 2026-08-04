# Handoff: real media for the remaining project pages

All seven remaining project pages carry real media. The other seven entries were
removed rather than filled: they had no genuine figures and, in most cases, no
public repository either. This document is what is left to do.

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

## Removed, not deferred

These seven were deleted from `_projects/` (recoverable from git history) along
with their placeholder SVGs:

```
age-aware-eeg-developmental-deviation
connectivity-preserving-eeg-phenotype-dimension-reduction
story-machines
gauntlet-local-ai-analysis-sandbox
cybernetics-artificial-societies
latent-structure-benchmark
stable-representations-benchmark
```

If any of them comes back, it needs real media first, not a placeholder. The
two EEG projects are the CNCR internship and the data is patient data: ask
Gavin what he is permitted to show before going looking. Story Machines and
Gauntlet are software that does something visible, so they want recordings —
`tools/figures/evoman_record_match.py` shows the headless-capture pattern, and
for a browser tool:

```bash
ffmpeg -i raw.mov -vf "fps=15,scale=1000:-2" -c:v libwebp -lossless 0 -q:v 70 -loop 0 out.webp
```

Under about 2 MB is the right target for an animated WebP.

`cybernetics-feedback` was dropped from `_data/fields.yml` when its only
project went; add it back if a project claims it again.

---

## What is actually outstanding

- **Nothing on this site has been checked in a browser.** See the note below.
- The Hydro DDQN and PSO galleries still use the repositories' own matplotlib
  PNGs on a white ground. They are legible, and now enlargeable, but they do
  not match the page. Redrawing them needs the underlying series, which is not
  committed separately in either repo.
- `_posts/` has one entry. The Blog works and has nothing to show.

---

## Style template for a project entry

Match what the seven live ones do.

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

- The Mini-Lab page is still live at `/mini-lab/` but is no longer linked from
  the homepage. That was deliberate. It still works.
- Figures open full-screen on click (native `<dialog>`, Escape closes, second
  click on the image shows actual pixels and lets it scroll). The archive scans
  are shipped at 2200px so that zoom is worth taking. Any new figure that
  rewards close reading should be shipped large for the same reason.
