# Writing index entry

Add this object to content/writing-index.json and the article to content/writing/<slug>.md. The build generates /writing/<slug>/.

```json
{
  "slug": "your-post-slug",
  "title": "Your Post Title",
  "date": "2026-07-16",
  "excerpt": "A short introduction for the writing listing.",
  "thumbnail": "assets/media/your-post-thumb.gif",
  "hero": "assets/media/your-post-thumb.gif",
  "hero_alt": "Describe what the hero image shows",
  "pdf": "assets/downloads/your-post.pdf",
  "category": "technical"
}
```

Use repository-root paths without ../. hero and hero_alt are optional: an image or animated GIF appears below the title and PDF link, with image enlargement. Omit hero to have no hero. pdf is optional. Dates use YYYY-MM-DD and sort newest first. excerpt appears on the listing; the article introduction belongs in its Markdown body.

Use ## through ###### for sections/subsections. The build generates heading IDs and contents links, with a sticky desktop rail and current-section marker. Do not maintain a separate contents list. Math renders during the build and code examples remain intact, with optional copy buttons.

Run pnpm build, then pnpm dev to inspect the generated page.
