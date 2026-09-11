// <plotly-chart href="content/data/spectrum.json" type="scatter" height="360" title="..."></plotly-chart>
//
// Renders a Plotly.js chart from a small JSON file. Matches the site's
// Web Component contract: attributes are the only content-author-facing
// API – this tag can be dropped straight into a content JSON's
// technical_body (rendered through marked.js, which passes unknown tags
// through unescaped) or referenced from a page template, same as
// <yt-embed>/<stl-reader>/<vtk-reader>.
//
// JSON shape expected at `href` (native Plotly.js – copy/paste straight
// from anything you already have plotted with Plotly):
//   { "data": [ {...trace...}, ... ], "layout": { ... } }
// `type` sets a default `type` on any trace that doesn't specify its own
// (so a minimal file can omit it), for scatter/scatter3d/surface/heatmap.
//
// - Only loads the Plotly library once per page, and only if a
//   <plotly-chart> is actually present (matches the "don't load vtk.js on
//   pages with no <vtk-reader>" lazy-load rule for the other readers).
// - IntersectionObserver defers fetch + render until scrolled into view.
// - Re-themes on the site's dark/light toggle (see nav.js) rather than
//   freezing colors at first paint.
// - Fails visibly, not silently, on a bad/missing href.

(function () {
  const PLOTLY_CDN = 'https://cdn.plot.ly/plotly-2.35.2.min.js';
  let plotlyLoadPromise = null;

  function loadPlotly() {
    if (window.Plotly) return Promise.resolve(window.Plotly);
    if (plotlyLoadPromise) return plotlyLoadPromise;
    plotlyLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PLOTLY_CDN;
      script.onload = () => resolve(window.Plotly);
      script.onerror = () => reject(new Error('Failed to load Plotly.js from CDN'));
      document.head.appendChild(script);
    });
    return plotlyLoadPromise;
  }

  function themeColors() {
    const cs = getComputedStyle(document.documentElement);
    return {
      bg: cs.getPropertyValue('--color-bg-elevated').trim() || '#141417',
      text: cs.getPropertyValue('--color-text').trim() || '#F0EFEA',
      textMuted: cs.getPropertyValue('--color-text-muted').trim() || '#8C8C92',
      divider: cs.getPropertyValue('--color-divider').trim() || '#232328',
      accent: cs.getPropertyValue('--color-accent').trim() || '#4FA8FF'
    };
  }

  // Plotly's default title is centered (x: 0.5) and its modebar (the
  // zoom/pan/download icon strip) sits horizontally along the top of the
  // plot by default -- with a centered title and a small top margin those
  // two collide visually, especially at narrow (mobile) widths. Left-
  // aligning the title keeps it clear of the vertical modebar (below) on
  // wide layouts, where there's horizontal room for both at the same
  // height. That assumption breaks on narrow containers: the title text
  // now spans close to the full width at that same height and runs into
  // the modebar column. Below a width threshold, the modebar switches to
  // its compact horizontal form (its own short row right at the top) and
  // the title drops to a distinct row underneath it, rather than sharing
  // a row with it.
  const NARROW_BREAKPOINT = 480;

  function themedTitle(userTitle, isNarrow) {
    const base = typeof userTitle === 'string' ? { text: userTitle } : (userTitle || {});
    return Object.assign(
      {
        x: 0.02, xanchor: 'left',
        y: isNarrow ? 0.88 : 0.97, yanchor: 'top',
        pad: { b: 6 },
        font: { size: isNarrow ? 13 : 15 }
      },
      base
    );
  }

  function themedLayout(userLayout, isNarrow) {
    const c = themeColors();
    const userLayoutSafe = userLayout || {};
    return Object.assign(
      {
        paper_bgcolor: c.bg,
        plot_bgcolor: c.bg,
        font: { color: c.text, family: 'Inter, sans-serif', size: 12 },
        colorway: [c.accent, '#E0A845', '#8C8C92'],
        // Wide: title shares the top margin with the vertical modebar
        // (right-side column), so only a modest top margin + right margin
        // is needed. Narrow: extra top margin makes room for two stacked
        // rows (modebar row, then title row) instead of one.
        margin: isNarrow
          ? { t: 80, r: 20, b: 40, l: 46 }
          : { t: 52, r: 36, b: 40, l: 50 },
        xaxis: { gridcolor: c.divider, zerolinecolor: c.divider, linecolor: c.divider },
        yaxis: { gridcolor: c.divider, zerolinecolor: c.divider, linecolor: c.divider }
      },
      userLayoutSafe,
      {
        // Force these regardless of what the JSON specifies, so the
        // chart always matches the current theme rather than a baked-in
        // light/dark choice from whoever authored the data file.
        paper_bgcolor: c.bg,
        plot_bgcolor: c.bg,
        title: themedTitle(userLayoutSafe.title, isNarrow)
      }
    );
  }

  function themedConfig(isNarrow) {
    return {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'toggleSpikelines'],
      // Vertical column on wide layouts (sits beside the title); the
      // compact horizontal strip on narrow ones (sits above the title).
      modebar: { orientation: isNarrow ? 'h' : 'v' }
    };
  }

  class PlotlyChart extends HTMLElement {
    connectedCallback() {
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
      if (this._themeHandler) document.removeEventListener('site:themechange', this._themeHandler);
      if (this._resizeObserver) this._resizeObserver.disconnect();
    }

    _showMessage(msg) {
      this.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:120px;color:var(--color-text-muted);font-size:13px;text-align:center;padding:16px;">${msg}</div>`;
    }

    async _mount() {
      this._mounted = true;
      const href = this.getAttribute('href');
      const height = this.getAttribute('height') || '360';
      const defaultType = this.getAttribute('type') || 'scatter';

      this.style.display = 'block';
      this.style.width = '100%';
      this.style.height = height + 'px';
      this.style.background = 'var(--color-bg-elevated, #141417)';

      if (!href) {
        this._showMessage('Chart unavailable (missing href).');
        return;
      }

      this._showMessage('Loading chart&hellip;');

      let payload;
      try {
        const res = await fetch(href);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        payload = await res.json();
      } catch (err) {
        console.error('plotly-chart: failed to fetch', href, err);
        this._showMessage("Couldn't load this chart's data.");
        return;
      }

      let Plotly;
      try {
        Plotly = await loadPlotly();
      } catch (err) {
        console.error(err);
        this._showMessage("Couldn't load the charting library.");
        return;
      }

      const traces = (payload.data || []).map(trace => ({ type: defaultType, ...trace }));
      if (!traces.length) {
        this._showMessage('Chart data is empty.');
        return;
      }

      this.innerHTML = '';
      const plotDiv = document.createElement('div');
      plotDiv.style.width = '100%';
      plotDiv.style.height = '100%';
      this.appendChild(plotDiv);

      // Based on this element's own rendered width, not window width --
      // a chart can sit in a narrow column (e.g. a two-column case-file
      // layout) on an otherwise-wide viewport, and vice versa.
      const isNarrow = () => this.clientWidth > 0 && this.clientWidth < NARROW_BREAKPOINT;
      let narrow = isNarrow();

      Plotly.newPlot(plotDiv, traces, themedLayout(payload.layout, narrow), themedConfig(narrow));
      this._plotDiv = plotDiv;
      this._rawLayout = payload.layout;
      this._traces = traces;

      // Plotly.react (not relayout) so config -- specifically
      // modebar.orientation -- can change too, not just layout.
      const rerender = () => {
        if (this._plotDiv && window.Plotly) {
          window.Plotly.react(this._plotDiv, this._traces, themedLayout(this._rawLayout, narrow), themedConfig(narrow));
        }
      };

      // Re-theme when the site's dark/light toggle fires (nav.js dispatches
      // this event; falls back to a no-op if nav.js is absent).
      this._themeHandler = () => rerender();
      document.addEventListener('site:themechange', this._themeHandler);

      // Re-check the narrow breakpoint whenever this element resizes
      // (window resize, orientation change, column reflow, etc.) and only
      // re-render on an actual crossing, not every pixel of resize.
      this._resizeObserver = new ResizeObserver(() => {
        const nowNarrow = isNarrow();
        if (nowNarrow !== narrow) {
          narrow = nowNarrow;
          rerender();
        }
      });
      this._resizeObserver.observe(this);
    }
  }

  customElements.define('plotly-chart', PlotlyChart);
})();