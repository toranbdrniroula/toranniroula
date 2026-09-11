// Renders gallery grids from JSON content. Depends on lightbox.js being loaded
// alongside it (provides window.openLightbox).

function statusClass(status) {
  return status && status.toLowerCase().includes('progress') ? 'in-progress' : 'completed';
}

function tileMediaMarkup(piece, relPrefix) {
  if (piece.media_type === 'youtube') {
    // media_src can be a bare video ID or a full/short YouTube URL --
    // extractYouTubeId (nav.js, loaded before this file) normalizes either.
    const youtubeId = extractYouTubeId(piece.media_src);
    const thumbSrc = piece.thumbnail ? relPrefix + piece.thumbnail : `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    return `<img src="${thumbSrc}" alt="${escapeAttr(piece.title)}" loading="lazy">`;
  }
  if (piece.media_type === 'video' || piece.media_type === 'gif') {
    // No autoplay: video is muted/loop but only plays on hover/focus (see
    // wireTilePreviewPlayback), and never plays at all under reduced-motion.
    //
    // `src` is media_src (the actual video/loop file) -- NOT thumbnail.
    // thumbnail is a static JPEG per the media guidelines (README: "Gallery
    // thumbnails: compressed JPEG"), so it belongs in `poster`, which is
    // what actually shows before hover/play. The previous version pointed
    // <video src> at the JPEG thumbnail file itself, which a <video>
    // element can't play -- that's what produced a blank tile (a brief
    // "buffering" flash while the browser tried and failed to decode a
    // .jpg as video, then nothing, no visible error either way) for any
    // video piece that wasn't the featured one.
    const posterAttr = piece.thumbnail ? ` poster="${relPrefix + piece.thumbnail}"` : '';
    return `<video src="${relPrefix + piece.media_src}"${posterAttr} muted loop playsinline preload="metadata" aria-hidden="true"></video>`;
  }
  const src = relPrefix + piece.thumbnail;
  return `<img src="${src}" alt="${escapeAttr(piece.title)}" loading="lazy">`;
}

function wireTilePreviewPlayback(container) {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;
  container.querySelectorAll('.gallery-tile video, .featured-piece video').forEach(video => {
    const tile = video.closest('button');
    if (!tile) return;
    const play = () => video.play().catch(() => {});
    const pause = () => { video.pause(); video.currentTime = 0; };
    tile.addEventListener('mouseenter', play);
    tile.addEventListener('mouseleave', pause);
    tile.addEventListener('focus', play);
    tile.addEventListener('blur', pause);
  });
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}

// Display labels for known Work categories -- anything not listed here
// (e.g. a new "teaching" or "outreach" tag) just gets title-cased
// automatically, so adding a new category to work-index.json needs no
// change here.
const WORK_CATEGORY_LABELS = { research: 'Research', creative: 'Creative' };

function categoryLabel(cat) {
  if (WORK_CATEGORY_LABELS[cat]) return WORK_CATEGORY_LABELS[cat];
  return cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : '';
}

function renderGalleryTile(piece, relPrefix, sectionPath, showCategoryTag) {
  const tag = showCategoryTag
    ? `<span class="tile-tag">${categoryLabel(piece.category)}</span>`
    : '';
  const status = piece.status
    ? `<span class="tile-status ${statusClass(piece.status)}">${piece.status}</span>`
    : '';

  return `
    <button type="button" class="gallery-tile" data-slug="${piece.slug}" data-section="${piece.category}" aria-haspopup="dialog">
      ${tileMediaMarkup(piece, relPrefix)}
      ${tag}
      ${status}
      <span class="tile-title">${piece.title}</span>
    </button>
  `;
}

function wireGalleryTiles(container, pieces, relPrefix) {
  container.querySelectorAll('.gallery-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const slug = tile.getAttribute('data-slug');
      const section = tile.getAttribute('data-section');
      const piece = pieces.find(p => p.slug === slug && p.category === section);
      if (piece && window.openLightbox) {
        window.openLightbox(piece, pieces.filter(p => p.category === section), relPrefix, tile);
      }
    });
  });
}

async function loadGalleryJSON(relPrefix, file) {
  return loadContentJSON(relPrefix, file);
}

// Renders a grid of gallery tiles for a given (already-filtered) array of
// pieces into an existing container element. This is the shared rendering
// primitive behind the Work page's tag filter (js/work.js) -- it doesn't
// care how many distinct categories are present or what they're named, so
// adding a new category (e.g. "teaching") to work-index.json needs no
// change here.
function renderGalleryGrid(container, pieces, relPrefix, showCategoryTag) {
  if (!container) return;
  container.innerHTML = pieces.length
    ? pieces.map(p => renderGalleryTile(p, relPrefix, p.category, showCategoryTag)).join('')
    : '<p style="color:var(--color-text-muted);padding:20px 0">Nothing here yet.</p>';
  wireGalleryTiles(container, pieces, relPrefix);
  wireTilePreviewPlayback(container);
}

// Renders the homepage's mixed grid + featured piece
async function renderHomeGallery(gridId, featuredContainerId, relPrefix) {
  const grid = document.getElementById(gridId);
  const featuredEl = document.getElementById(featuredContainerId);
  try {
    const all = await loadGalleryJSON(relPrefix, 'work-index.json');

    let featured = all.find(p => p.featured) || all[0];
    const featuredWasRendered = Boolean(featuredEl && featured);

    if (featuredEl && featured) {
      // Image pieces: the hero tile shows the full-resolution media_src,
      // not the small compressed thumbnail (README: "The hero image on
      // the home page uses media_src, not thumbnail"), so thumbnail is
      // overridden here. Video/gif pieces don't need this anymore --
      // tileMediaMarkup already plays media_src directly and uses the
      // real thumbnail as the poster, so overriding it would replace a
      // valid poster image with a video file path. YouTube pieces build
      // their own thumbnail from media_src when no real thumbnail is set.
      const featuredForTile = featured.media_type === 'image'
        ? { ...featured, thumbnail: featured.media_src }
        : featured;
      featuredEl.innerHTML = `
        <button type="button" class="featured-piece" data-slug="${featured.slug}" data-section="${featured.category}" aria-haspopup="dialog">
          ${tileMediaMarkup(featuredForTile, relPrefix)}
          <span class="featured-caption">
            <span class="eyebrow">${categoryLabel(featured.category)} &middot; ${featured.date || ''}</span>
            <span class="featured-title">${featured.title}</span>
          </span>
        </button>
      `;
      featuredEl.querySelector('.featured-piece').addEventListener('click', (e) => {
        if (window.openLightbox) {
          window.openLightbox(featured, all.filter(p => p.category === featured.category), relPrefix, e.currentTarget);
        }
      });
      wireTilePreviewPlayback(featuredEl);
    }

    if (grid) {
      const rest = (featuredWasRendered ? all.filter(p => p.slug !== featured.slug) : all).slice(0, 8);
      grid.innerHTML = rest.map(p => renderGalleryTile(p, relPrefix, p.category, true)).join('');
      wireGalleryTiles(grid, all, relPrefix);
      wireTilePreviewPlayback(grid);
    }
  } catch (err) {
    console.error(err);
  }
}
