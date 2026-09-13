// <video-embed src="..." poster="..." label="..." height="360" fit="cover"></video-embed>
//
// Local-file counterpart to <yt-embed>. Same contract, same facade, same
// behavior -- so a self-hosted .mp4 in work-index.json (media_type: "video")
// looks and acts identically to a media_type: "youtube" piece:
//
// - No autoplay, ever. Shows the poster image + play affordance; the real
//   <video> element (and the byte range request it brings) is only created
//   after a click/Enter/Space, matching the site's no-autoplaying-motion
//   rule and keeping heavy video files off pages until wanted.
// - Uses IntersectionObserver so even the poster doesn't mount until the
//   element scrolls into view.
// - Once played, uses native <video controls> -- unmuted, no forced loop --
//   same as clicking through to YouTube's own player chrome.
// - Fails visibly (not silently) if no src is given.
// - fit="cover" (default) crops to fill the box, matching every other
//   hero media type; fit="contain" keeps the whole frame intact with
//   black letterbars instead, for footage whose aspect ratio doesn't
//   suit a crop.

class VideoEmbed extends HTMLElement {
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
  }

  _mount() {
    this._mounted = true;
    const src = this.getAttribute('src');
    const poster = this.getAttribute('poster') || '';
    const label = this.getAttribute('label') || 'video';
    const height = this.getAttribute('height') || '360';
    const fit = this.getAttribute('fit') === 'contain' ? 'contain' : 'cover';

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
    `;

    const facade = this.querySelector('.video-embed-facade');
    facade.addEventListener('click', () => this._loadVideo(src, label, fit));
  }

  _loadVideo(src, label, fit) {
    const video = document.createElement('video');
    video.src = src;
    video.setAttribute('aria-label', label);
    video.controls = true;
    video.autoplay = true;
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
    this.innerHTML = '';
    this.appendChild(video);
    video.play().catch(() => {});
  }
}

customElements.define('video-embed', VideoEmbed);
