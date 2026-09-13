// <yt-embed videoid="..." label="..." height="360" fit="cover"></yt-embed>
//
// A lazy, click-to-play YouTube facade. Matches the site's Web Component
// contract: attributes are the only content-author-facing API (usable
// directly from a content JSON's media_src/media_type, or pasted straight
// into a markdown post – marked.js passes unrecognized tags through
// unescaped, so this works there too).
//
// - No autoplay, ever. Shows a static thumbnail + play affordance; the
//   real <iframe> (and the network request it brings) is only created
//   after a click/Enter/Space, matching the site's no-autoplaying-motion
//   rule and keeping heavy embeds off pages until wanted.
// - Uses IntersectionObserver so even the thumbnail doesn't mount until
//   the element scrolls into view.
// - Fails visibly (not silently) if no videoid is given.
// - fit="cover" (default) crops the thumbnail to fill the box, matching
//   every other hero media type; fit="contain" keeps the whole thumbnail
//   intact with black letterbars instead. Only affects the pre-play
//   thumbnail -- once playing, YouTube's own player handles its frame.

class YtEmbed extends HTMLElement {
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
    // Accepts either a bare video ID or a full/short YouTube URL pasted
    // straight from the browser bar (see extractYouTubeId in nav.js,
    // loaded ahead of this file on every page that uses <yt-embed>).
    const rawVideoId = this.getAttribute('videoid');
    const videoId = typeof extractYouTubeId === 'function' ? extractYouTubeId(rawVideoId) : rawVideoId;
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

    if (!videoId) {
      this.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted, #8C8C92);font-size:13px;">
        Video unavailable (missing videoid).
      </div>`;
      return;
    }

    const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    this.innerHTML = `
      <button type="button" class="yt-embed-facade" aria-label="Play video: ${label.replace(/"/g, '&quot;')}"
        style="all:unset;cursor:pointer;display:block;position:relative;width:100%;height:100%;">
        <img src="${thumbUrl}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:${fit};background:${fit === 'contain' ? '#000' : 'transparent'};display:block;"
          onerror="this.style.display='none'">
        <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
          <span style="width:56px;height:56px;border-radius:50%;background:rgba(10,10,12,0.65);
            border:1px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;">
            <span style="width:0;height:0;border-top:10px solid transparent;border-bottom:10px solid transparent;
              border-left:16px solid #fff;margin-left:4px;"></span>
          </span>
        </span>
      </button>
    `;

    const facade = this.querySelector('.yt-embed-facade');
    facade.addEventListener('click', () => this._loadIframe(videoId, label));
  }

  _loadIframe(videoId, label) {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
    iframe.title = label;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    iframe.addEventListener('error', () => {
      this.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted, #8C8C92);font-size:13px;">
        Couldn't load this video.
      </div>`;
    });
    this.innerHTML = '';
    this.appendChild(iframe);
  }
}

customElements.define('yt-embed', YtEmbed);
