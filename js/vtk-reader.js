// <vtk-reader href="..." field="Q" colormap="viridis" interactive="true" clipping="true" controls="true" threshold="true" height="480" bg-color="#0a0a0f"></vtk-reader>
//
// `field`: either a literal array name in the file ("Q", "azimuth",
// "velocity", "U", "P", ...) -- loaded directly, no picker shown -- or the
// sentinel "user-defined" (also the default when the attribute is
// omitted), which adds a Field <select> populated from whatever arrays
// the file actually contains. Same pattern `colormap="user-defined"`
// already used for the colormap picker.
// `controls`: set to "false" to hide the entire bottom panel (pan/reset,
// field picker, legend, threshold, clip row) for a bare viewer. Camera
// drag/zoom is controlled separately by `interactive` and isn't affected.
// `threshold`: set to "false" to hide just the min/max threshold sliders
// while keeping the rest of the panel (field picker, legend, clipping).
//
// Interactive scalar-field viewer – the one reader in the stack that
// understands "the underlying scalar field," not just baked colors (that's
// what <stl-reader>/glTF is for). Reads .vtp (vtkXMLPolyDataReader) today;
// .vtu (UnstructuredGrid) is a planned addition, see note below.
//
// v3 (this version): colormap + clipping fixes/additions on top of v2.
//
// - COLORMAPS ARE NOW SELF-CONTAINED (see CUSTOM_COLORMAPS below). v2 asked
//   vtk.js's own bundled preset registry, by name, for each colormap
//   (`vtkColorMaps.getPresetByName(presetName)`), and only defined that
//   name lookup for 5 of the values this component actually advertised.
//   Two bugs stacked on top of each other:
//     1. "inferno" and "jet" (and anything else not in the old
//        COLORMAP_PRESETS dict) silently fell back to viridis -- no error,
//        no console warning, just the wrong colormap.
//     2. Even the mapped ones ("rainbow" -> "Rainbow Desaturated",
//        "coolwarm" -> "Cool to Warm") depended on that exact string
//        resolving inside whatever vtk.js build happens to be live on the
//        unpkg CDN at load time. If it doesn't resolve, `preset` comes
//        back undefined and the code quietly skips applying a colormap at
//        all -- again with nothing visible to say why.
//   Fixing #1 alone (just adding more dictionary entries) would still
//   leave #2 in place for anyone hitting a future CDN version where a
//   preset name changes. So instead every colormap this component
//   supports is now defined directly, as an explicit RGBPoints control
//   list, in this file -- no registry lookup, no CDN version dependency,
//   nothing to silently miss. "coolwarm"/"rainbow"/"grayscale" below are
//   verbatim reproductions of vtk.js's own "Cool to Warm"/"Rainbow
//   Desaturated"/"Grayscale" presets (pulled from vtk.js's ColorMaps.json
//   directly), so existing markup using those keys renders identically to
//   before -- viridis/plasma/inferno/magma/jet/turbo are added the same
//   way from well-established reference control points.
// - CLIPPING: this version adds an interactive, freely-orientable clip
//   plane (drag the sphere handle to translate; drag the shaft/cylinder
//   itself to rotate -- it's a trackball manipulator underneath, so this
//   is free 3D rotation, not constrained to one ring or axis -- standard
//   vtk.js ImplicitPlaneWidget interaction), toggled from a "Clip" row in
//   the controls. This uses vtk.js's actual GPU clipping
//   (`mapper.addClippingPlane`), not a geometry rebuild, so it stays fast
//   on large meshes. It's independent of the field/threshold controls --
//   it also works on a piece with no scalar fields at all.
//   It's opt-in per instance via `clipping="true"` -- deliberately not
//   tied to `interactive`, since being able to drag the camera around
//   doesn't mean every viewer should also grow a clip-plane row; most
//   pieces probably don't want it, so it stays off unless asked for.
//   v4 addition: vtk.js's default handle size (handleSizeRatio 0.05,
//   axisScale 0.1) is tuned for a mouse on a large desktop viewport, and
//   is genuinely hard to grab in a small embedded viewer, worse on
//   touch/trackpad -- both are scaled up here. On top of that, dragging
//   is inherently imprecise for "put the plane exactly here," so this
//   version also adds X/Y/Z axis-lock buttons (set the normal to a world
//   axis in one click) and numeric origin fields (type an exact
//   coordinate) alongside the draggable widget, rather than instead of it.
//   Not yet built:
//   slicing (extracting a 2D cross-section as its own colored surface, as
//   opposed to just cutting away one side) and streamlines -- deliberately
//   deferred rather than widening scope further in one step.
// - PAN: vtk.js's default trackball camera style binds pan to
//   Shift+Left-drag, which nothing in the UI surfaces, and has no touch
//   handling for it at all -- a real "can't pan" problem on touch/trackpad,
//   not just a discoverability one. A "Pan" toggle button below temporarily
//   detaches vtk.js's own interactor bindings and drives the camera pan
//   directly off pointer events (covering mouse, touch, and pen alike via
//   the Pointer Events API), then reattaches normal rotate/zoom when
//   toggled off.
//
// - Uses the classic UMD build of vtk.js (https://unpkg.com/vtk.js),
//   loaded lazily via a dynamically-injected <script> tag – same
//   lazy-load pattern as the other readers, and matches vtk.js's own
//   documented no-bundler "external script" usage. Exposes a global
//   `vtk` namespace (e.g. vtk.IO.XML.vtkXMLPolyDataReader). Only fetched
//   once a <vtk-reader> actually mounts, and only once per page.
// - IntersectionObserver defers mounting until scrolled into view.
// - Fails visibly (a message in the box, not a blank box) on a bad URL,
//   an unparseable file, or a missing scalar field.
// - No auto-rotation – CFD scalar fields are usually inspected rather
//   than shown off, so this stays still until the user drags.

