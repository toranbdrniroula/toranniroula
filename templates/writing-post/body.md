---
title: "Your Post Title"
date: "2026-07-16"
---

<!--
  Copy this whole file to content/writing/<slug>.md and edit freely.
  Frontmatter above is stripped at render time (the index entry already
  carries title/date) but harmless to keep in sync.

  Writing posts support the exact same embeds as Work case studies --
  <yt-embed>, <video-embed>, <stl-reader>, <vtk-reader>, <plotly-chart> --
  all documented in detail in ../work-piece/body.md, so this file only
  gives the short version of each. Copy the long-form attribute
  explanations from there if you need a refresher.
-->

Ordinary prose, headers, code fences, and inline/display math ($Re$,
$$C_p = 1 - (V/V_\infty)^2$$) all render the same way as in a Work
write-up. Code blocks additionally get syntax highlighting via
highlight.js on this page (not loaded on the Work case-file page).

## Embedding a figure inline

A local video:

```html
<video-embed src="assets/downloads/your-clip.mp4" poster="assets/media/your-clip-poster.jpg" label="What this clip shows" height="400"></video-embed>
```

A YouTube video:

```html
<yt-embed videoid="https://www.youtube.com/watch?v=XXXXXXXXXXX" label="What this video shows" height="400"></yt-embed>
```

A 3D model (STL or glTF/GLB — auto-detected from the file extension):

```html
<stl-reader href="https://cdn.jsdelivr.net/gh/you/your-repo@v1/models/geometry.stl" bg-color="#ffffff:#000000" surface-color="#4fa3d1" height="400"></stl-reader>
```

An interactive scalar field (`.vtp`/`.vtu`, XML format from ParaView):

```html
<vtk-reader href="https://cdn.jsdelivr.net/gh/you/your-repo@v1/fields/your-field-v1.vtp" field="Q" colormap="viridis" height="440"></vtk-reader>
```

A derived chart from a small JSON file:

```html
<plotly-chart href="content/data/your-chart.json" type="scatter" title="Your Chart Title" height="360"></plotly-chart>
```

For the full attribute reference (bg-color theme-pairing syntax, what
`clipping`/`threshold`/`controls` do, the Plotly JSON shape, where large
binary files should actually be hosted) see
`../work-piece/body.md` — every embed behaves identically here.
