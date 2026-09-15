// <video-embed src="..." poster="..." label="..." height="360" fit="cover"></video-embed>
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
// - Uses IntersectionObserver so even the poster doesn't mount until the
//   element scrolls into view.
// - A small always-visible control row offers two independent toggles:
//     Autoplay -- also doubles as this instance's play/pause switch once
//                 the video exists, so turning it off pauses playback.
//     Loop     -- binds straight to the video's native `loop` property,
//                 applied immediately if the video already exists, or
//                 remembered and applied the moment it's created.
// - Once played, uses native <video controls> -- same player chrome as
//   clicking through to YouTube's own embed.
// - Fails visibly (not silently) if no src is given.
// - fit="cover" (default) crops to fill the box, matching every other
//   hero media type; fit="contain" keeps the whole frame intact with
//   black letterbars instead, for footage whose aspect ratio doesn't
//   suit a crop.

class VideoEmbed extends HTMLElement {
  connectedCallback() {
    if (this._mounted) return;
    this._autoplay = false;
    this._loop = false;
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

  _toggleBarMarkup() {
    return `
      <div class="video-embed-toggles" style="position:absolute;left:8px;top:8px;display:flex;gap:6px;z-index:2;">
        <button type="button" class="ve-toggle" data-toggle="autoplay" aria-pressed="false"
          style="all:unset;cursor:pointer;font-size:11px;line-height:1;padding:6px 10px;border-radius:999px;
            background:rgba(10,10,12,0.65);border:1px solid rgba(255,255,255,0.25);color:#E5E3DC;
            display:flex;align-items:center;gap:6px;">
          <span class="ve-dot" style="width:6px;height:6px;border-radius:50%;background:#6b6b70;display:inline-block;"></span>
          Autoplay
        </button>
        <button type="button" class="ve-toggle" data-toggle="loop" aria-pressed="false"
          style="all:unset;cursor:pointer;font-size:11px;line-height:1;padding:6px 10px;border-radius:999px;
            background:rgba(10,10,12,0.65);border:1px solid rgba(255,255,255,0.25);color:#E5E3DC;
            display:flex;align-items:center;gap:6px;">
          <span class="ve-dot" style="width:6px;height:6px;border-radius:50%;background:#6b6b70;display:inline-block;"></span>
          Loop
        </button>
      </div>
    `;
  }

  _wireToggleBar() {
    this.querySelectorAll('.ve-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const which = btn.getAttribute('data-toggle');
        if (which === 'autoplay') this._setAutoplay(!this._autoplay);
        if (which === 'loop') this._setLoop(!this._loop);
      });
    });
    this._syncToggleUI();
  }

  _syncToggleUI() {
    const ap = this.querySelector('.ve-toggle[data-toggle="autoplay"]');
    const lp = this.querySelector('.ve-toggle[data-toggle="loop"]');
    if (ap) {
      ap.setAttribute('aria-pressed', String(this._autoplay));
      ap.querySelector('.ve-dot').style.background = this._autoplay ? 'var(--color-accent, #4FA8FF)' : '#6b6b70';
    }
    if (lp) {
      lp.setAttribute('aria-pressed', String(this._loop));
      lp.querySelector('.ve-dot').style.background = this._loop ? 'var(--color-accent, #4FA8FF)' : '#6b6b70';
    }
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
    this._src = src;
    this._label = label;
    this._fit = fit;

    this.style.display = 'block';
    this.style.position = 'relative';
    this.style.width = '100%';
    this.style.aspectRatio = '16 / 9';
    this.style.maxHeight = height + 'px';
    this.style.background = fit === 'contain' ? '#000' : 'var(--color-bg-elevated, #141417)';
    this.style.overflow = 'hidden';

    if (!src) {
      this.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted, #8C8C92);font-size:13px;">
        Video unavailable (missing src).
      </div>`;
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
    video.controls = true;
    video.loop = this._loop;
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
