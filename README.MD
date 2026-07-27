# Gavin Lip — Research Portfolio

A custom Jekyll portfolio for research work, publications, posts, media, a web CV, and the Mini-Lab. The visual system is based on Gavin's Canva layouts and includes a persistent interactive multi-agent field.

The canonical public homepage is **https://glp500.github.io/**. Do not append the repository name to the URL; `https://glp500.github.io/glp500.github.io/` is not the site root.

## Local preview

```bash
bundle install
bundle exec jekyll serve
```

Open `http://127.0.0.1:4000`. Run a production build with:

```bash
JEKYLL_ENV=production bundle exec jekyll build
```

## Publishing content

Long-form entries are Markdown files:

- `_projects/`: studies, tools, ventures, and experiments. These are the site's core content and appear at `/my-work/`.
- `_publications/`: papers and formal outputs.
- `_posts/`: dated announcements, essays, project updates, and reading notes.
- `_media/`: Read, Watch, Listen, and Use shelf entries.

Copy the corresponding starter file from `content-templates/`, remove `.sample` from the filename, complete the front matter, and write any longer content below it. A post filename must begin with `YYYY-MM-DD-`.

Use `published: false` in front matter to keep a draft out of the built site. Set `featured: true` on a project to make it appear in Selected work.

### Posts

**The homepage is the blog.** Everything in `_posts/` appears at `/` newest-first, filtered by the `kind` field: `Announcement`, `Essay`, `Project Update`, or `Reading Note`. `/announcements/` and `/blog/` redirect to `/`; individual post URLs are unchanged.

A post supports a lead image, a gallery, an embedded or self-hosted video, and titled external links. Reading time, share buttons, and previous/next paging are generated. Any field left blank is skipped, so a plain post needs only `title`, `date`, `kind`, and `excerpt`. See `content-templates/post.sample.md` for every field.

### My Work

`/my-work/` is the single archive for research, projects, and code. Research, Projects, and Open Source used to be three separate destinations; `/research/`, `/projects/`, and `/open-source/` now redirect here. Project detail URLs (`/projects/<slug>/`) are unchanged.

The page shows featured projects, then the full ledger with one filter row combining research fields and project contexts. Each ledger row links its repository directly, which is why there is no longer a separate open-source list.

Research fields live in `_data/fields.yml` as `key` + `label` pairs. A project joins a field by listing that key under `fields:` in its front matter; a project may belong to several. Field labels must slugify to their own key (`Machine Learning` → `machine-learning`), since the filter buttons derive their values that way.

### Media shelf

`_media/` entries link outward rather than generating their own pages, so the collection is `output: false`. `type` drives the filter: `Read`, `Watch`, `Listen`, or `Use`. Use `Use` for software and tools you work with. A card renders a visual only when `image` is set, so entries without artwork stay as clean text rows.

### Project records

Projects are curated snapshots rather than live GitHub feeds. Repository content should be reviewed, copy-edited, and committed to this site so a README change cannot silently alter the public portfolio.

The project template supports:

- `context`: the archive filter label, such as `Research`, `Startup`, or `Graduate coursework`.
- `dates_display`: reader-facing dates when one machine-sortable `date` is insufficient.
- `featured_rank`: the order of featured case studies; only use it with `featured: true`.
- `fields`: one or more `_data/fields.yml` keys. These drive the `/my-work/` filters and the "Fields" links in the project sidebar.
- `related_publication`: a `_publications/` slug.
- `visuals`: an ordered gallery of images or diagrams with alt text, captions, and provenance links.
- `video_embed`: a privacy-respecting embed URL. YouTube embeds should use `youtube-nocookie.com`.

When refreshing a project from GitHub:

1. Review the repository README, implementation, aggregate outputs, and commit dates.
2. Confirm the role, collaborators, institutional context, and claims against the CV or another authoritative source.
3. Copy or re-render only visuals you have permission to publish.
4. Remove participant-level data, credentials, local paths, and private repository URLs.
5. Preserve null findings and limitations; never infer numerical results from an image when the underlying values are unavailable.
6. Build the site and inspect the project page, its field links, and the `/my-work/` filters before publishing.

## Mini-Lab

