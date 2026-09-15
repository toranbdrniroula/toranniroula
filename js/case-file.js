async function renderCaseFile(relPrefix) {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  const slug = params.get('slug');
  const root = document.getElementById('case-file-root');
  if (!root) return;

  if (!slug) {
    root.innerHTML = '<p style="padding:40px 0;color:var(--color-text-muted);">No piece specified.</p>';
    return;
  }

  try {
    const pieces = await loadContentJSON(relPrefix, 'work-index.json');
    // category in the URL (if present) just disambiguates in the unlikely
    // case two pieces under different categories ever share a slug; slug
    // alone is otherwise sufficient since work-index.json is a single list.
    const piece = pieces.find(p => p.slug === slug && (!category || p.category === category));

    if (!piece) {
      root.innerHTML = '<p style="padding:40px 0;color:var(--color-text-muted);">This piece could not be found.</p>';
      return;
    }

    document.title = piece.title + ' – Toran Bahadur Niroula';
    updateMetaDescription(piece.quick_description || piece.title);

    // The write-up itself (piece.technical_body previously) now lives in
    // content/work/<slug>.md, same split as the writing section: the index
    // carries display/structural metadata, the .md carries the prose.
    // Frontmatter (title/date) is stripped since piece already has both
    // from the index.
    let technicalBody = '';
    try {
      const raw = await loadContentText(relPrefix, 'work/' + slug + '.md');
      technicalBody = raw.replace(/^---[\s\S]*?---\s*/m, '');
    } catch (err) {
      console.error('case-file: failed to load write-up markdown for', slug, err);
      technicalBody = '_This write-up could not be loaded right now._';
    }

    const statusBadge = piece.status
      ? `<span class="case-status-badge ${piece.status.toLowerCase().includes('progress') ? 'in-progress' : 'completed'}">${piece.status}</span>`
      : '';

    const typeBadge = piece.type
      ? `<span class="case-status-badge">${piece.type.charAt(0).toUpperCase() + piece.type.slice(1)}</span>`
      : '';

    const heroFit = piece.media_fit === 'contain' ? 'contain' : 'cover';
    // hero-carousel-media additionally marks pieces using media_type:
    // "carousel" -- see the matching CSS rule in case-file.css for why
    // (it needs to opt out of the outer figure's own fixed aspect-ratio,
    // which only the plain img/video path below actually relies on).
    const heroFitClass = (heroFit === 'contain' ? ' hero-fit-contain' : '') + (piece.media_type === 'carousel' ? ' hero-carousel-media' : '');
    const heroFitStyle = (heroFit === 'contain' && piece.media_aspect_ratio)
      ? ` style="--hero-aspect-ratio:${piece.media_aspect_ratio};"`
      : '';

    const mediaMarkup = piece.media_type === 'youtube'
      ? `<yt-embed videoid="${piece.media_src}" label="${piece.title.replace(/"/g, '&quot;')}" fit="${heroFit}"></yt-embed>`
      : piece.media_type === 'video'
        ? `<video-embed src="${relPrefix + piece.media_src}" poster="${piece.thumbnail ? relPrefix + piece.thumbnail : ''}" label="${piece.title.replace(/"/g, '&quot;')}" fit="${heroFit}"></video-embed>`
        : piece.media_type === 'gif'
          ? `<video src="${relPrefix + piece.media_src}" controls muted loop playsinline poster="${piece.thumbnail ? relPrefix + piece.thumbnail : ''}"></video>`
          : piece.media_type === 'carousel'
            ? `<hero-carousel interval="${piece.hero_interval || 5000}" label="${piece.title.replace(/"/g, '&quot;')}" fit="${heroFit}"${piece.media_aspect_ratio ? ` aspect-ratio="${piece.media_aspect_ratio}"` : ''}>${
                (piece.hero_slides || []).map(s => `<img src="${relPrefix + s.src}" alt="${(s.caption || piece.title).replace(/"/g, '&quot;')}" data-caption="${(s.caption || '').replace(/"/g, '&quot;')}">`).join('')
              }</hero-carousel>`
            : `<img src="${relPrefix + piece.media_src}" alt="${piece.title.replace(/"/g, '&quot;')}">`;

    const technicalHtml = (typeof marked !== 'undefined')
      ? marked.parse(technicalBody)
      : `<p>${technicalBody}</p>`;

    const supportingMarkup = (piece.supporting_media && piece.supporting_media.length)
      ? `
        <div class="case-supporting">
          <p class="case-subhead">Supporting media</p>
          <div class="case-supporting-grid">
            ${piece.supporting_media.map(src => `
              <figure>
                <img src="${relPrefix + src}" alt="Supporting visualization for ${piece.title.replace(/"/g, '&quot;')}" loading="lazy">
              </figure>
            `).join('')}
          </div>
        </div>
      ` : '';

    const tagsMarkup = (piece.tags && piece.tags.length)
      ? `<div class="case-tags">${piece.tags.map(t => `<span class="tag-chip">${t}</span>`).join('')}</div>`
      : '';

    const linksMarkup = (piece.links && piece.links.length)
      ? `<div class="case-links">${piece.links.map(l => `<a href="${l.url}" target="_blank" rel="noopener noreferrer">${l.label} &rarr;</a>`).join('')}</div>`
      : '';

    const backHref = relPrefix + 'work.html';

    // Previous/Next: adjacent entries in work-index.json's own order (not
    // filtered by category), so this reflects however the index file is
    // ordered -- reordering entries there moves the pager, same as the
    // "featured" precedence rule in gallery.js.
    const pieceIndex = pieces.findIndex(p => p.slug === piece.slug && p.category === piece.category);
    const prevPiece = pieceIndex > 0 ? pieces[pieceIndex - 1] : null;
    const nextPiece = pieceIndex >= 0 && pieceIndex < pieces.length - 1 ? pieces[pieceIndex + 1] : null;

    function caseFileHref(p) {
      return `${relPrefix}work/case-file.html?slug=${encodeURIComponent(p.slug)}&category=${encodeURIComponent(p.category)}`;
    }

    const pagerMarkup = (prevPiece || nextPiece) ? `
      <nav class="case-pager" aria-label="Adjacent pieces">
        ${prevPiece ? `
          <a class="case-pager-link case-pager-prev" href="${caseFileHref(prevPiece)}">
            <span class="case-pager-arrow">&larr;</span>
            <span class="case-pager-text"><span class="case-pager-label">Previous</span>${prevPiece.title}</span>
          </a>` : '<span class="case-pager-spacer"></span>'}
        ${nextPiece ? `
          <a class="case-pager-link case-pager-next" href="${caseFileHref(nextPiece)}">
            <span class="case-pager-text"><span class="case-pager-label">Next</span>${nextPiece.title}</span>
            <span class="case-pager-arrow">&rarr;</span>
          </a>` : '<span class="case-pager-spacer"></span>'}
      </nav>
    ` : '';

    // Related work: up to 3 other pieces sharing this piece's category,
    // in work-index.json order, current piece excluded.
    const related = pieces
      .filter(p => p.category === piece.category && p.slug !== piece.slug)
      .slice(0, 3);

    const relatedMarkup = related.length ? `
      <section class="case-section case-related">
        <p class="case-subhead">Related work</p>
        <div class="case-related-grid">
          ${related.map(p => `
            <a class="case-related-tile" href="${caseFileHref(p)}">
              ${tileMediaMarkup(p, relPrefix)}
              <span class="tile-title">${p.title}</span>
            </a>
          `).join('')}
        </div>
      </section>
    ` : '';

    root.innerHTML = `
      <header class="case-header">
        <h1 class="case-title">${piece.title}</h1>
        <div class="case-context">
          ${piece.institution ? `<span>${piece.institution}</span>` : ''}
          ${piece.date ? `<span>&middot; ${piece.date}</span>` : ''}
          ${typeBadge}
          ${statusBadge}
        </div>
        ${tagsMarkup}
      </header>

      <figure class="case-hero${heroFitClass}"${heroFitStyle}>
        ${mediaMarkup}
      </figure>

      <section class="case-section">
        <p class="case-general">${piece.quick_description || ''}</p>
      </section>

      <hr class="divider">

      <section class="case-section">
        <div class="case-technical">${technicalHtml}</div>
      </section>

      ${supportingMarkup ? `<hr class="divider">${supportingMarkup}` : ''}

      ${relatedMarkup ? `<hr class="divider">${relatedMarkup}` : ''}

      <hr class="divider">

      <footer class="case-footer">
        ${linksMarkup}
        ${pagerMarkup}
        <a class="back-link" href="${backHref}">&larr; Back to gallery</a>
      </footer>
    `;

    if (typeof window.renderMathInElement === 'function') {
      const technicalEl = root.querySelector('.case-technical');
      if (technicalEl) {
        window.renderMathInElement(technicalEl, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      }
    }
  } catch (err) {
    console.error(err);
    root.innerHTML = '<p style="padding:40px 0;color:var(--color-text-muted);">Unable to load this piece right now.</p>';
  }
}
