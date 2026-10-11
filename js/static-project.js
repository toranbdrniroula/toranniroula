// Enhances the build-rendered pilot page; never fetches or reconstructs prose.
(() => {
  const nav = document.getElementById('site-nav');
  const toggle = document.getElementById('nav-toggle');
  const scrim = document.getElementById('nav-scrim');
  const mobile = window.matchMedia('(max-width: 639px)');
  let open = false;

  function setMenu(next, restoreFocus = false) {
    open = next && mobile.matches;
    nav.classList.toggle('open', open);
    scrim.classList.toggle('open', open);
    nav.inert = mobile.matches && !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    if (restoreFocus) toggle.focus();
  }
  document.body.classList.add('navigation-enhanced');
  toggle.hidden = false;
  setMenu(false);
  toggle.addEventListener('click', () => {
    setMenu(!open);
    if (open) nav.querySelector('a').focus();
  });
  scrim.addEventListener('click', () => setMenu(false, true));
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  mobile.addEventListener('change', () => setMenu(false));
  document.addEventListener('keydown', event => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setMenu(false, true);
    } else if (event.key === 'Tab') {
      const controls = [toggle, ...nav.querySelectorAll('a, button:not([hidden])')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
  });

  const theme = document.getElementById('theme-toggle');
  function syncTheme() {
    const light = document.documentElement.dataset.theme === 'light';
    theme.textContent = light ? '☀' : '☽';
    theme.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  }
  theme.hidden = false;
  syncTheme();
  theme.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (error) { /* optional preference */ }
    syncTheme();
    document.dispatchEvent(new CustomEvent('site:themechange', { detail: { theme: next } }));
  });
})();
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('video-embed').forEach(video => {
    video.setAttribute('autoplay', 'false');
    video.setAttribute('controls', 'true');
  });
}
// Contents are generated at build time; scrolling only updates their current marker.
(() => {
  const contents = document.querySelector('.project-contents');
  if (!contents) return;
  const links = Array.from(contents.querySelectorAll('a[href^="#"]'));
  const entries = links.map(link => ({link, heading: document.getElementById(link.hash.slice(1))})).filter(entry => entry.heading);
  let scheduled = false;
  let active;
  function update() {
    scheduled = false;
    let current = entries[0];
    for (const entry of entries) {
      if (entry.heading.getBoundingClientRect().top <= 150) current = entry;
    }
    if (!current || current === active) return;
    if (active) active.link.removeAttribute('aria-current');
    current.link.setAttribute('aria-current', 'location');
    active = current;
    if (matchMedia('(min-width: 1100px)').matches) {
      const bounds = contents.getBoundingClientRect();
      const item = current.link.getBoundingClientRect();
      if (item.bottom > bounds.bottom || item.top < bounds.top) contents.scrollTop += item.top - bounds.top - 50;
    }
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule);
  update();
})();
