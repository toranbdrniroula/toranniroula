# Work index entry

Add an object to content/work-index.json and the article to content/work/<slug>.md. The build creates /work/<slug>/ automatically. Metadata paths are relative to the repository root, without ../.

```json
{
  "slug": "your-piece-slug",
  "title": "Your Project Title",
  "category": "research",
  "status": "In Progress",
  "thumbnail": "assets/media/your-piece-thumb.jpg",
  "media_type": "image",
  "media_src": "assets/media/your-piece-hero.png",
  "quick_description": "Optional legacy preview text; not displayed on project pages.",
  "institution": "",
  "date": "2026",
  "featured": false,
  "tags": ["OpenFOAM", "CFD"],
  "supporting_media": ["assets/media/your-piece-supporting.png"],
  "links": [{"label": "Code", "url": "https://github.com/you/your-repo"}]
}
```

- slug matches the Markdown filename and canonical URL.
- title, category, status, and thumbnail identify the direct-link work card.
- media_type supports image, video, and carousel. An animated GIF is an image. Still heroes use their natural aspect ratio on mobile.
- media_src is the local image/video file. Video accepts media_autoplay, media_loop, media_controls and media_fit; its thumbnail supplies the poster.
- For a carousel, set hero_slides to an array of objects with src and caption, with optional hero_interval in milliseconds.
- quick_description is retained for compatibility; it is not article prose. Put the introduction in the Markdown body. No overlay summaries or CV buttons are added to project headers.
- institution, date and tags appear in the header. The home page selects the first eight entries; ordering controls adjacent-project navigation.
- supporting_media renders as a gallery with image enlargement. Matching carousel captions are reused.
- Related work automatically selects up to three other entries in the same category, with thumbnail cards.

Use subject-specific headings from ## through ######. Heading IDs and contents are generated during the build, including a sticky desktop rail and current-section marker. Do not write a separate contents list. Preserve the full scientific narrative.

Scientific viewers show their static reference until successfully rendered, and restore it on failure. Figure images open an enlargement overlay; plain links to original images work without scripts. Charts offer CSV downloads generated from source JSON during the build: do not commit generated CSV files. Scroll-tour distances are relative to the normalized model and adapt to narrow viewports.

Run pnpm build, then pnpm dev to inspect. Existing work has a preservation baseline: review intentional scientific text/media changes and update the baseline explicitly instead of removing the check.
