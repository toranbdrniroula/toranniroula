# Editing your website

The design and interactive viewers are shared automatically. Everyday editing happens in content/, not in HTML or JavaScript.

## Edit a page

- Work: edit content/work/<page-name>.md.
- Writing: edit content/writing/<page-name>.md.
- About, contact details, social links and CV path: edit content/site.json.
- Publications: edit content/publications.json.
- Images, videos and models: put files in assets/media/.
- Chart data: put the source JSON in content/data/.

Each article is ONE file: its settings are in a JSON block between --- lines at the top, and its Markdown text follows. Keep settings strings quoted and commas between fields. For a wording edit, just change the text below the second --- line. There is no index file or content hash to update.

The filename is the URL. Renaming it changes the URL. Use lowercase words separated by hyphens. Optional order controls work-page ordering (smaller numbers first). The title, date, thumbnail, hero and other settings travel with that article.

## Windows: three commands

Run these from this folder in PowerShell. No separate Node or pnpm commands are needed when the bundled runtime is available.

```powershell
.\website.cmd preview
.\website.cmd check
.\website.cmd publish
```

preview builds the site, serves http://127.0.0.1:8080/, and rebuilds after you save changes. Refresh the browser to see them. Ctrl+C stops it.

check runs tests, builds the site, and verifies current article text, equations, media, links and metadata. Errors identify the file or setting to fix.

publish performs those checks first, commits website changes, and pushes to main. GitHub Actions then deploys; allow the workflow to finish before expecting the live site to change. If a check fails, publishing stops. It never forces a push.

If you prefer GitHub's web editor, edit the same Markdown file and commit it to main there. The workflow builds and publishes it automatically.

## Add a page

```powershell
.\website.cmd new work my-project My Project Title
.\website.cmd new writing my-note My Note Title
```

These create drafts without overwriting existing files. Write the article, set "draft": false in its settings, then publish. No index, route, contents list, related-work list, RSS or sitemap edits are required. You can also copy templates/work.md or templates/writing.md into the corresponding content folder.

## Hide or remove a page

Set "draft": true to hide it while retaining the file. Delete its Markdown file to remove it completely, then publish. The sitemap, feed, listings and related links update automatically. The two unfinished gallery placeholders are retained as drafts.

## Media and appearance

See docs/media.md for image, video, STL, GLB, VTK, chart and scroll-tour examples. Contents are generated from headings and subheadings. Image enlargement, static viewer fallbacks, related thumbnails and adjacent links are automatic.

Optional article settings `card_title` and `card_thumbnail` control the short
title and image on the work grid without changing the full article title,
hero or scientific figures. Use `"thumbnail_fit": "contain"` for plots or
diagrams that should be shown in full. Omit these settings
to use the normal title and thumbnail. The first selected project receives
the larger homepage layout automatically; `order` controls that selection.

Theme colors live in css/base.css and shared finishing details in css/polish.css. The flow field has independent --flow-bg and --flow-accent colors so interface changes do not alter its appearance. Routine writing does not require editing these files.

## Setup on another computer

Install Node.js 24, then run:

```powershell
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
```

The Windows helper uses Node from PATH or the bundled runtime already available on this computer. Standard pnpm test, pnpm build and pnpm dev also work. Never commit node_modules/, _site/, generated CSV files or local .qa/ files.

Only src/ contains page layouts. The old duplicate root HTML pages and client-rendered article loaders have been removed. Existing old query-style article links still forward to the canonical pages. Deployment remains GitHub Pages with the custom domain and existing contact destination preserved.
