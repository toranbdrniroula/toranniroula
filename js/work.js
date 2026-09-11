// Work list renderer -- fetches the unified work-index.json and renders an
// "All / <category> / <category> ..." filter bar plus the matching gallery
// grid, the same pattern writing.js uses for the Writing section.
//
// Categories are not a fixed enum: they're whatever `category` values show
// up in content/work-index.json. Today that's "research" and "creative";
// adding a "teaching" or "outreach" piece later is just a new category
// value on that entry -- a pill for it appears automatically, no HTML/JS
// changes required. See WORK_CATEGORY_LABELS in gallery.js if you want a
// specific display label for a new category (optional -- otherwise it's
// just title-cased automatically).
async function renderWorkFilter(filterContainerId, listContainerId, relPrefix) {
  const listEl = document.getElementById(listContainerId);
  if (!listEl) return;
  try {
    const pieces = await loadGalleryJSON(relPrefix, 'work-index.json');
    renderTagFilter(
      filterContainerId,
      listContainerId,
      pieces,
      cat => WORK_CATEGORY_LABELS[cat],
      (el, filtered, active) => renderGalleryGrid(el, filtered, relPrefix, active === 'all')
    );
  } catch (err) {
    console.error(err);
    listEl.innerHTML = '<p style="color:var(--color-text-muted);padding:40px 0">Unable to load work right now.</p>';
  }
}
