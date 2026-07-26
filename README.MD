# `glp500.github.io`

Custom Jekyll research portfolio for projects, field notes, topics, experience, and personal interests. The homepage includes a live canvas flocking model over an original generated landscape.

## Local development

```powershell
bundle install
bundle exec jekyll serve
```

The local preview will be available at `http://127.0.0.1:4000`.

## Content structure

- `_data/profile.yml`: name, tagline, hero text, contact links, CV link, and homepage highlights.
- `_data/navigation.yml`: top navigation labels and routes.
- `_projects/`: project entries written in Markdown front matter.
- `_publications/`: publication entries written in Markdown front matter.
- `_posts/`: dated blog posts.
- `content-templates/`: starter files you can copy when adding real content.

Posts can include a feature image, image caption, embedded video, and related external links through front matter. LinkedIn and X sharing links are generated automatically on every post. Add `substack_url`, `x_url`, and your LinkedIn URL in `_data/profile.yml` to connect your real profiles.

## Replacing or adding images

1. Copy your image into `assets/images/`.
2. To replace the landscape used by the homepage and closing sections, change `images.hero_background` in `_data/profile.yml`. Adjust `images.hero_position` if the crop needs to move.
3. To add an About portrait, set `images.portrait` and `images.portrait_alt` in `_data/profile.yml`.
4. Posts and projects support their own `feature_image` and `feature_image_alt` fields. See the files in `content-templates/` for examples.

JPG, PNG, AVIF, and WebP files all work. WebP or AVIF generally provide the best page weight.

## Publish workflow

The repo includes a GitHub Actions workflow at `.github/workflows/pages.yml`.

To use it:

1. Push the repository to `main`.
2. In GitHub repository settings, set Pages to deploy from **GitHub Actions**.
3. Wait for the workflow to build and publish the generated `_site` artifact.

## First content pass

Before treating the site as finished, update these items:

1. Refine the draft biography and project language in `_data/profile.yml` and `_projects/`.
2. Add a real email address and the social profiles you want visible.
3. Replace `assets/docs/gavin-cv-placeholder.pdf` with your actual CV.
4. Add your education history in `experience.md`.
5. Copy `content-templates/post.sample.md` when publishing new field notes.
