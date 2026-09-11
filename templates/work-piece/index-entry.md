# Work index entry template

Copy the object below into the array in `content/work-index.json`. Every
field is explained underneath. Delete this file's prose before pasting —
only the JSON block goes into the real file (JSON has no comment syntax).

```json
{
  "slug": "your-piece-slug",
  "title": "Human-Readable Title Of The Piece",
  "category": "research",
  "status": "In Progress",
  "thumbnail": "assets/media/your-piece-thumb.jpg",
  "media_type": "youtube",
  "media_src": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
  "quick_description": "One or two sentences. This shows on the gallery tile and is used as the page's meta description.",
  "institution": "",
  "date": "2026",
  "featured": false,
  "tags": ["OpenFOAM", "CFD"],
  "supporting_media": ["assets/media/your-piece-supporting-1.png"],
  "links": [
    { "label": "Code", "url": "https://github.com/you/your-repo" }
  ]
}
```

## Field by field

- **slug** — URL-safe identifier, lowercase-with-hyphens. Must exactly
  match the filename of the matching markdown file:
  `content/work/<slug>.md`. This is also what shows up in the URL:
  `work/case-file.html?slug=<slug>&category=<category>`.
- **title** — Shown as the H1 on the case-file page and the gallery tile.
- **category** — Currently `"research"` or `"creative"` (drives the
  Work page's filter tabs in `js/work.js`). Adding a third value like
  `"teaching"` needs no code changes — the filter bar picks up whatever
  categories exist in the data.
- **status** — Free text, but `js/case-file.js` specifically checks
  whether it contains the word "progress" (case-insensitive) to pick the
  orange "in progress" badge style vs. the default "completed" style. Use
  `"In Progress"` or `"Completed"`, or something else if you want the
  default badge styling.
- **thumbnail** — Image shown on the gallery tile. Relative to the site
  root (no leading `../`), even for pages nested under `work/` — the
  gallery/tile code adds the relative prefix for you.
- **media_type** — One of `"youtube"`, `"video"`, `"gif"`, or `"image"`.
  Controls what renders in the hero `<figure class="case-hero">` at the
  top of the case-file page:
  - `"youtube"` → `<yt-embed videoid="{media_src}">` (accepts either a
    bare video ID or a full/short YouTube URL — paste straight from the
    browser bar).
  - `"video"` → `<video-embed src="{media_src}">`, self-hosted `.mp4`.
  - `"gif"` → a plain looping `<video muted loop playsinline>` (no
    click-to-play facade, since GIFs are expected to be short/silent).
  - `"image"` → a plain `<img>`.
  - There's no `"stl"`/`"vtk"` hero option yet — if you want a 3D model or
    scalar field as the *hero* (not just in the write-up body), that's a
    small addition to the `mediaMarkup` ternary in `js/case-file.js`, not
    something this template can paper over. In the meantime put your
    `<stl-reader>`/`<vtk-reader>` in the markdown body instead (see
    `body.md`) — that's fully supported today and is where the dandelion
    piece's viewers actually live.
- **quick_description** — Used as the gallery tile blurb and the page's
  `<meta name="description">`. Keep it to 1-2 sentences.
- **institution** — Optional. Shown next to the date on the case-file
  page if non-empty (e.g. `"University of Birmingham (collaboration)"`).
  Leave as `""` if not applicable.
- **date** — Free text, shown as-is (`"2026"`, `"2025-2026"`, etc.).
- **featured** — `true` for at most one piece at a time in practice — the
  homepage pulls the first `featured: true` piece as the hero teaser.
  Everything else, featured or not, still shows in the "Selected work"
  grid and on the Work page.
- **tags** — Short strings, shown as chips on the tile and case-file page.
- **supporting_media** — Array of image paths, rendered in a "Supporting
  media" grid at the bottom of the case-file page. Can be `[]`.
- **links** — Array of `{ "label": "...", "url": "..." }`. Rendered as a
  row of outbound links (Code, Paper, Dataset, etc.) near the bottom of
  the page. Can be `[]`.

## Where large files live

Per the project's hosting setup: thumbnails and small supporting images
can live in `assets/media/` and be committed normally. Anything large —
`.stl`, `.glb`, `.vtp`, `.vtu`, self-hosted `.mp4` — should NOT be
committed into normal git history. Upload it as an attachment on a GitHub
Release and reference it by its `https://cdn.jsdelivr.net/gh/<user>/<repo>@<tag>/<path>`
URL instead (see the project's top-level instructions for the full
rationale). Remember to version the filename when you update one of these
(`q-criterion-v2.vtp`, not overwriting `q-criterion.vtp` in place) — jsDelivr
caches aggressively and may keep serving the old file otherwise.
