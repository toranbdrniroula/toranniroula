# Writing index entry template

Copy the object below into the array in `content/writing-index.json`.
Delete this file's prose before pasting — only the JSON block goes into
the real file.

```json
{
  "slug": "your-post-slug",
  "title": "Your Post Title",
  "date": "2026-07-16",
  "excerpt": "One or two sentences shown on the writing listing page card.",
  "thumbnail": "../assets/media/your-post-thumb.jpg",
  "pdf": "assets/downloads/your-post.pdf",
  "category": "technical"
}
```

## Field by field

- **slug** — must exactly match `content/writing/<slug>.md`.
- **title** — shown as the H1 on the post page and the listing card.
- **date** — `YYYY-MM-DD`. Used for sort order (newest first) as well as
  display, so keep it in that format rather than free text.
- **excerpt** — 1-2 sentences for the listing card.
- **thumbnail** — path relative to the site root, same convention as
  `work-index.json`'s `thumbnail` (no `../` prefix — `js/writing.js`
  prepends the right relative prefix itself depending on which page is
  rendering it).
- **pdf** — optional. If present, shows a "Download PDF" affordance on
  the post page. Omit the key entirely (not `""`) if there isn't one.
- **category** — free text, used to group/filter on the writing listing
  page (existing values are `"technical"` and `"reflection"`, but like
  Work's categories, a new one needs no code changes).
