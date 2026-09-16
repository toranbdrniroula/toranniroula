// <video-embed src="..." poster="..." label="..." height="360" fit="cover"
//              autoplay="true" loop="true" controls="false"></video-embed>
//
// Local-file counterpart to <yt-embed>. Same contract, same facade, same
// baseline behavior -- so a self-hosted .mp4 in work-index.json (media_type:
// "video") looks and acts identically to a media_type: "youtube" piece:
//
// - No autoplay by default. Shows the poster image + play affordance; the
//   real <video> element (and the byte range request it brings) is only
//   created after a click/Enter/Space or after the person explicitly flips
//   the Autoplay toggle below -- either way it's a direct user gesture, so
//   this still honors the site's no-autoplaying-motion-by-default rule.
//   Nothing plays on page load, ever, without that explicit action.
// - Setting the autoplay="true" attribute opts THIS instance into playing
//   as soon as it scrolls into view, no click needed -- this is an author
//   decision made per-video, not something the viewer has to discover. It
//   is delivered muted (browsers refuse unmuted autoplay without a user
//   gesture, so muted is the only way this can actually work).
//   loop="true" sets the initial loop state the same way. controls="false"
//   turns off the native seek/pause/volume bar. Any of the three can still
//   be flipped afterwards via the toggle row below.
// - controls="false" + autoplay="true" + loop="true" together make this
//   behave exactly like an animated GIF: plays muted on load, loops
//   forever, no player chrome, nothing for the viewer to interact with
//   except the toggle row (which is the escape hatch back to a normal
//   player if they want one).
// - Uses IntersectionObserver so even the poster doesn't mount until the
//   element scrolls into view.
// - A small always-visible control row offers three independent toggles:
//     Controls -- shows/hides the native <video controls> bar. Turning it
//                 off always mutes (no volume control left to un-mute
//                 with, and a silent loop is the point of "GIF mode").
//     Autoplay -- also doubles as this instance's play/pause switch once
//                 the video exists, so turning it off pauses playback.
//     Loop     -- binds straight to the video's native `loop` property,
//                 applied immediately if the video already exists, or
//                 remembered and applied the moment it's created.
// - Fails visibly (not silently) if no src is given.
// - fit="cover" (default) crops to fill the box, matching every other
//   hero media type; fit="contain" keeps the whole frame intact with
//   black letterbars instead, for footage whose aspect ratio doesn't
//   suit a crop.
// - Sizing: standalone (e.g. inline in an article body) it sizes itself
//   to a 16:9 box capped at the `height` attribute in px. Nested inside a
//   .case-hero using fit="contain", it instead fills 100% of that
//   container's own box -- .case-hero.hero-fit-contain already gives
//   itself a real aspect-ratio-based height (and switches ratio at the
//   mobile breakpoint), so this element imposing its own fixed 16:9 box
//   on top of that was the cause of "contain" mode leaving unfilled
//   space around the video. Default "cover" hero mode keeps the
//   standalone sizing, since .case-hero has no defined height of its own
//   in that mode -- it relies on img/video's intrinsic size the same way
//   a plain <img> would, which this element doesn't have.

class VideoEmbed extends HTMLElement {
  connectedCallback() {
    if (this._mounted) return;
    this._controls = true;
    this._autoplay = false;
    this._loop = false;
    this._forcedMuted = false;
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
  }

  _pillMarkup(toggle, label) {
    return `
      <button type="button" class="ve-toggle" data-toggle="${toggle}" aria-pressed="false"
        style="all:unset;cursor:pointer;font-size:11px;line-height:1;padding:6px 10px;border-radius:999px;
          background:rgba(10,10,12,0.65);border:1px solid rgba(255,255,255,0.25);color:#E5E3DC;
          display:flex;align-items:center;gap:6px;">
        <span class="ve-dot" style="width:6px;height:6px;border-radius:50%;background:#6b6b70;display:inline-block;"></span>
        ${label}
      </button>
    `;
  }

  _toggleBarMarkup() {
    return `
      <div class="video-embed-toggles" style="position:absolute;left:8px;top:8px;display:flex;gap:6px;z-index:2;">
        ${this._pillMarkup('controls', 'Controls')}
        ${this._pillMarkup('autoplay', 'Autoplay')}
        ${this._pillMarkup('loop', 'Loop')}
      </div>
    `;
  }

