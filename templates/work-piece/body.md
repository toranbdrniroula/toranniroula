---
title: "Your Piece Title"
date: "2026"
---

<!--
  Everything below is real, working markdown -- copy this whole file to
  content/work/<slug>.md and start deleting the sections you don't need.
  Frontmatter above (title/date) is stripped at render time (the index
  entry already carries both), so it's optional but harmless to keep in
  sync with your work-index.json entry.

  Section headers (## How it was done, ## What was learned, etc.) are a
  convention this site has settled into, not a hard requirement -- marked.js
  renders whatever markdown you write, in any structure. Keep the ones that
  make sense for this piece.
-->

## How it was done

Ordinary markdown works as usual: **bold**, *italic*, `inline code`,
[links](https://example.com), bullet lists, and fenced code blocks all
render normally through marked.js. Inline math like $Re = \rho V L / \mu$
and display math:

$$C_p = 1 - \left(\frac{V}{V_\infty}\right)^2$$

render via KaTeX (already wired up on the case-file page).

**Key parameters** (the site's existing convention for a quick specs
line -- inline code spans, not a table):

`solver`: yourSolverName
`turbulence`: laminar
`Re`: ~ O(10³)
`mesh`: ~500k cells

### Local self-hosted video

```html
<video-embed
  src="https://cdn.jsdelivr.net/gh/you/your-repo@v1/videos/run.mp4"
  poster="assets/media/run-poster.jpg"
  label="Descriptive label for accessibility"
  height="420">
</video-embed>
```

Click-to-play facade, same behavior as the YouTube embed below (no
autoplay, mounts only once scrolled into view). Use this for a self-hosted
`.mp4` instead of `<video-embed>`'s YouTube counterpart when you don't
want it on YouTube at all, or want more control over hosting.

### YouTube video

```html
<yt-embed videoid="https://www.youtube.com/watch?v=XXXXXXXXXXX" label="Descriptive label" height="420"></yt-embed>
```

`videoid` accepts either a bare video ID or a full/short YouTube URL
pasted straight from the browser bar. This is also what a `media_type:
"youtube"` hero on the case-file page renders under the hood, so if
you're only doing one YouTube embed for the whole piece, put it in
`index-entry.md`'s `media_src` instead and skip this in the body.

### Fixed 3D geometry -- STL

```html
<stl-reader
  href="https://cdn.jsdelivr.net/gh/you/your-repo@v1/models/geometry.stl"
  bg-color="#ffffff:#000000"
  surface-color="#4fa3d1"
  auto-rotate="true"
  height="420">
</stl-reader>
```

- `bg-color` can be a single hex color, or `"lightmode:darkmode"` (as
  above) to track the site's theme toggle.
- `surface-color` is the model's material color (STL has no baked color
  data, so this is the only way to set one).
- `auto-rotate` (default true) slowly spins the model when idle; drag to
  rotate manually any time. Respects `prefers-reduced-motion`.
- Reads real geometry via Three.js's `STLLoader`. Works with both ASCII
  and binary STL.

### Fixed 3D geometry -- glTF/GLB (baked vertex colors)

```html
<stl-reader
  href="https://cdn.jsdelivr.net/gh/you/your-repo@v1/models/isosurface.glb"
  bg-color="#ffffff:#000000"
  height="420">
</stl-reader>
```

Same `<stl-reader>` element -- it auto-detects `.glb`/`.gltf` vs `.stl`
from the `href` extension and switches loaders (`GLTFLoader` vs
`STLLoader`) internally. Use this for anything with baked-in vertex
colors and genuinely fixed geometry, e.g. a specific isosurface frozen
and exported once from ParaView. `surface-color` is ignored for
glTF/GLB since the color comes from the file itself. Draco-compressed
files are supported.

### Interactive scalar-field data -- VTK

```html
<vtk-reader
  href="https://cdn.jsdelivr.net/gh/you/your-repo@v1/fields/q-criterion-v1.vtp"
  field="Q"
  colormap="viridis"
  interactive="true"
  clipping="true"
  threshold="true"
  controls="true"
  bg-color="#0a0a0f:#f5f5f0"
  height="480">
</vtk-reader>
```

This is the only embed type that understands the underlying scalar
field, not just baked colors -- use it when you want the reader to be
able to recolor by field, threshold, or clip, rather than just look at a
static shape.

- `href` must point to `.vtp` (PolyData) or `.vtu` (UnstructuredGrid),
  **XML** format exported from ParaView -- not legacy ASCII `.vtk`
  (support for that is inconsistent in vtk.js).
- `field` is the scalar array name to color by initially (matches
  whatever you named it in ParaView/OpenFOAM). If omitted, the reader
  falls back to the first scalar array it finds and shows a dropdown of
  all available fields either way.
- `colormap` — any of vtk.js's standard preset names (`viridis`, `jet`,
  `plasma`, `cool-warm`, etc.); also user-changeable from the on-viewer
  dropdown.
- `interactive` (default true) — orbit/pan controls. Set `"false"` for a
  locked, presentation-only view.
- `clipping` / `threshold` / `controls` — toggle whether those specific
  control-panel affordances are shown at all; each also independently
  user-togglable when `controls="true"`.
- Remember to **version the filename** when you re-export
  (`q-criterion-v2.vtp`, not overwriting `q-criterion-v1.vtp`) — jsDelivr
  caches aggressively.

### Derived 2D/3D chart -- Plotly

```html
<plotly-chart
  href="content/data/your-spectrum.json"
  type="scatter"
  title="POD Mode Energy Spectrum"
  height="360">
</plotly-chart>
```

For small/medium *derived* datasets (POD spectra, force convergence,
Cp/Cf curves) rather than raw CFD meshes -- if under a few hundred KB,
the JSON file can live directly in `content/data/` and be committed
normally instead of going through a GitHub Release. The JSON shape is
native Plotly.js -- copy/paste straight from anything you've already
plotted with Plotly:

```json
{ "data": [ { "x": [...], "y": [...], "type": "scatter" } ], "layout": { "title": "..." } }
```

`type` sets a default trace type (for `scatter`/`scatter3d`/`surface`/
`heatmap`) so a minimal file can omit `"type"` per-trace if every trace
in the file is the same kind.

## What was learned

Prose section, plain markdown.

## What's still open

Prose section, plain markdown.