(function () {
  const VTKJS_CDN = 'https://unpkg.com/vtk.js';
  let vtkLoadPromise = null;

  function loadVtkJs() {
    if (window.vtk) return Promise.resolve(window.vtk);
    if (vtkLoadPromise) return vtkLoadPromise;
    vtkLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = VTKJS_CDN;
      script.onload = () => resolve(window.vtk);
      script.onerror = () => reject(new Error('Failed to load vtk.js from CDN'));
      document.head.appendChild(script);
    });
    return vtkLoadPromise;
  }

  function hexToRgb01(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return null;
    return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
  }

  function parseThemeColorAttr(value, fallbackColor) {
    const raw = String(value || '').trim();
    if (!raw) return { light: fallbackColor, dark: fallbackColor };
    const parts = raw.split(/\s*(?:,|;|:|\u2014|\u2013)\s*/).filter(Boolean);
    if (parts.length >= 2) return { light: parts[0], dark: parts[1] };
    return { light: parts[0], dark: parts[0] };
  }

  function currentThemeName() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function resolveThemeColor(colors) {
    return currentThemeName() === 'light' ? colors.light : colors.dark;
  }

  // Every colormap this component supports, defined by hand as [x, hex]
  // control points (x in 0..1 – matches the domain vtk.js's own presets
  // use, e.g. "Cool to Warm" below is x=[0, 0.5, 1], so setMappingRange
  // rescales these into the actual data range the same way it already did
  // for the presets that came from the CDN registry). See the file-header
  // comment for why these are hand-defined instead of looked up by name.
  //
  // coolwarm/rainbow/grayscale are exact reproductions (RGB floats
  // converted to hex, verified against vtk.js's ColorMaps.json source) of
  // vtk.js's "Cool to Warm"/"Rainbow Desaturated"/"Grayscale" presets, so
  // markup already using those three keys renders unchanged.
  // viridis/plasma/inferno/magma/jet/turbo are standard, widely-published
  // reference control points for those colormaps.
  const CUSTOM_COLORMAPS = {
    viridis: [
      [0.000, '#440154'], [0.111, '#482878'], [0.222, '#3e4989'], [0.333, '#31688e'],
      [0.444, '#26828e'], [0.556, '#1f9e89'], [0.667, '#35b779'], [0.778, '#6ece58'],
      [0.889, '#b5de2b'], [1.000, '#fde725']
    ],
    plasma: [
      [0.000, '#0d0887'], [0.111, '#41049d'], [0.222, '#6a00a8'], [0.333, '#8f0da4'],
      [0.444, '#b12a90'], [0.556, '#cc4778'], [0.667, '#e16462'], [0.778, '#f2844b'],
      [0.889, '#fca636'], [1.000, '#f0f921']
    ],
    inferno: [
      [0.000, '#000004'], [0.111, '#1b0c41'], [0.222, '#4a0c6b'], [0.333, '#781c6d'],
      [0.444, '#a52c60'], [0.556, '#cf4446'], [0.667, '#ed6925'], [0.778, '#fb9a06'],
      [0.889, '#f7d03c'], [1.000, '#fcffa4']
    ],
    magma: [
      [0.000, '#000004'], [0.111, '#1c1044'], [0.222, '#4f127b'], [0.333, '#812581'],
      [0.444, '#b5367a'], [0.556, '#e55064'], [0.667, '#fb8761'], [0.778, '#fec287'],
      [0.889, '#fbfcbf'], [1.000, '#fcfdbf']
    ],
    jet: [
      [0.00, '#00007f'], [0.10, '#0000ff'], [0.35, '#00ffff'], [0.50, '#7fff7f'],
      [0.65, '#ffff00'], [0.90, '#ff0000'], [1.00, '#7f0000']
    ],
    turbo: [
      [0.000, '#30123b'], [0.111, '#4145ab'], [0.222, '#4675ed'], [0.333, '#39a2fc'],
      [0.444, '#1bcfd4'], [0.556, '#24eca6'], [0.667, '#61fc6c'], [0.778, '#a4fc3b'],
      [0.889, '#d1e834'], [1.000, '#7a0403']
    ],
    coolwarm: [
      [0.0, '#3b4cc0'], [0.5, '#dddddd'], [1.0, '#b40426']
    ],
    'warm cold': [
      [0.0, '#3b4cc0'], [0.5, '#dddddd'], [1.0, '#b40426']
    ],
    rainbow: [
      [0.000, '#4747db'], [0.143, '#00005c'], [0.285, '#00ffff'], [0.429, '#008000'],
      [0.571, '#ffff00'], [0.714, '#ff6100'], [0.857, '#6b0000'], [1.000, '#e04d4d']
    ],
    grayscale: [
      [0.0, '#000000'], [1.0, '#ffffff']
    ]
  };

  const COLORMAP_LABELS = {
    viridis: 'Viridis', plasma: 'Plasma', inferno: 'Inferno', magma: 'Magma',
    jet: 'Jet', turbo: 'Turbo', coolwarm: 'Cool to Warm', 'warm cold': 'Warm cold', rainbow: 'Rainbow Desaturated',
    grayscale: 'Grayscale'
  };

  const COLORMAP_CHOICES = [
    'warm cold', 'viridis', 'plasma', 'inferno', 'magma', 'jet', 'turbo', 'coolwarm', 'rainbow', 'grayscale'
  ];

  const COLORMAP_ALIASES = {
    'warm-cold': 'warm cold',
    warmcold: 'warm cold'
  };

  function normalizeColormapKey(colormapKey) {
    const key = String(colormapKey || '').toLowerCase().trim();
    return COLORMAP_ALIASES[key] || key;
  }

  function buildPreset(colormapKey) {
    const normalizedKey = normalizeColormapKey(colormapKey);
    const key = CUSTOM_COLORMAPS[normalizedKey] ? normalizedKey : 'viridis';
    if (!CUSTOM_COLORMAPS[normalizedKey]) {
      console.warn(`vtk-reader: unknown colormap "${colormapKey}"; falling back to viridis. Known colormaps: ${Object.keys(CUSTOM_COLORMAPS).join(', ')}`);
    }
    const stops = CUSTOM_COLORMAPS[key];
    const RGBPoints = [];
    stops.forEach(([x, hex]) => {
      const rgb = hexToRgb01(hex);
      RGBPoints.push(x, rgb[0], rgb[1], rgb[2]);
    });
    return { ColorSpace: 'RGB', Name: COLORMAP_LABELS[key] || key, RGBPoints };
  }

  // Build a CSS gradient string directly from a preset's RGBPoints control
  // list ([x0,r0,g0,b0, x1,r1,g1,b1, ...], x in the preset's own domain,
  // r/g/b in 0..1).
  function presetToCssGradient(preset) {
    if (!preset || !preset.RGBPoints || preset.RGBPoints.length < 8) {
      return 'linear-gradient(to right, #333, #999)';
    }
    const pts = preset.RGBPoints;
    const xs = [];
    for (let i = 0; i < pts.length; i += 4) xs.push(pts[i]);
    const xMin = xs[0];
    const xMax = xs[xs.length - 1];
    const span = (xMax - xMin) || 1;
    const stops = [];
    for (let i = 0; i < pts.length; i += 4) {
      const x = pts[i], r = pts[i + 1], g = pts[i + 2], b = pts[i + 3];
      const pct = ((x - xMin) / span) * 100;
      const rgb = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
      stops.push(`${rgb} ${pct.toFixed(1)}%`);
    }
    return `linear-gradient(to right, ${stops.join(', ')})`;
  }

  // Manual per-cell threshold, operating directly on the legacy VTK cell
  // array format ([n, i0..i(n-1), n, i0..i(n-1), ...]) that vtkCellArray
  // stores. A cell's "value" is the average of its point scalars; a cell
  // is kept if that average falls within [min, max]. Rebuilds the polys
  // array from a saved pristine copy each time, so widening the range
  // after narrowing it never loses geometry.
  //
  // This is done by hand rather than via vtk.js's Threshold filter
  // because that filter's availability/API in the JS port (as opposed to
  // VTK/C++, where it's well documented) couldn't be confirmed reliably;
  // this approach only relies on vtkPolyData/vtkCellArray's core
  // get/setData, which is a stable, foundational part of the API.
  function computeCellStats(cellsArray, scalarValues) {
    const stats = [];
    let i = 0;
    while (i < cellsArray.length) {
      const n = cellsArray[i];
      let sum = 0;
      for (let k = 0; k < n; k++) sum += scalarValues[cellsArray[i + 1 + k]];
      stats.push({ start: i, length: n + 1, avg: sum / n });
      i += n + 1;
    }
    return stats;
  }

  function buildFilteredCells(cellsArray, cellStats, min, max) {
    let totalLen = 0;
    for (const c of cellStats) {
      if (c.avg >= min && c.avg <= max) totalLen += c.length;
    }
    const out = new cellsArray.constructor(totalLen);
    let offset = 0;
    for (const c of cellStats) {
      if (c.avg >= min && c.avg <= max) {
        out.set(cellsArray.subarray(c.start, c.start + c.length), offset);
        offset += c.length;
      }
    }
    return out;
  }

  // vtk.js's vtkXMLPolyDataReader.parseAsText() is a documented, unfixed
  // upstream bug: it's declared in the reader's public interface but
  // isn't actually implemented (github.com/Kitware/vtk-js/issues/2643) --
  // calling it silently does nothing. parseAsArrayBuffer() is the only
  // method that's actually wired up, so text content has to be
  // TextEncoder-encoded into a Uint8Array first, even though the file is
  // plain ascii XML.
  //
  // This fetches the file directly -- no separate file:// code path. A
  // page opened by double-clicking it (file://) can't fetch anything
  // local at all, in this reader or any other on the site; that's a
  // browser security restriction with no in-code workaround, not
  // something specific to this component. Serve the folder with any
  // local static server (e.g. `python3 -m http.server` from the project
  // root, then open http://localhost:8000) to test it exactly as it'll
  // behave once deployed -- fetch() over http://localhost works
  // identically to fetch() over https://, so nothing here needs to
  // change between "running locally" and "live on the web".
  async function loadVtpBytes(href) {
    const res = await fetch(href);
    if (!res.ok) throw new Error('Failed to fetch ' + href);
    const text = await res.text();
    return new TextEncoder().encode(text);
  }

  function formatNum(n) {
    if (Math.abs(n) >= 100 || (Math.abs(n) < 0.01 && n !== 0)) return n.toExponential(2);
    return n.toFixed(3);
  }

  function makeControlButton(label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    Object.assign(btn.style, {
      background: 'transparent', color: 'var(--color-text-muted, #8C8C92)',
      border: '1px solid rgba(255,255,255,0.2)', borderRadius: '3px',
      fontSize: '10px', cursor: 'pointer', padding: '2px 6px'
    });
    return btn;
  }

  class VtkReader extends HTMLElement {
    connectedCallback() {
      this._teardown = () => {};
      if (this._mounted) return;
      this._observer = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) {
          this._observer.disconnect();
          this._mount();
        }
      }, { rootMargin: '200px' });
      this._observer.observe(this);
    }

    disconnectedCallback() {
      if (this._observer) this._observer.disconnect();
      if (this._themeHandler) {
        document.removeEventListener('site:themechange', this._themeHandler);
        this._themeHandler = null;
      }
      this._teardown();
    }

    _showMessage(msg) {
      this.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:120px;color:var(--color-text-muted, #8C8C92);font-size:13px;text-align:center;padding:16px;">${msg}</div>`;
    }

    async _mount() {
      this._mounted = true;
      const href = this.getAttribute('href');
      const height = this.getAttribute('height') || '480';
      // `field` works the same way `colormap` already does: either a
      // literal array name ("Q", "azimuth", "velocity", "U", "P", ...),
      // which is loaded directly with no picker shown, or the sentinel
      // "user-defined" (also the default when the attribute is omitted
      // entirely, matching the old always-show-a-dropdown behavior), which
      // adds the Field <select> so the viewer works with any file
      // regardless of what arrays it happens to contain.
      const fieldAttr = this.getAttribute('field');
      const userDefinedField = !fieldAttr || normalizeColormapKey(fieldAttr) === 'user-defined';
      const requestedField = userDefinedField ? null : fieldAttr;
      const requestedColormap = normalizeColormapKey(this.getAttribute('colormap') || 'viridis');
      const userDefinedColormap = requestedColormap === 'user-defined';
      const initialColormapKey = userDefinedColormap ? 'warm cold' : requestedColormap;
      const interactive = this.getAttribute('interactive') !== 'false';
      // Clipping is opt-in, separate from `interactive`. Being interactive
      // just means the camera can be dragged around – it doesn't imply
      // every viewer should also grow a clip-plane row. A piece has to ask
      // for it explicitly with clipping="true".
      const clippingEnabled = this.getAttribute('clipping') === 'true';
      // `controls="false"` hides the entire bottom panel (pan/reset, field
      // picker, legend, threshold, clip row) for a bare, chrome-free
      // viewer -- independent of `interactive`, so the camera can still be
      // draggable with no UI drawn under it. `threshold="false"` hides
      // only the min/max threshold sliders while leaving everything else
      // (field picker, legend, clipping) intact, for pieces where cutting
      // away geometry by value isn't a meaningful control.
      const showControls = this.getAttribute('controls') !== 'false';
      const showThreshold = this.getAttribute('threshold') !== 'false';

      const resolveBackgroundColor = () => {
        const bgColors = parseThemeColorAttr(
          this.getAttribute('bg-color'),
          getComputedStyle(document.documentElement).getPropertyValue('--color-bg-elevated').trim() || '#0a0a0f'
        );
        return resolveThemeColor(bgColors);
      };
      const bgColorAttr = resolveBackgroundColor();

      this.style.display = 'flex';
      this.style.flexDirection = 'column';
      this.style.width = '100%';
      this.style.height = height + 'px';
      this.style.background = bgColorAttr;
      this.style.position = 'relative';

      if (!href) {
        this._showMessage('Field data unavailable (missing href).');
        return;
      }

      const isVtu = /\.vtu(\?|$)/i.test(href);
      if (isVtu) {
        this._showMessage('.vtu (UnstructuredGrid) support is coming soon – this reader currently handles .vtp.');
        return;
      }

      this._showMessage('Loading field data&hellip;');

      let vtk;
      try {
        vtk = await loadVtkJs();
      } catch (err) {
        console.error('vtk-reader: failed to load vtk.js', err);
        this._showMessage("Couldn't load the field-visualization library (" + (err && err.message ? err.message : 'unknown error') + ').');
        return;
      }

      this.innerHTML = '';
      const canvasHost = document.createElement('div');
      canvasHost.style.flex = '1 1 auto';
      canvasHost.style.minHeight = '0';
      this.appendChild(canvasHost);

      const bgRgb = hexToRgb01(bgColorAttr) || [0.04, 0.04, 0.05];

      const genericRenderWindow = vtk.Rendering.Misc.vtkGenericRenderWindow.newInstance({ background: bgRgb });
      genericRenderWindow.setContainer(canvasHost);
      genericRenderWindow.resize();

      const renderer = genericRenderWindow.getRenderer();
      const renderWindow = genericRenderWindow.getRenderWindow();

      const applyThemeBackground = () => {
        const nextBgColor = resolveBackgroundColor();
        const nextBgRgb = hexToRgb01(nextBgColor) || [0.04, 0.04, 0.05];
        this.style.background = nextBgColor;
        if (typeof renderer.setBackground === 'function') {
          renderer.setBackground(nextBgRgb[0], nextBgRgb[1], nextBgRgb[2]);
        }
        if (typeof genericRenderWindow.setBackground === 'function') {
          genericRenderWindow.setBackground(nextBgRgb[0], nextBgRgb[1], nextBgRgb[2]);
        }
        renderWindow.render();
      };
      this._themeHandler = applyThemeBackground;
      document.addEventListener('site:themechange', this._themeHandler);
      applyThemeBackground();

      if (!interactive) {
        try { genericRenderWindow.getInteractor().unbindEvents(); } catch (e) { /* ignore */ }
      }

      const reader = vtk.IO.XML.vtkXMLPolyDataReader.newInstance();
      let polydata;
      try {
        const bytes = await loadVtpBytes(href);
        reader.parseAsArrayBuffer(bytes);
        polydata = reader.getOutputData(0);
      } catch (err) {
        console.error('vtk-reader: failed to load/parse', href, err);
        this._showMessage("Couldn't load or parse this field data file (" + (err && err.message ? err.message : 'unknown error') + ').');
        return;
      }

      if (!polydata || !polydata.getPoints || polydata.getPoints().getNumberOfPoints() === 0) {
        this._showMessage('Field data file loaded but contains no geometry.');
        return;
      }

      // Everything from here on (mapper/actor setup, colormap lookup,
      // field-switcher/threshold/clip UI, first render) was previously
      // unguarded -- any exception in any of it left the box permanently
      // stuck on "Loading field data..." with nothing but a console.error
      // to explain why, which is very likely what's actually happening.
      // Wrapping it means a real failure now shows up as visible text in
      // the box itself, not silence.
      try {
        const mapper = vtk.Rendering.Core.vtkMapper.newInstance();
        mapper.setInputData(polydata);

        const actor = vtk.Rendering.Core.vtkActor.newInstance();
        actor.setMapper(mapper);
        renderer.addActor(actor);

        const pointData = polydata.getPointData();
        const availableFields = [];
        for (let i = 0; i < pointData.getNumberOfArrays(); i++) {
          availableFields.push(pointData.getArrayName(i));
        }

        // Pristine copy of cell connectivity – every threshold rebuild
        // starts from this, never from a previously-filtered array.
        const originalCells = polydata.getPolys().getData().slice();

        const vtkColorTransferFunction = vtk.Rendering.Core.vtkColorTransferFunction;
        const lookupTable = vtkColorTransferFunction.newInstance();
        let activeColormapKey = initialColormapKey;
        let activePreset = buildPreset(activeColormapKey);

        let legendBar = null;
        let legendMin = null;
        let legendMax = null;
        let fieldSelect = null;
        let colormapSelect = null;
        let initialField = null;
        let clipCheckbox = null;
        let flipBtn = null;
        let xAxisBtn = null;
        let yAxisBtn = null;
        let zAxisBtn = null;
        let oxInput = null;
        let oyInput = null;
        let ozInput = null;
        let widget = null;
        let widgetManager = null;
        let clipPlane = null;
        let widgetSub = null;
        let viewWidget = null;
        let clipPlaneApplied = false;
        let minSlider = null;
        let maxSlider = null;
        let minLabel = null;
        let maxLabel = null;
        let currentRange = [0, 1];
        let currentCellStats = null;

        const syncPresetUi = () => {
          if (legendBar) legendBar.style.background = presetToCssGradient(activePreset);
          if (legendMin) legendMin.textContent = formatNum(currentRange[0]);
          if (legendMax) legendMax.textContent = formatNum(currentRange[1]);
        };

        const applyActiveColormap = () => {
          if (activePreset) lookupTable.applyColorMap(activePreset);
          lookupTable.setMappingRange(currentRange[0], currentRange[1]);
          lookupTable.updateRange();
          mapper.setLookupTable(lookupTable);
          syncPresetUi();
          renderWindow.render();
        };

        const restoreInitialFieldState = () => {
          if (fieldSelect) fieldSelect.value = initialField;
          applyField(initialField);
          if (userDefinedColormap && colormapSelect) {
            activeColormapKey = initialColormapKey;
            activePreset = buildPreset(activeColormapKey);
            colormapSelect.value = activeColormapKey;
            applyActiveColormap();
          }
          if (minSlider) minSlider.value = 0;
          if (maxSlider) maxSlider.value = 1000;
          if (clipCheckbox) clipCheckbox.checked = false;
          mapper.removeAllClippingPlanes();
          if (widgetManager) {
            widgetManager.disablePicking();
            try { widgetManager.removeWidget(widget); } catch (e) { /* ignore */ }
          }
          if (viewWidget && typeof viewWidget.setVisibility === 'function') {
            viewWidget.setVisibility(false);
          }
          viewWidget = null;
          clipPlaneApplied = false;
          if (flipBtn) flipBtn.disabled = true;
          [xAxisBtn, yAxisBtn, zAxisBtn, oxInput, oyInput, ozInput].forEach((el) => { if (el) el.disabled = true; });
        };

        const applyField = (name) => {
          const array = pointData.getArrayByName(name);
          const range = array.getRange();
          currentRange = range;
          mapper.setColorByArrayName(name);
          mapper.setScalarModeToUsePointFieldData();
          mapper.setColorModeToMapScalars();
          mapper.setScalarVisibility(true);

          currentCellStats = computeCellStats(originalCells, array.getData());
          // Reset threshold to the full range whenever the field changes –
          // a previous field's min/max wouldn't mean anything for this one.
          polydata.getPolys().setData(originalCells);
          polydata.modified();

          if (minSlider) minSlider.value = 0;
          if (maxSlider) maxSlider.value = 1000;
          if (minLabel) minLabel.textContent = formatNum(range[0]);
          if (maxLabel) maxLabel.textContent = formatNum(range[1]);

          applyActiveColormap();
        };

        const sliderToValue = (sliderVal) => currentRange[0] + (sliderVal / 1000) * (currentRange[1] - currentRange[0]);

        let rafPending = false;
        const applyThresholdFromSliders = () => {
          if (rafPending) return;
          rafPending = true;
          requestAnimationFrame(() => {
            rafPending = false;
            const minV = sliderToValue(Number(minSlider.value));
            const maxV = sliderToValue(Number(maxSlider.value));
            const lo = Math.min(minV, maxV);
            const hi = Math.max(minV, maxV);
            if (minLabel) minLabel.textContent = formatNum(lo);
            if (maxLabel) maxLabel.textContent = formatNum(hi);
            const filtered = buildFilteredCells(originalCells, currentCellStats, lo, hi);
            polydata.getPolys().setData(filtered);
            polydata.modified();
            renderWindow.render();
          });
        };

        // Controls host is always created (clipping needs a place to live
        // even on a piece with no scalar fields to switch/threshold).
        const controlsHost = document.createElement('div');
        Object.assign(controlsHost.style, {
          flex: '0 0 auto', background: 'rgba(0,0,0,0.25)',
          borderTop: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px',
          fontSize: '11px', color: 'var(--color-text-muted, #8C8C92)',
          display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'inherit'
        });

        // --- Pan + reset view: general camera controls, independent of
        // clipping/fields, only offered when the camera is actually
        // draggable at all. See file-header comment for why a toggle
        // button rather than a modifier key is used.
        let panTeardown = () => {};
        if (interactive) {
          const viewRow = document.createElement('div');
          Object.assign(viewRow.style, { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' });

          const panBtn = makeControlButton('Pan');
          const resetViewBtn = makeControlButton('Reset view');
          const panHint = document.createElement('span');
          panHint.textContent = 'drag to rotate · scroll to zoom';
          Object.assign(panHint.style, { opacity: '0.7', fontSize: '10px' });

          viewRow.appendChild(panBtn);
          viewRow.appendChild(resetViewBtn);
          viewRow.appendChild(panHint);
          controlsHost.appendChild(viewRow);

          const interactor = genericRenderWindow.getInteractor();
          const setPanBtnActiveStyle = (active) => {
            panBtn.style.background = active ? 'var(--color-accent, #4FA8FF)' : 'transparent';
            panBtn.style.color = active ? '#0A0A0C' : 'var(--color-text-muted, #8C8C92)';
            panBtn.style.borderColor = active ? 'var(--color-accent, #4FA8FF)' : 'rgba(255,255,255,0.2)';
            panHint.textContent = active ? 'drag to pan' : 'drag to rotate · scroll to zoom';
          };

          // Same display-coordinate conversion vtk.js's own interactor uses
          // internally (canvas-pixel space, Y flipped) -- reproduced here
          // because that conversion lives on the interactor, not something
          // we can call without going through its own (unbound) event path.
          const toVtkDisplay = (canvas, clientX, clientY) => {
            const b = canvas.getBoundingClientRect();
            const scaleX = canvas.width / b.width;
            const scaleY = canvas.height / b.height;
            return { x: scaleX * (clientX - b.left), y: scaleY * (b.height - clientY + b.top) };
          };

          const panCameraBy = (fromClient, toClient) => {
            const canvas = canvasHost.querySelector('canvas');
            if (!canvas) return;
            const style = interactor.getInteractorStyle();
            const camera = renderer.getActiveCamera();
            const focal = camera.getFocalPoint();
            const focalDisplay = style.computeWorldToDisplay(renderer, focal[0], focal[1], focal[2]);
            const focalDepth = focalDisplay[2];
            const a = toVtkDisplay(canvas, fromClient.x, fromClient.y);
            const b = toVtkDisplay(canvas, toClient.x, toClient.y);
            const oldWorld = style.computeDisplayToWorld(renderer, a.x, a.y, focalDepth);
            const newWorld = style.computeDisplayToWorld(renderer, b.x, b.y, focalDepth);
            const dx = oldWorld[0] - newWorld[0];
            const dy = oldWorld[1] - newWorld[1];
            const dz = oldWorld[2] - newWorld[2];
            const pos = camera.getPosition();
            camera.setFocalPoint(focal[0] + dx, focal[1] + dy, focal[2] + dz);
            camera.setPosition(pos[0] + dx, pos[1] + dy, pos[2] + dz);
            renderWindow.render();
          };

          let panPointerId = null;
          let panLast = null;
          const onPanPointerDown = (e) => {
            if (typeof e.button === 'number' && e.button !== 0) return;
            panPointerId = e.pointerId;
            panLast = { x: e.clientX, y: e.clientY };
            try { canvasHost.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            e.preventDefault();
          };
          const onPanPointerMove = (e) => {
            if (panPointerId === null || e.pointerId !== panPointerId) return;
            const cur = { x: e.clientX, y: e.clientY };
            panCameraBy(panLast, cur);
            panLast = cur;
            e.preventDefault();
          };
          const onPanPointerUp = (e) => {
            if (e.pointerId !== panPointerId) return;
            try { canvasHost.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            panPointerId = null;
            panLast = null;
          };

          let panActive = false;
          const setPanActive = (active) => {
            panActive = active;
            setPanBtnActiveStyle(active);
            if (active) {
              // Detach vtk.js's own rotate/zoom bindings so a plain
              // left-drag doesn't also spin the camera while panning --
              // reattached the moment pan mode is switched off.
              try { interactor.unbindEvents(); } catch (err) { /* ignore */ }
              canvasHost.style.touchAction = 'none';
              canvasHost.addEventListener('pointerdown', onPanPointerDown);
              canvasHost.addEventListener('pointermove', onPanPointerMove);
              canvasHost.addEventListener('pointerup', onPanPointerUp);
              canvasHost.addEventListener('pointercancel', onPanPointerUp);
            } else {
              canvasHost.removeEventListener('pointerdown', onPanPointerDown);
              canvasHost.removeEventListener('pointermove', onPanPointerMove);
              canvasHost.removeEventListener('pointerup', onPanPointerUp);
              canvasHost.removeEventListener('pointercancel', onPanPointerUp);
              try { interactor.bindEvents(canvasHost); } catch (err) { /* ignore */ }
            }
          };

          panBtn.addEventListener('click', () => setPanActive(!panActive));
          resetViewBtn.addEventListener('click', () => {
            setPanActive(false);
            restoreInitialFieldState();
            renderer.resetCamera();
            renderer.resetCameraClippingRange();
            renderWindow.render();
          });

          panTeardown = () => {
            if (panActive) setPanActive(false);
          };
        }

        if (availableFields.length > 0) {
          // Only build the picker in user-defined mode. When `field` names
          // a specific array ("Q", "azimuth", "velocity", "U", "P", ...)
          // that array is simply loaded below (see initialField), with no
          // dropdown cluttering the panel -- the author already decided
          // what this viewer shows.
          if (userDefinedField) {
            const fieldRow = document.createElement('div');
            Object.assign(fieldRow.style, { display: 'flex', alignItems: 'center', gap: '6px' });
            const fieldLabel = document.createElement('span');
            fieldLabel.textContent = 'Field';
            fieldSelect = document.createElement('select');
            Object.assign(fieldSelect.style, {
              background: 'var(--color-bg-elevated, #141417)', color: 'var(--color-text, #F0EFEA)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '3px',
              fontSize: '11px', padding: '2px 4px'
            });
            fieldSelect.style.colorScheme = currentThemeName();
            availableFields.forEach((name) => {
              const opt = document.createElement('option');
              opt.value = name;
              opt.textContent = name;
              opt.style.background = bgColorAttr;
              opt.style.color = 'var(--color-text, #F0EFEA)';
              fieldSelect.appendChild(opt);
            });
            fieldRow.appendChild(fieldLabel);
            fieldRow.appendChild(fieldSelect);
            controlsHost.appendChild(fieldRow);
          }

          if (userDefinedColormap) {
            const colormapRow = document.createElement('div');
            Object.assign(colormapRow.style, { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' });
            const colormapLabel = document.createElement('span');
            colormapLabel.textContent = 'Colormap';
            colormapSelect = document.createElement('select');
            Object.assign(colormapSelect.style, {
              background: 'var(--color-bg-elevated, #141417)', color: 'var(--color-text, #F0EFEA)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '3px',
              fontSize: '11px', padding: '2px 4px'
            });
            colormapSelect.style.colorScheme = currentThemeName();
            COLORMAP_CHOICES.forEach((name) => {
              const opt = document.createElement('option');
              opt.value = name;
              opt.textContent = COLORMAP_LABELS[name] || name;
              opt.style.background = bgColorAttr;
              opt.style.color = 'var(--color-text, #F0EFEA)';
              colormapSelect.appendChild(opt);
            });
            colormapSelect.value = activeColormapKey;
            colormapSelect.addEventListener('change', () => {
              activeColormapKey = normalizeColormapKey(colormapSelect.value);
              activePreset = buildPreset(activeColormapKey);
              applyActiveColormap();
            });
            colormapRow.appendChild(colormapLabel);
            colormapRow.appendChild(colormapSelect);
            controlsHost.appendChild(colormapRow);
          }

          const legendRow = document.createElement('div');
          Object.assign(legendRow.style, { display: 'flex', alignItems: 'center', gap: '6px' });
          legendMin = document.createElement('span');
          legendMax = document.createElement('span');
          legendBar = document.createElement('div');
          Object.assign(legendBar.style, { flex: '1', height: '8px', borderRadius: '4px' });
          legendRow.appendChild(legendMin);
          legendRow.appendChild(legendBar);
          legendRow.appendChild(legendMax);
          controlsHost.appendChild(legendRow);

          if (showThreshold) {
            const threshRow = document.createElement('div');
            Object.assign(threshRow.style, { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', rowGap: '6px' });
            const threshLabel = document.createElement('span');
            threshLabel.textContent = 'Threshold';
            minLabel = document.createElement('span');
            minLabel.style.minWidth = '48px';
            minSlider = document.createElement('input');
            minSlider.type = 'range';
            minSlider.min = 0; minSlider.max = 1000; minSlider.value = 0;
            Object.assign(minSlider.style, { flex: '1 1 60px', minWidth: '0' });
            maxLabel = document.createElement('span');
            maxLabel.style.minWidth = '48px';
            maxSlider = document.createElement('input');
            maxSlider.type = 'range';
            maxSlider.min = 0; maxSlider.max = 1000; maxSlider.value = 1000;
            Object.assign(maxSlider.style, { flex: '1 1 60px', minWidth: '0' });
            threshRow.appendChild(threshLabel);
            threshRow.appendChild(minLabel);
            threshRow.appendChild(minSlider);
            threshRow.appendChild(maxSlider);
            threshRow.appendChild(maxLabel);
            controlsHost.appendChild(threshRow);

            minSlider.addEventListener('input', applyThresholdFromSliders);
            maxSlider.addEventListener('input', applyThresholdFromSliders);
          }

          if (fieldSelect) fieldSelect.addEventListener('change', () => applyField(fieldSelect.value));

          initialField = (requestedField && availableFields.includes(requestedField))
            ? requestedField
            : availableFields[0];
          if (requestedField && initialField !== requestedField) {
            console.warn(`vtk-reader: field "${requestedField}" not found in ${href}; using "${initialField}" instead. Available fields: ${availableFields.join(', ')}`);
          }
          if (fieldSelect) fieldSelect.value = initialField;
          applyField(initialField);
        } else {
          mapper.setScalarVisibility(false);
          actor.getProperty().setColor(0.31, 0.64, 0.82);
        }

        // --- Clipping: an interactive, freely-orientable clip plane ---
        // Independent of the field/threshold controls above (works on
        // pieces with no scalar fields at all). Only offered when the
        // viewer is interactive -- a draggable widget makes no sense on a
        // view whose interactor is unbound. The widget itself is created
        // lazily, the first time clipping is switched on, rather than at
        // mount, so a piece that never turns clipping on never pays for it.
        let clipTeardown = () => {};
        if (interactive && clippingEnabled) {
          const clipRow = document.createElement('div');
          Object.assign(clipRow.style, { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', rowGap: '6px' });

          const clipLabel = document.createElement('label');
          Object.assign(clipLabel.style, { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' });
          clipCheckbox = document.createElement('input');
          clipCheckbox.type = 'checkbox';
          const clipLabelText = document.createElement('span');
          clipLabelText.textContent = 'Show clip plane';
          clipLabel.appendChild(clipCheckbox);
          clipLabel.appendChild(clipLabelText);

          const clipHint = document.createElement('span');
          clipHint.textContent = 'drag sphere to move, drag shaft to rotate freely';
          Object.assign(clipHint.style, { opacity: '0.7', fontSize: '10px' });

          flipBtn = makeControlButton('Flip');
          flipBtn.disabled = true;

          clipRow.appendChild(clipLabel);
          clipRow.appendChild(flipBtn);
          clipRow.appendChild(clipHint);
          controlsHost.appendChild(clipRow);

          // Precision controls: dragging the widget is imprecise by
          // nature, so these give an exact alternative -- axis-lock
          // buttons set the normal to a world axis in one click, and the
          // numeric fields let an exact origin be typed in directly.
          // Both stay in sync with the draggable widget in both
          // directions (dragging updates these fields; typing in these
          // fields moves the widget).
          const axisRow = document.createElement('div');
          Object.assign(axisRow.style, { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' });
          const axisLabel = document.createElement('span');
          axisLabel.textContent = 'Normal';
          xAxisBtn = makeControlButton('X');
          yAxisBtn = makeControlButton('Y');
          zAxisBtn = makeControlButton('Z');
          [xAxisBtn, yAxisBtn, zAxisBtn].forEach((b) => { b.disabled = true; });
          axisRow.appendChild(axisLabel);
          axisRow.appendChild(xAxisBtn);
          axisRow.appendChild(yAxisBtn);
          axisRow.appendChild(zAxisBtn);
          controlsHost.appendChild(axisRow);

          const originRow = document.createElement('div');
          Object.assign(originRow.style, { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' });
          const originLabel = document.createElement('span');
          originLabel.textContent = 'Origin';
          const makeOriginInput = () => {
            const inp = document.createElement('input');
            inp.type = 'number';
            inp.step = 'any';
            inp.disabled = true;
            Object.assign(inp.style, {
              width: '68px', background: 'var(--color-bg-elevated, #141417)', color: 'var(--color-text, #F0EFEA)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '3px',
              fontSize: '10px', padding: '2px 4px'
            });
            inp.style.colorScheme = currentThemeName();
            return inp;
          };
          oxInput = makeOriginInput();
          oyInput = makeOriginInput();
          ozInput = makeOriginInput();
          originRow.appendChild(originLabel);
          originRow.appendChild(oxInput);
          originRow.appendChild(oyInput);
          originRow.appendChild(ozInput);
          controlsHost.appendChild(originRow);

          const defaultPlaneState = () => {
            const bounds = actor.getBounds();
            const center = [
              (bounds[0] + bounds[1]) / 2,
              (bounds[2] + bounds[3]) / 2,
              (bounds[4] + bounds[5]) / 2
            ];
            return { bounds, center };
          };

          const syncPlaneFromWidget = () => {
            const state = widget.getWidgetState();
            const origin = state.getOrigin();
            clipPlane.setNormal(state.getNormal());
            clipPlane.setOrigin(origin);
            renderWindow.render();
            // Reflect the widget's live state in the numeric fields too,
            // so dragging the handle updates the numbers -- but don't
            // stomp on a field the person is actively typing into.
            if (document.activeElement !== oxInput) oxInput.value = origin[0].toFixed(4);
            if (document.activeElement !== oyInput) oyInput.value = origin[1].toFixed(4);
            if (document.activeElement !== ozInput) ozInput.value = origin[2].toFixed(4);
          };
          const ensureWidget = () => {
            if (widget) return;
            const { bounds, center } = defaultPlaneState();
            widget = vtk.Widgets.Widgets3D.vtkImplicitPlaneWidget.newInstance();
            widget.placeWidget(bounds);
            widget.getWidgetState().setOrigin(center);
            widget.getWidgetState().setNormal(1, 0, 0);
            oxInput.value = center[0].toFixed(4);
            oyInput.value = center[1].toFixed(4);
            ozInput.value = center[2].toFixed(4);

            widgetManager = vtk.Widgets.Core.vtkWidgetManager.newInstance();
            widgetManager.setRenderer(renderer);
            // handleSizeRatio/axisScale aren't on `widget` itself -- vtk.js
            // only forwards them onto the per-view instance addWidget()
            // returns (built internally via widget.getWidgetForView), so
            // they have to be set on that, after this call, not before it.
            viewWidget = widgetManager.addWidget(widget);
            if (viewWidget) {
              // vtk.js defaults (handleSizeRatio 0.05, axisScale 0.1) are
              // tuned for a mouse on a large desktop viewport -- scaled up
              // here so the sphere and rotation shaft are actually easy to
              // grab in a small embedded viewer, on touch/trackpad too.
              if (typeof viewWidget.setHandleSizeRatio === 'function') viewWidget.setHandleSizeRatio(0.11);
              if (typeof viewWidget.setAxisScale === 'function') viewWidget.setAxisScale(0.22);
            }

            clipPlane = vtk.Common.DataModel.vtkPlane.newInstance({
              normal: widget.getWidgetState().getNormal(),
              origin: widget.getWidgetState().getOrigin()
            });

            widgetSub = widget.getWidgetState().onModified(syncPlaneFromWidget);
          };

          const setClippingEnabled = (enabled) => {
            clipCheckbox.checked = enabled;
            try {
              if (enabled) {
                ensureWidget();
                if (widget && widgetManager && !viewWidget) {
                  viewWidget = widgetManager.addWidget(widget);
                  if (viewWidget) {
                    if (typeof viewWidget.setHandleSizeRatio === 'function') viewWidget.setHandleSizeRatio(0.11);
                    if (typeof viewWidget.setAxisScale === 'function') viewWidget.setAxisScale(0.22);
                  }
                }
                widgetManager.enablePicking();
                if (viewWidget && typeof viewWidget.setVisibility === 'function') {
                  viewWidget.setVisibility(true);
                }
                if (!clipPlaneApplied) {
                  mapper.addClippingPlane(clipPlane);
                  clipPlaneApplied = true;
                }
                flipBtn.disabled = false;
                [xAxisBtn, yAxisBtn, zAxisBtn, oxInput, oyInput, ozInput].forEach((el) => { el.disabled = false; });
              } else {
                if (widgetManager) {
                  widgetManager.disablePicking();
                  if (viewWidget && typeof viewWidget.setVisibility === 'function') {
                    viewWidget.setVisibility(false);
                  } else if (widgetManager && widget) {
                    widgetManager.removeWidget(widget);
                    viewWidget = null;
                  }
                }
              }
              renderWindow.render();
            } catch (err) {
              console.error('vtk-reader: clipping plane failed', err);
              clipHint.textContent = "Clipping isn't available in this browser/session (" + (err && err.message ? err.message : err) + ')';
              clipCheckbox.checked = false;
              clipCheckbox.disabled = true;
            }
          };

          clipCheckbox.addEventListener('change', () => {
            setClippingEnabled(clipCheckbox.checked);
          });

          flipBtn.addEventListener('click', () => {
            if (!widget) return;
            const n = widget.getWidgetState().getNormal();
            widget.getWidgetState().setNormal(-n[0], -n[1], -n[2]);
            syncPlaneFromWidget();
          });

          xAxisBtn.addEventListener('click', () => {
            if (!widget) return;
            widget.getWidgetState().setNormal(1, 0, 0);
            syncPlaneFromWidget();
          });
          yAxisBtn.addEventListener('click', () => {
            if (!widget) return;
            widget.getWidgetState().setNormal(0, 1, 0);
            syncPlaneFromWidget();
          });
          zAxisBtn.addEventListener('click', () => {
            if (!widget) return;
            widget.getWidgetState().setNormal(0, 0, 1);
            syncPlaneFromWidget();
          });

          const commitOriginInputs = () => {
            if (!widget) return;
            const ox = parseFloat(oxInput.value);
            const oy = parseFloat(oyInput.value);
            const oz = parseFloat(ozInput.value);
            if ([ox, oy, oz].some((v) => Number.isNaN(v))) return;
            widget.getWidgetState().setOrigin(ox, oy, oz);
            syncPlaneFromWidget();
          };
          oxInput.addEventListener('change', commitOriginInputs);
          oyInput.addEventListener('change', commitOriginInputs);
          ozInput.addEventListener('change', commitOriginInputs);

          clipTeardown = () => {
            try { if (widgetSub) widgetSub.unsubscribe(); } catch (e) { /* ignore */ }
            try { if (widgetManager) widgetManager.delete(); } catch (e) { /* ignore */ }
            try { if (widget) widget.delete(); } catch (e) { /* ignore */ }
          };

        }

        // Built either way (clipping/threshold/etc. logic above all reads
        // and writes through it regardless), just not shown -- so
        // controls="false" gives a bare, chrome-free viewer while leaving
        // camera interactivity (drag/zoom, governed separately by
        // `interactive`) untouched.
        if (!showControls) controlsHost.style.display = 'none';
        this.appendChild(controlsHost);

        renderer.resetCamera();
        renderWindow.render();

        const resizeObserver = new ResizeObserver(() => {
          genericRenderWindow.resize();
        });
        resizeObserver.observe(canvasHost);

        this._teardown = () => {
          resizeObserver.disconnect();
          clipTeardown();
          panTeardown();
          try { genericRenderWindow.getInteractor().unbindEvents(); } catch (e) { /* ignore */ }
          [actor, mapper, reader, genericRenderWindow].forEach((obj) => {
            if (obj && typeof obj.delete === 'function') {
              try { obj.delete(); } catch (e) { /* ignore */ }
            }
          });
        };
      } catch (err) {
        console.error('vtk-reader: failed while setting up the viewer', href, err);
        this._showMessage('Field viewer failed to initialize: ' + (err && err.message ? err.message : err));
      }
    }
  }

  customElements.define('vtk-reader', VtkReader);
})();
