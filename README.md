# Research portfolio

The website is built from `src/` templates and the existing `content/` records
with Eleventy. Deploy `_site/`; the root HTML files are retained as transitional
source references and are not the finished site.

## Local development

Use Node.js 24 and pnpm 11.25.0:

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm dev
```

Open `http://127.0.0.1:8080/`. Rebuild after editing content or templates.
Every build removes only the generated `_site` directory, then renders and
checks the complete site. Dependencies and generated output are Git-ignored.

## Authoring

Use `templates/work-piece/` or `templates/writing-post/` for new entries.
The shared layouts include image enlargement, supporting galleries, related
thumbnails, responsive heroes and adjacent-project navigation. Writing supports
optional `hero` and `hero_alt` metadata, including animated GIFs.

Contents are generated from article headings (`h2` through `h6`) during the
build; do not maintain a manual contents list. Viewer captions are excluded.
On wide screens the contents rail sticks beside the article and highlights
the current section. Narrow screens retain the normal contents list.
Chart CSV downloads are generated from source JSON and remain untracked.

Theme colors live in `css/base.css`; shared finishing details live in
`css/polish.css`, loaded by the base layout. Keep muted text readable in both
themes, thumbnail badges legible over images, and hover motion disabled when
reduced motion is requested. Theme changes also repaint the home flow backdrop.

## GitHub Pages

`.github/workflows/pages.yml` runs tests and a clean, validated build for pull
requests targeting `main`. Pushes to `main` and manual workflow runs on `main`
also deploy the generated artifact through the `github-pages` environment.
Pull requests cannot run the deployment job. Only that job receives Pages
write and OIDC permissions; no personal token is required.

Before the first deployment:

1. In the repository's **Settings → Pages**, select **GitHub Actions** as the
   publishing source.
2. Preserve the custom domain `toranniroula.com.np` in Pages settings and its
   existing DNS/HTTPS configuration. `CNAME` remains in the generated site,
   but the custom domain for an Actions deployment is configured in Settings.
3. Commit and push the migration and workflow, or merge a reviewed pull request
   into `main`. Confirm both workflow jobs complete before checking the site.

The official upload action excludes dotfiles from its archive. `.nojekyll` is
retained locally for compatibility; Actions deployment serves prebuilt HTML
and does not run Jekyll.

After deployment, check Home, Work, Writing, About and Contact on the custom
domain; open a work record and writing post directly; test the old query URLs
with fragments; and inspect the scientific viewers and downloads. Verify
mobile navigation, theme switching, canonical URLs, sitemap and RSS links.
Contact delivery still needs a deliberate live submission; local tests mock
the endpoint and do not send messages.

For rollback, revert the migration deployment commit on `main` to the last
working built version. For the initial cutover, the prior root-shell site can
be restored by reverting the workflow/migration and restoring the previous
Pages publishing source. Record that setting before changing it.

See [the migration report](docs/publishing-pilot.md) for content validation and
remaining interactive checks, and [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
for repository configuration.
