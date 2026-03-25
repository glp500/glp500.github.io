# `glp500.github.io`

Custom Jekyll portfolio site for projects, publications, writing, and personal interests.

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

## Publish workflow

The repo includes a GitHub Actions workflow at `.github/workflows/pages.yml`.

To use it:

1. Push the repository to `main`.
2. In GitHub repository settings, set Pages to deploy from **GitHub Actions**.
3. Wait for the workflow to build and publish the generated `_site` artifact.

## First content pass

Before treating the site as finished, update these items:

1. Replace the placeholder biography and CV highlights in `_data/profile.yml`.
2. Add a real email address and any profile links you want visible.
3. Replace `assets/docs/gavin-cv-placeholder.pdf` with your actual CV.
4. Add real project and publication entries by copying the files in `content-templates/`.
5. Replace the launch post if you want the blog to start with your own writing.