// Generic "All / Tag1 / Tag2 ..." pill filter, shared by any section that
// lists items tagged with a `.category` field (currently Writing and Work).
//
// Pills are discovered from the data itself -- present() below just reads
// whatever category values actually occur -- so adding a brand-new category
// (e.g. tagging a Work piece "teaching" or "outreach") makes a new pill
// appear automatically. No changes needed here or in any page's markup.
//
// - items:      flat array of objects, each with a `.category` string
// - labelFn:    optional (category) => displayLabel; return a falsy value
//               to fall back to a capitalized version of the raw category
// - renderListFn: (containerEl, filteredItems, activeCategory) => void,
//               called once up front with everything, then again on every
//               pill click with just the matching items
function renderTagFilter(filterContainerId, listContainerId, items, labelFn, renderListFn) {
  const filterEl = document.getElementById(filterContainerId);
  const listEl = document.getElementById(listContainerId);
  if (!listEl) return;

  function label(cat) {
    if (cat === 'all') return 'All';
    const custom = labelFn && labelFn(cat);
    if (custom) return custom;
    return cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : cat;
  }

  const present = [...new Set(items.map(i => i.category).filter(Boolean))];

  if (!filterEl || present.length < 2) {
    if (filterEl) filterEl.innerHTML = '';
    renderListFn(listEl, items, present.length === 1 ? present[0] : 'all');
    return;
  }

  const tabs = ['all', ...present];
  let active = 'all';

  function draw() {
    filterEl.innerHTML = tabs.map(cat => `
      <button type="button" class="tag-filter-btn${cat === active ? ' active' : ''}" data-cat="${cat}">
        ${label(cat)}
      </button>
    `).join('');
    filterEl.querySelectorAll('.tag-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        active = btn.dataset.cat;
        draw();
        const filtered = active === 'all' ? items : items.filter(i => i.category === active);
        renderListFn(listEl, filtered, active);
      });
    });
  }
  draw();
  renderListFn(listEl, items, active);
}
