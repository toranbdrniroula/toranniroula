// Filter existing HTML; the complete list remains readable without this script.
(() => {
  const filter = document.querySelector('[data-index-filter]');
  if (!filter) return;
  const items = [...document.querySelectorAll('[data-index-item]')];
  const count = document.querySelector('[data-result-count]');
  filter.hidden = false;
  filter.addEventListener('click', event => {
    const button = event.target.closest('button[data-category]');
    if (!button) return;
    const category = button.dataset.category;
    let visible = 0;
    items.forEach(item => {item.hidden = category !== 'all' && item.dataset.category !== category; if (!item.hidden) visible++;});
    filter.querySelectorAll('button').forEach(control => {
      const active = control === button;
      control.classList.toggle('active', active); control.setAttribute('aria-pressed', String(active));
    });
    const noun = document.querySelector('.writing-list') ? 'post' : 'project';
    count.textContent = `${visible} ${noun}${visible === 1 ? '' : 's'}`;
  });
})();
