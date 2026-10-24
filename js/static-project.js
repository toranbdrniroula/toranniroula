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
    theme.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      (light ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' : '<path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/>') + '</svg>';
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
// The floating identity replaces the hero identity only after it leaves view.
(() => {
  const name = document.querySelector('.has-hero .hero-name');
  const header = document.querySelector('.top-strip');
  const identity = header && header.querySelector('.identity');
  if (!name || !identity) return;
  let scheduled = false;
  function syncIdentity() {
    scheduled = false;
    const bounds = name.getBoundingClientRect();
    const hidden = matchMedia('(min-width: 1024px)').matches &&
      bounds.bottom > header.getBoundingClientRect().bottom && bounds.top < window.innerHeight;
    document.body.classList.toggle('hero-name-in-view', hidden);
    identity.inert = hidden;
    identity.setAttribute('aria-hidden', String(hidden));
  }
  function schedule() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(syncIdentity); }
  }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  if (document.fonts) document.fonts.ready.then(schedule);
  syncIdentity();
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
