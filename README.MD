# Gavin Lip — Research Portfolio

A custom Jekyll portfolio for research programs, projects, publications, field notes, media, open-source resources, and a web CV. The visual system is based on Gavin's Canva layouts and includes a persistent interactive multi-agent field.

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

- `_research/`: enduring questions and research programs.
- `_projects/`: concrete studies, tools, ventures, and experiments.
- `_publications/`: papers and formal outputs.
- `_posts/`: dated announcements, essays, project updates, and reading notes.
- `_media/`: Read, Watch, and Listen shelf entries.
- `_resources/`: original and curated code, data, templates, tools, and references.

Copy the corresponding starter file from `content-templates/`, remove `.sample` from the filename, complete the front matter, and write any longer content below it. A post filename must begin with `YYYY-MM-DD-`.

Use `published: false` in front matter to keep a draft out of the built site. Set `featured: true` to make an eligible item appear on the homepage.

## Replacing and adding images

1. Add JPG, PNG, WebP, AVIF, or SVG files under `assets/images/`.
2. Set the entry's `image` or `feature_image` field to a site path such as `/assets/images/my-image.webp`.
3. Write meaningful `image_alt` or `feature_image_alt` text.
4. Leave the image field blank to use the site's original procedural specimen instead.

The homepage portrait is configured in `_data/profile.yml`. WebP or AVIF is recommended for photographs.

## Profile, navigation, and CV

- `_data/profile.yml` contains identity, contact links, CV experience, education, methods, and interests.
- `_data/navigation.yml` controls the seven primary navigation links and their agent-world modes.
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
