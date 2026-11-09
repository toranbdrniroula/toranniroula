# Editing the gallery

The gallery lives at `/gallery.html`. Edit **content/gallery.json**; no layout or JavaScript edits are needed. It has a page title, description, and a `chapters` array. Schlieren is the first published chapter. CFD, Aircraft design, and Flight simulation are prepared as drafts.

## Publish a chapter

1. Finish editing your images and videos outside the website folder.
2. Put only the finished files in a folder such as `assets/media/cfd/` or `assets/media/flight-simulation/`.
3. Add items to that chapter's `items` array using the examples below.
4. Set `"draft": false` on the chapter and the items you want to show.
5. Run `website.cmd preview`, then `website.cmd publish` from the website folder.

`draft: true` hides a chapter or item from the page. A chapter with no published items is also hidden. Drafts can have incomplete metadata and missing media. **Files placed in assets/ are published even when their gallery entry is a draft.** Keep unedited or private material outside assets/ until it is ready.

Lower `order` values appear first. Array order breaks ties. Change a title freely, but keep an existing `id` to preserve shared links such as `/gallery.html#candle`. Use unique lowercase IDs with hyphens across all chapters and items. Add more chapters by copying a draft chapter; the menu, counts and sections update automatically.

## Item examples

Copy these objects into a chapter's `items` array and replace their paths and descriptions. Each example starts as a draft so it does not publish before the media is ready. Paths start at the site root with `/assets/`. Still-image dimensions are read automatically. Each chapter can have one `"featured": true` item for the larger layout; all other items use the regular grid.

### Still image — CFD or aircraft design

```json
{
  "id": "wing-pressure",
  "title": "Wing pressure distribution",
  "type": "image",
  "src": "/assets/media/cfd/wing-pressure.png",
  "description": "Replace with what the result shows, including conditions and units where relevant.",
  "alt": "Replace with a concise description of the figure.",
  "software": "OpenFOAM / ParaView",
  "tags": ["CFD", "Pressure"],
  "order": 10,
  "featured": false,
  "draft": true
}
```

Images retain their aspect ratio and open at full size. `poster` is optional for images: use it for a lighter preview of a large original. `alt` defaults to the description.

### GIF

```json
{
  "id": "wake-animation",
  "title": "Wake evolution",
  "type": "gif",
  "src": "/assets/media/cfd/wake.gif",
  "poster": "/assets/media/cfd/wake-still.jpg",
  "description": "Replace with the flow conditions and what changes during the animation.",
  "draft": true
}
```

GIFs require a still `poster` and load only when played. Their original-file links also work without JavaScript.

### Local MP4 — including X-Plane or FlightGear

```json
{
  "id": "approach-flight",
  "title": "Approach and landing",
  "type": "video",
  "src": "/assets/media/flight-simulation/approach.mp4",
  "poster": "/assets/media/flight-simulation/approach.jpg",
  "description": "Replace with the aircraft, scenario and what the clip demonstrates.",
  "software": "X-Plane",
  "note": "Replace with clip duration or playback notes.",
  "draft": true
}
```

Use MP4 with H.264 video for local clips. Keep these short and reasonably sized. For larger recordings, use Drive or YouTube. FlightGear recordings use the same format with `"software": "FlightGear"`.

### Hosted recording

```json
{
  "id": "full-flight",
  "title": "Full flight simulation",
  "type": "video",
  "poster": "/assets/media/flight-simulation/full-flight.jpg",
  "description": "Replace with the scenario and what the recording demonstrates.",
  "software": "FlightGear",
  "embedURL": "https://www.youtube-nocookie.com/embed/REPLACE_VIDEO_ID",
  "embedLabel": "Watch the full flight",
  "sourceURL": "https://www.youtube.com/watch?v=REPLACE_VIDEO_ID",
  "sourceLabel": "Watch on YouTube",
  "draft": true
}
```

For Drive, use `https://drive.google.com/file/d/FILE_ID/preview` as `embedURL`, the normal `/view` address as `sourceURL`, and enable Anyone with the link → Viewer. For YouTube, use an embeddable public or unlisted recording and its `/embed/VIDEO_ID` URL. `www.youtube.com` and `www.youtube-nocookie.com` players are supported. A `sourceURL` is required with an embed so viewers can open the original if playback fails. Verify public access before publishing; the build validates the URL format, not cloud sharing permissions.

A video item can have both a local `src` preview and an `embedURL` full recording. The hosted player loads only when its disclosure is opened and unloads when closed. Without JavaScript, the original recording link remains available.

## Optional details

All items accept `subject`, `date` (display text), `software`, `tags` (array), `note`, `projectURL`, and `projectLabel`. These appear only when provided. For example, link a CFD result to its detailed work page using `"projectURL": "/work/compressible-wall-jet-rsd/"`.

Each chapter accepts a `description` and optional `context` object with `title`, `text`, `href`, and `label`. Use this for reading notes specific to that chapter; the schlieren explanation belongs only to Schlieren.

Run `website.cmd check` to catch missing assets, invalid media types, duplicate IDs, malformed embed URLs and missing player fallback links before publishing.

## Comparison rows and calibration links

Give exactly two adjacent items the same `comparison` ID to place them side by side in a dedicated row, for example `"comparison": "match-ignition"`. On phones they stack. A comparison item cannot also be `wide` or `featured`. Use `"wide": true` for a larger standalone video. `calibrationImage` adds a small link to a local calibration image beneath a caption. Analysis parameters may be retained in an `analysis` object without appearing in the page captions.

Changed media receive an automatic content version in their rendered URL. Keep editing normal asset paths; new images and videos load immediately without reusing an older browser-cached copy.

## Gallery index and chapter pages

The index at /gallery.html shows chapter covers. Each published chapter has its own /gallery/CHAPTER-ID/ page, with up to 12 media entries per page. Set pageSize in content/gallery.json to change the limit (2 to 48). Comparison pairs stay on one page. New pages, navigation and sitemap entries are generated automatically. Existing /gallery.html#MEDIA-ID links forward to the media's chapter page.

YouTube-only items need type: video, embedURL (the youtube-nocookie.com embed address), sourceURL (the normal watch address), and a poster. You may use a YouTube thumbnail at https://i.ytimg.com/vi/VIDEO-ID/hqdefault.jpg with width: 480 and height: 360. The player loads only after the visitor clicks Play video. Keep local MP4s until their replacement YouTube uploads have been verified; then remove src to use the hosted player. Local poster images remain supported.