`/mini-lab/` runs a small language model on the visitor's own GPU via
[wllama](https://github.com/ngxson/wllama) (WebAssembly bindings for
[llama.cpp](https://github.com/ggml-org/llama.cpp) with WebGPU offload) and
applies it to a file that never leaves their browser. There is no server and no
API key.

### The trust boundary

This is the design rule that makes the output worth reading, and any change
must preserve it:

- The model chooses **which** analysis suits the data and writes the prose.
- It never produces a number, and never emits code that gets executed.
- It sees only the schema and summary statistics — never the rows.
- Every plan it returns is validated against the real schema in
  `assets/js/minilab/analysis.js` and corrected where it is wrong. Corrections
  are shown to the visitor, not hidden.

Numbers come from `analysis.js` and the exported script only. If you add a
capability, compute it — do not ask the model for it.

### Models

`_data/minilab-models.yml` is the catalogue. Sizes must be the real byte sizes
from the Hugging Face API, not estimates:

```
curl -s "https://huggingface.co/api/models/<repo>?blobs=true" \
  | python3 -c "import sys,json;[print(f['size'],f['rfilename']) for f in json.load(sys.stdin)['siblings'] if f['rfilename'].endswith('.gguf')]"
```

**Browsers cannot load a single file larger than 2 GB** (ArrayBuffer limit).
Anything above that gets a `blocked_reason` and is shown as unavailable with
the reason stated, rather than omitted. This is why `gemma-4-E2B/E4B` are not
usable here: their smallest quants are 2.29 GB and 3.55 GB, and neither repo
publishes split files. They become available if split GGUFs are published.

`assets/js/minilab/hardware.js` derives a memory budget from the tightest of
the WebGPU buffer limit, half of device memory, and free storage quota, then
disables anything that will not fit. Without WebGPU the page still works on the
CPU, and the analysis runs even with no model loaded.

### Vendored libraries

`assets/js/vendor/` holds wllama and SheetJS, committed rather than loaded from
a CDN so an outage cannot break the page. Note that `.gitignore` anchors its
Bundler rule as `/vendor/` — a bare `vendor/` would match this directory too
and silently drop the runtime from the deploy.

Everything under `assets/js/minilab/` is dynamically imported only on
`/mini-lab/`, so no other page pays for it.

## Replacing and adding images

1. Add JPG, PNG, WebP, AVIF, or SVG files under `assets/images/`.
2. Set the entry's `image` or `feature_image` field to a site path such as `/assets/images/my-image.webp`.
3. Write meaningful `image_alt` or `feature_image_alt` text.
4. Leave the image field blank to use the site's original procedural specimen instead.

Project gallery visuals belong under `assets/images/projects/`. Every gallery entry should include a caption explaining whether it is a result, screenshot, or explanatory diagram. Add `source_url` when a public repository or paper supports the visual. Private-source aggregate figures must remain de-identified and must not link to the private repository.

The homepage portrait is configured in `_data/profile.yml`. WebP or AVIF is recommended for photographs.

## Profile, navigation, and CV

- `_data/profile.yml` contains identity, contact links, CV experience, education, methods, and interests.
- `_data/navigation.yml` controls the six primary navigation links and their agent-world modes.
- The downloadable PDF is `assets/docs/gavin-lip-cv.pdf`.

Blank profile URLs are not rendered. The public HTML intentionally omits the phone number; the downloadable source CV contains the contact information present in the original document.

## Interactive field

The fixed canvas in `assets/js/site.js` changes species and organization by page or section. Pointer movement creates currents, clicks create temporary attractors, dragging paints a flow field, and double-clicking triggers a coordinated regime shift. A compact state is stored in `sessionStorage` so movement continues across internal navigation.

Visitors using reduced-motion preferences, and small touch-only devices, receive a static procedural field. The canvas is decorative, ignores pointer input, and is hidden from assistive technology.

## GitHub Pages

The workflow at `.github/workflows/pages.yml` builds and deploys the site.

1. Push changes to `main`.
2. In the repository's **Settings → Pages**, choose **GitHub Actions** as the source.
3. Monitor the **Actions** tab for the `Deploy Jekyll site` workflow.
4. Open the deployment URL shown by the completed workflow.

No database, CMS, or paid hosting is required.

The CSS and JavaScript URLs receive a unique build timestamp so a newly deployed visual system is not confused with an older cached theme. If GitHub reports a successful deployment but a browser still shows older HTML, open the canonical URL in a private window or hard-refresh once with `Ctrl+Shift+R`.
