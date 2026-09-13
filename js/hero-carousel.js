// <hero-carousel interval="5000" label="...">
//   <img src="..." alt="..." data-caption="...">
//   <img src="..." alt="..." data-caption="...">
//   ...
// </hero-carousel>
//
// For pieces that have several stills worth showing in the hero slot but no
// video (e.g. a steady-state CFD case: velocity, vorticity, streamlines) --
// an alternative to <video-embed>/<yt-embed>/plain <img> for media_type:
// "carousel" in work-index.json. Light-DOM <img> children are the content
// contract (progressive-enhancement friendly: without JS, or if the element
// fails to upgrade, the images just stack and are all visible/readable).
//
// - Auto-advances every `interval` ms (default 5000), pauses on hover/focus
//   and whenever scrolled out of view (IntersectionObserver, same pattern as
//   video-embed.js), and never auto-advances at all under
//   prefers-reduced-motion -- manual nav (arrows/dots/keyboard) still works.
// - Single-image case degrades to a plain <img>, no chrome.
// - Crossfades between slides (opacity transition) rather than sliding, so
//   mismatched aspect ratios never cause layout jump -- the box's own
//   aspect-ratio is fixed and every slide is `object-fit: cover` (or
//   `contain`, via fit="contain") inside it, same contract as .case-hero
//   elsewhere on the site.
// - Aspect ratio: if the `aspect-ratio` attribute is omitted (the normal
//   case), the box defaults to 16/9 on desktop-width viewports and 4/5 on
//   narrow ones -- a portrait-leaning default so a tall image in "contain"
//   mode fills the screen width on a phone with letterboxing top/bottom,
//   rather than stripes down both sides. Pass an explicit aspect-ratio
//   attribute to opt a piece out of that responsive default and pin one
//   fixed ratio everywhere instead.
// - The slide counter, caption and dots live in a themed footer strip
//   *below* the image (not overlaid on top of it): they're a single set of
//   shared elements that get their text/active-state updated on nav, rather
//   than living inside each fading .hc-slide, so (a) they never overlap the
//   picture and (b) they never show two slides' captions at once mid-fade.
//   The image area is a flex-shrink item above the footer, so on a page
//   that caps this component's total height (case-file.css / lightbox.css
//   both set a max-height on the <hero-carousel> element via a vh unit),
//   the image shrinks to make room for the footer rather than the footer
//   getting pushed out and clipped.

const HERO_CAROUSEL_STYLE_ID = 'hero-carousel-styles';

