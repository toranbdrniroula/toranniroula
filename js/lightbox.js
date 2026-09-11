(function () {
  let scrimEl, contentEl, currentList = [], currentIndex = -1, currentRelPrefix = '', triggerEl = null;

  function ensureScrim() {
    if (scrimEl) return scrimEl;
    scrimEl = document.createElement('div');
    scrimEl.className = 'lightbox-scrim';
    scrimEl.setAttribute('role', 'dialog');
    scrimEl.setAttribute('aria-modal', 'true');
    scrimEl.innerHTML = `
      <div class="lightbox-content">
        <button type="button" class="lightbox-close" aria-label="Close">&times;</button>
        <div class="lightbox-media"></div>
        <div class="lightbox-body">
          <a class="lightbox-title" href="#"></a>
          <p class="lightbox-description"></p>
          <p class="lightbox-meta"></p>
          <div class="lightbox-tags"></div>
          <a class="lightbox-readmore" href="#">Read the full case file &rarr;</a>
          <div class="lightbox-bottom-nav">
            <button type="button" class="lightbox-nav-btn lightbox-prev" aria-label="Previous piece">&larr; Previous</button>
            <button type="button" class="lightbox-nav-btn lightbox-next" aria-label="Next piece">Next &rarr;</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(scrimEl);
    contentEl = scrimEl.querySelector('.lightbox-content');

    scrimEl.addEventListener('click', (e) => {
      if (e.target === scrimEl) closeLightbox();
    });
    scrimEl.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    scrimEl.querySelector('.lightbox-prev').addEventListener('click', () => navigate(-1));
    scrimEl.querySelector('.lightbox-next').addEventListener('click', () => navigate(1));
    document.addEventListener('keydown', handleKeydown);

    return scrimEl;
  }

  function casefileHref(piece, relPrefix) {
    return relPrefix + 'work/case-file.html?category=' + encodeURIComponent(piece.category) + '&slug=' + encodeURIComponent(piece.slug);
  }

  function renderMedia(piece, relPrefix) {
    if (piece.media_type === 'youtube') {
      return `<yt-embed videoid="${piece.media_src}" label="${piece.title.replace(/"/g, '&quot;')}"></yt-embed>`;
    }
    const src = relPrefix + piece.media_src;
    if (piece.media_type === 'video') {
      const posterAttr = piece.thumbnail ? ` poster="${relPrefix + piece.thumbnail}"` : '';
      return `<video-embed src="${src}"${posterAttr} label="${piece.title.replace(/"/g, '&quot;')}"></video-embed>`;
    }
    if (piece.media_type === 'gif') {
      const posterAttr = piece.thumbnail ? ` poster="${relPrefix + piece.thumbnail}"` : '';
      return `<video src="${src}"${posterAttr} controls muted loop playsinline></video>`;
    }
    return `<img src="${src}" alt="${piece.title.replace(/"/g, '&quot;')}">`;
  }

  function renderPiece(piece, relPrefix) {
    const mediaEl = scrimEl.querySelector('.lightbox-media');
    mediaEl.innerHTML = renderMedia(piece, relPrefix);

    const titleEl = scrimEl.querySelector('.lightbox-title');
    titleEl.textContent = piece.title;
    titleEl.href = casefileHref(piece, relPrefix);

    scrimEl.querySelector('.lightbox-description').textContent = piece.quick_description || '';
    scrimEl.querySelector('.lightbox-meta').textContent = [piece.institution, piece.date].filter(Boolean).join(' · ');

    const tagsEl = scrimEl.querySelector('.lightbox-tags');
    tagsEl.innerHTML = (piece.tags && piece.tags.length)
      ? piece.tags.map(t => `<span class="tag-chip">${t}</span>`).join('')
      : '';

    const readmore = scrimEl.querySelector('.lightbox-readmore');
    readmore.href = casefileHref(piece, relPrefix);

    const hasMultiple = currentList.length > 1;
    const bottomNav = scrimEl.querySelector('.lightbox-bottom-nav');
    if (bottomNav) bottomNav.style.display = hasMultiple ? 'flex' : 'none';
  }

  function openLightbox(piece, list, relPrefix, trigger) {
    ensureScrim();
    currentList = list && list.length ? list : [piece];
    currentIndex = currentList.findIndex(p => p.slug === piece.slug);
    if (currentIndex === -1) currentIndex = 0;
    currentRelPrefix = relPrefix;
    triggerEl = trigger || null;

    renderPiece(currentList[currentIndex], relPrefix);
    scrimEl.classList.add('open');
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      scrimEl.querySelector('.lightbox-close').focus();
    });
  }

  function closeLightbox() {
    if (!scrimEl) return;
    scrimEl.classList.remove('open');
    document.body.style.overflow = '';
    const video = scrimEl.querySelector('video');
    if (video) video.pause();
    if (triggerEl) triggerEl.focus();
  }

  function navigate(delta) {
    if (!currentList.length) return;
    currentIndex = (currentIndex + delta + currentList.length) % currentList.length;
    renderPiece(currentList[currentIndex], currentRelPrefix);
  }

  function handleKeydown(e) {
    if (!scrimEl || !scrimEl.classList.contains('open')) return;
    if (e.key === 'Escape') {
      closeLightbox();
      return;
    }
    if (e.key === 'ArrowLeft') { navigate(-1); return; }
    if (e.key === 'ArrowRight') { navigate(1); return; }
    if (e.key === 'Tab') {
      const focusable = contentEl.querySelectorAll('button, a[href]');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  window.openLightbox = openLightbox;
})();
