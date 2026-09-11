// Renders the Publications section on about.html from
// content/publications.json. This is a thin citation-style layer -- each
// entry (title, type, institution, date, optional link) cross-links to the
// matching Work case-file page via `related_work` (a work-index.json slug)
// rather than duplicating that piece's write-up here.
//
// TYPE_LABELS is the same "known values get a nice label, anything else
// just gets title-cased" pattern used for Work/Writing categories
// (WORK_CATEGORY_LABELS in gallery.js, CATEGORY_LABELS in writing.js) --
// adding a publication with a new `type` value (e.g. "conference paper")
// needs no code change here.
const PUBLICATION_TYPE_LABELS = {
  thesis: 'Thesis',
  'internship report': 'Internship Report',
  poster: 'Poster'
};

function publicationTypeLabel(type) {
  if (!type) return '';
  if (PUBLICATION_TYPE_LABELS[type]) return PUBLICATION_TYPE_LABELS[type];
  return type.replace(/\b\w/g, c => c.toUpperCase());
}

async function renderPublications(containerId, relPrefix) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const [pubs, workPieces] = await Promise.all([
      loadContentJSON(relPrefix, 'publications.json'),
      loadContentJSON(relPrefix, 'work-index.json').catch(() => [])
    ]);

    if (!pubs || !pubs.length) {
      container.innerHTML = '<p style="color:var(--color-text-muted);">Nothing here yet.</p>';
      return;
    }

    container.innerHTML = pubs.map(pub => {
      const relatedPiece = pub.related_work ? workPieces.find(p => p.slug === pub.related_work) : null;
      const relatedHref = relatedPiece
        ? `${relPrefix}work/case-file.html?slug=${encodeURIComponent(relatedPiece.slug)}&category=${encodeURIComponent(relatedPiece.category)}`
        : '';

      const typeBadge = pub.type
        ? `<span class="tag-chip">${publicationTypeLabel(pub.type)}</span>`
        : '';

      const titleMarkup = relatedHref
        ? `<a href="${relatedHref}">${pub.title}</a>`
        : pub.title;

      const metaParts = [pub.institution, pub.date].filter(Boolean);

      const links = [];
      if (pub.link) links.push(`<a href="${relPrefix}${pub.link}" target="_blank" rel="noopener noreferrer">Download &darr;</a>`);
      if (relatedPiece) links.push(`<a href="${relatedHref}">Related work &rarr;</a>`);

      return `
        <article class="publication-item">
          <div class="publication-top-row">
            ${typeBadge}
            <span class="publication-title">${titleMarkup}</span>
          </div>
          ${metaParts.length ? `<p class="publication-meta">${metaParts.join(' &middot; ')}</p>` : ''}
          ${links.length ? `<div class="publication-links">${links.join('')}</div>` : ''}
        </article>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load publications', err);
    container.innerHTML = '<p style="color:var(--color-text-muted);">Unable to load publications right now.</p>';
  }
}