function ensureHeroCarouselStyles() {
  if (document.getElementById(HERO_CAROUSEL_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = HERO_CAROUSEL_STYLE_ID;
  style.textContent = `
    hero-carousel { display: flex; flex-direction: column; width: 100%; overflow: hidden; }
    .hc-viewport { position: relative; width: 100%; overflow: hidden; background: var(--color-bg-elevated, #141417); outline: none; --hc-aspect-ratio: 16 / 9; aspect-ratio: var(--hc-aspect-ratio); flex: 1 1 auto; min-height: 0; }
    .hc-slide { position: absolute; inset: 0; opacity: 0; transition: opacity 0.7s ease; }
    .hc-slide.hc-active { opacity: 1; }
    .hc-slide img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .hc-viewport.hc-fit-contain { background: #000; }
    .hc-viewport.hc-fit-contain .hc-slide img { object-fit: contain; background: #000; }
    .hc-number { position: absolute; top: 0; left: 0; padding: 8px 12px; font-size: 12px; color: #f2f2f2; text-shadow: 0 1px 3px rgba(0,0,0,0.7); z-index: 1; }
    .hc-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; border: none; border-radius: 50%; background: rgba(10,10,12,0.45); color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s ease; z-index: 1; }
    .hc-arrow:hover, .hc-arrow:focus-visible { background: rgba(10,10,12,0.75); }
    .hc-prev { left: 10px; }
    .hc-next { right: 10px; }

    /* Footer strip: caption + dots, below the image, in the site's normal
       panel colors -- flex: 0 0 auto (see "hero-carousel" above) so it
       always keeps its own space and the image shrinks around it, never
       the other way round. */
    .hc-footer { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px 14px 12px; background: var(--color-bg-elevated, #141417); border-top: 1px solid var(--color-divider, #232328); }
    .hc-caption { margin: 0; font-size: 13px; line-height: 1.4; color: var(--color-text-muted, #8C8C92); text-align: center; }
    .hc-dots { display: flex; justify-content: center; gap: 7px; }
    .hc-dot { width: 8px; height: 8px; padding: 0; border-radius: 50%; border: 1.5px solid var(--color-divider, #232328); background: transparent; cursor: pointer; transition: background 0.2s ease, border-color 0.2s ease; }
    .hc-dot:hover { border-color: var(--color-text-muted, #8C8C92); }
    .hc-dot.hc-active { background: var(--color-accent, #4FA8FF); border-color: var(--color-accent, #4FA8FF); }

    @media (max-width: 640px) {
      .hc-viewport { --hc-aspect-ratio: 4 / 5; }
    }
    @media (prefers-reduced-motion: reduce) {
      .hc-slide { transition: none; }
    }
  `;
  document.head.appendChild(style);
}

class HeroCarousel extends HTMLElement {
  connectedCallback() {
    if (this._mounted) return;
    this._mounted = true;
    ensureHeroCarouselStyles();

    // Capture light-DOM <img> children as the slide data before rebuilding.
    this._slides = Array.from(this.querySelectorAll('img')).map(img => ({
      src: img.getAttribute('src') || '',
      alt: img.getAttribute('alt') || '',
      caption: img.getAttribute('data-caption') || ''
    })).filter(s => s.src);

    this._current = 0;
    this._interval = parseInt(this.getAttribute('interval'), 10) || 5000;
    // Explicit attribute pins one ratio everywhere (inline style always
    // wins over the stylesheet). Omitted -> leave it to the injected
    // stylesheet above, which is responsive (16/9 desktop, 4/5 mobile).
    this._aspectRatio = this.getAttribute('aspect-ratio') || null;
    this._fit = this.getAttribute('fit') === 'contain' ? 'contain' : 'cover';
    this._label = this.getAttribute('label') || 'image carousel';
    this._reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._render();
    this._wireInteraction();
    this._wireVisibilityAwareAutoplay();
  }

  disconnectedCallback() {
    this._stopAutoplay();
    if (this._observer) this._observer.disconnect();
  }

  _render() {
    const arStyle = this._aspectRatio ? `aspect-ratio:${this._aspectRatio};` : '';

    if (!this._slides.length) {
      this.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;${arStyle || 'aspect-ratio:16 / 9;'}color:var(--color-text-muted, #8C8C92);font-size:13px;background:var(--color-bg-elevated,#141417);">
        Carousel unavailable (no images).
      </div>`;
      return;
    }

    if (this._slides.length === 1) {
      const s = this._slides[0];
      const bg = this._fit === 'contain' ? 'background:#000;' : '';
      this.innerHTML = `<img src="${s.src}" alt="${s.alt.replace(/"/g, '&quot;')}" style="width:100%;${arStyle || 'aspect-ratio:16 / 9;'}object-fit:${this._fit};${bg}display:block;">`;
      return;
    }

    const slidesMarkup = this._slides.map((s, i) => `
      <div class="hc-slide${i === 0 ? ' hc-active' : ''}" data-index="${i}">
        <img src="${s.src}" alt="${s.alt.replace(/"/g, '&quot;')}" loading="${i === 0 ? 'eager' : 'lazy'}">
      </div>
    `).join('');

    const dotsMarkup = this._slides.map((_, i) => `
      <button type="button" class="hc-dot${i === 0 ? ' hc-active' : ''}" data-index="${i}" aria-label="Go to image ${i + 1}"></button>
    `).join('');

    // Only reserve a caption line at all if at least one slide actually has
    // one -- otherwise the footer is just the dots, no empty text row.
    const anyCaption = this._slides.some(s => s.caption);
    const captionMarkup = anyCaption
      ? `<p class="hc-caption">${(this._slides[0].caption || '').replace(/</g, '&lt;')}</p>`
      : '';

    this.innerHTML = `
      <div class="hc-viewport${this._fit === 'contain' ? ' hc-fit-contain' : ''}"${arStyle ? ` style="${arStyle}"` : ''} tabindex="0" role="group"
        aria-roledescription="carousel" aria-label="${this._label.replace(/"/g, '&quot;')}">
        ${slidesMarkup}
        <span class="hc-number">1 / ${this._slides.length}</span>
        <button type="button" class="hc-arrow hc-prev" aria-label="Previous image">&#10094;</button>
        <button type="button" class="hc-arrow hc-next" aria-label="Next image">&#10095;</button>
      </div>
      <div class="hc-footer">
        ${captionMarkup}
        <div class="hc-dots">${dotsMarkup}</div>
      </div>
    `;
  }

  _wireInteraction() {
    if (this._slides.length <= 1) return;
    const viewport = this.querySelector('.hc-viewport');

    this.querySelector('.hc-prev').addEventListener('click', () => this._go(this._current - 1, true));
    this.querySelector('.hc-next').addEventListener('click', () => this._go(this._current + 1, true));
    this.querySelectorAll('.hc-dot').forEach(dot => {
      dot.addEventListener('click', () => this._go(parseInt(dot.dataset.index, 10), true));
    });

    viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { this._go(this._current - 1, true); e.preventDefault(); }
      if (e.key === 'ArrowRight') { this._go(this._current + 1, true); e.preventDefault(); }
    });

    // Pause auto-advance on hover/focus anywhere in the component --
    // including the footer now, since the caption someone's reading lives
    // there rather than on top of the image.
    this.addEventListener('mouseenter', () => this._stopAutoplay());
    this.addEventListener('mouseleave', () => this._startAutoplay());
    this.addEventListener('focusin', () => this._stopAutoplay());
    this.addEventListener('focusout', () => this._startAutoplay());
  }

  _wireVisibilityAwareAutoplay() {
    if (this._slides.length <= 1) return;
    this._observer = new IntersectionObserver((entries) => {
      const visible = entries.some(e => e.isIntersecting);
      if (visible) this._startAutoplay();
      else this._stopAutoplay();
    }, { threshold: 0.25 });
    this._observer.observe(this);
  }

  _startAutoplay() {
    if (this._reduceMotion || this._timer) return;
    this._timer = setInterval(() => this._go(this._current + 1, false), this._interval);
  }

  _stopAutoplay() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  _go(index, userInitiated) {
    const n = this._slides.length;
    const next = ((index % n) + n) % n;
    if (next === this._current) return;

    this.querySelector(`.hc-slide[data-index="${this._current}"]`).classList.remove('hc-active');
    this.querySelector(`.hc-dot[data-index="${this._current}"]`).classList.remove('hc-active');
    this.querySelector(`.hc-slide[data-index="${next}"]`).classList.add('hc-active');
    this.querySelector(`.hc-dot[data-index="${next}"]`).classList.add('hc-active');
    this._current = next;

    // Shared, single elements -- updated in place rather than living inside
    // each fading .hc-slide, so nav is instant with no mid-crossfade overlap.
    const numberEl = this.querySelector('.hc-number');
    if (numberEl) numberEl.textContent = `${next + 1} / ${n}`;
    const captionEl = this.querySelector('.hc-caption');
    if (captionEl) captionEl.textContent = this._slides[next].caption || '';

    // A manual nav restarts the autoplay clock so the next auto-advance is
    // a full interval away, rather than firing right after someone clicked.
    if (userInitiated && this._timer) {
      this._stopAutoplay();
      this._startAutoplay();
    }
  }
}

customElements.define('hero-carousel', HeroCarousel);