  _wireToggleBar() {
    this.querySelectorAll('.ve-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const which = btn.getAttribute('data-toggle');
        if (which === 'controls') this._setControls(!this._controls);
        if (which === 'autoplay') this._setAutoplay(!this._autoplay);
        if (which === 'loop') this._setLoop(!this._loop);
      });
    });
    this._syncToggleUI();
  }

  _syncToggleUI() {
    const map = { controls: this._controls, autoplay: this._autoplay, loop: this._loop };
    Object.keys(map).forEach(key => {
      const btn = this.querySelector(`.ve-toggle[data-toggle="${key}"]`);
      if (!btn) return;
      btn.setAttribute('aria-pressed', String(map[key]));
      btn.querySelector('.ve-dot').style.background = map[key] ? 'var(--color-accent, #4FA8FF)' : '#6b6b70';
    });
  }

  _setControls(on) {
    this._controls = on;
    const video = this.querySelector('video');
    if (video) {
      video.controls = on;
      // No controls means no volume slider either -- so turning them off
      // always mutes (this is what makes "GIF mode" silent). Turning
      // controls back on doesn't auto-unmute; the viewer can do that
      // themselves now that the native volume control is visible again.
      if (!on) video.muted = true;
    }
    this._syncToggleUI();
  }

  _setAutoplay(on) {
    this._autoplay = on;
    const video = this.querySelector('video');
    if (video) {
      if (on) video.play().catch(() => {});
      else video.pause();
    } else if (on) {
      // No video yet -- flipping this toggle IS the play action.
      this._loadVideo(this._src, this._label, this._fit);
    }
    this._syncToggleUI();
  }

  _setLoop(on) {
    this._loop = on;
    const video = this.querySelector('video');
    if (video) video.loop = on;
    this._syncToggleUI();
  }

  _mount() {
    this._mounted = true;
    const src = this.getAttribute('src');
    const poster = this.getAttribute('poster') || '';
    const label = this.getAttribute('label') || 'video';
    const height = this.getAttribute('height') || '360';
    const fit = this.getAttribute('fit') === 'contain' ? 'contain' : 'cover';
    const autoplayAttr = this.getAttribute('autoplay') === 'true';
    const loopAttr = this.getAttribute('loop') === 'true';
    const controlsAttr = this.getAttribute('controls') !== 'false';
    this._src = src;
    this._label = label;
    this._fit = fit;
    this._loop = loopAttr;
    this._controls = controlsAttr;

    // Fill the parent when nested in a work-piece hero using "contain" fit
    // (.case-hero.hero-fit-contain gives itself a real aspect-ratio-based
    // height via CSS, so height:100% here has something to resolve
    // against). Default "cover" hero mode does NOT give .case-hero a
    // defined height -- it relies on its media's own intrinsic size,
    // which this custom element doesn't have -- so that path still needs
    // to size itself, same as standalone/inline use below.
    const insideHero = this.closest('.case-hero');
    const fillParent = insideHero && fit === 'contain';

    this.style.display = 'block';
    this.style.position = 'relative';
    this.style.width = '100%';
    if (fillParent) {
      this.style.height = '100%';
      this.style.maxHeight = 'none';
    } else {
      this.style.aspectRatio = '16 / 9';
      this.style.maxHeight = height + 'px';
    }
    this.style.background = fit === 'contain' ? '#000' : 'var(--color-bg-elevated, #141417)';
    this.style.overflow = 'hidden';

    if (!src) {
      this.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted, #8C8C92);font-size:13px;">
        Video unavailable (missing src).
      </div>`;
      return;
    }

    if (autoplayAttr) {
      // Browsers only allow autoplay-without-a-click if the video starts
      // muted -- so an author-requested default autoplay comes in muted,
      // regardless of the controls setting. If controls stay on, the
      // viewer can unmute with one click; if controls are off too, this
      // is "GIF mode" and stays silent by design.
      this._forcedMuted = true;
      this._loadVideo(src, label, fit);
      return;
    }

    const posterAttr = poster ? ` src="${poster}"` : '';

    this.innerHTML = `
      <button type="button" class="video-embed-facade" aria-label="Play video: ${label.replace(/"/g, '&quot;')}"
        style="all:unset;cursor:pointer;display:block;position:relative;width:100%;height:100%;">
        ${poster ? `<img${posterAttr} alt="" loading="lazy" style="width:100%;height:100%;object-fit:${fit};background:${fit === 'contain' ? '#000' : 'transparent'};display:block;"
          onerror="this.style.display='none'">` : ''}
        <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
          <span style="width:56px;height:56px;border-radius:50%;background:rgba(10,10,12,0.65);
            border:1px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;">
            <span style="width:0;height:0;border-top:10px solid transparent;border-bottom:10px solid transparent;
              border-left:16px solid #fff;margin-left:4px;"></span>
          </span>
        </span>
      </button>
      ${this._toggleBarMarkup()}
    `;

    const facade = this.querySelector('.video-embed-facade');
    facade.addEventListener('click', () => this._loadVideo(src, label, fit));
    this._wireToggleBar();
  }

  _loadVideo(src, label, fit) {
    const video = document.createElement('video');
    video.src = src;
    video.setAttribute('aria-label', label);
    video.controls = this._controls;
    video.loop = this._loop;
    // Muted if browser policy requires it for this autoplay to succeed,
    // OR if controls are off (no volume slider available to un-mute with,
    // so a silent loop -- true GIF behavior -- is the only sane default).
    video.muted = this._forcedMuted || !this._controls;
    video.playsInline = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.display = 'block';
    // Browsers default replaced elements like <video> to object-fit: fill
    // (stretch to the box) when nothing else is set -- explicit here so a
    // clip that isn't exactly 16:9 doesn't come out visibly distorted.
    video.style.objectFit = fit;
    video.style.background = fit === 'contain' ? '#000' : 'transparent';
    video.addEventListener('error', () => {
      this.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted, #8C8C92);font-size:13px;">
        Couldn't load this video.
      </div>`;
    });
    this._autoplay = true;
    this.innerHTML = '';
    this.appendChild(video);
    this.insertAdjacentHTML('beforeend', this._toggleBarMarkup());
    this._wireToggleBar();
    video.play().catch(() => {
      // Autoplay-with-sound can still be refused in rare cases (e.g. this
      // was triggered indirectly rather than by a direct click). Reflect
      // that honestly instead of showing an "Autoplay: on" that isn't true.
      this._autoplay = false;
      this._syncToggleUI();
    });
  }
}

customElements.define('video-embed', VideoEmbed);
