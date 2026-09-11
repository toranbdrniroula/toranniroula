// Content loading: plain fetch() against content/*.json / content/**/*.md.
// This requires the site to be served over http(s) (a local static server
// while developing -- e.g. `python3 -m http.server` from the project root
// -- or GitHub Pages/any real host once deployed). Opening a page directly
// via file:// won't work: browsers block fetch() of local files under the
// file: scheme. There used to be a window.__CONTENT__ preload path (via
// content/*-data.js companion scripts) meant to cover that case, but it
// only ever had mirrors for 2 of the site's 4 content files and was never
// kept in sync as work-index.json/writing-index.json grew, so every page
// was silently 404-ing on missing script tags. Removed rather than fixed:
// hand-maintaining a duplicate copy of every content file in JS is exactly
// the kind of drift this site's JSON-driven content model exists to avoid.
function loadContentJSON(relPrefix, file) {
  return fetch(relPrefix + 'content/' + file).then(r => {
    if (!r.ok) throw new Error('Failed to load ' + file);
    return r.json();
  });
}

function loadContentText(relPrefix, file) {
  return fetch(relPrefix + 'content/' + file).then(r => {
    if (!r.ok) throw new Error('Failed to load ' + file);
    return r.text();
  });
}

// Shared by <yt-embed>, gallery.js, lightbox.js, and case-file.js so a
// content author (or `field="..."`-style attribute value) can put either a
// bare 11-char video ID *or* a full/short YouTube URL into media_src /
// videoid and have it just work. Before this, anything but a raw ID
// silently broke both the thumbnail image (img.youtube.com/vi/<id>/...)
// and the embed iframe (youtube-nocookie.com/embed/<id>), with no visible
// error -- pasting a normal "https://www.youtube.com/watch?v=..." link
// (the thing everyone actually copies from their browser bar) is the
// obvious way to trip this.
// Handles: watch?v=ID, youtu.be/ID, embed/ID, shorts/ID, live/ID, a bare
// ID, and any of those with extra query params (&t=, ?si=, playlist
// context, etc.) or a leading/trailing space from a pasted URL.
function extractYouTubeId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  // Already a bare ID (YouTube IDs are 11 chars of [A-Za-z0-9_-]).
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw, window.location.href);
    if (/(^|\.)youtu\.be$/.test(url.hostname)) {
      const id = url.pathname.split('/').filter(Boolean)[0];
      if (id) return id;
    }
    if (/(^|\.)youtube(-nocookie)?\.com$/.test(url.hostname)) {
      const vParam = url.searchParams.get('v');
      if (vParam) return vParam;
      const parts = url.pathname.split('/').filter(Boolean);
      const afterKeyword = ['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : null;
      if (afterKeyword) return afterKeyword;
    }
  } catch (e) { /* not a URL at all -- fall through */ }
  // Last resort: pull anything that looks like a video ID out of the
  // string, so a pasted URL missing its scheme (e.g. "youtu.be/xyz...")
  // still resolves instead of failing the stricter checks above.
  const match = raw.match(/(?:v=|\/embed\/|\/shorts\/|\/live\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : raw;
}

// Keeps the <meta name="description"> tag in sync with document.title on
// pages rendered per-slug from JSON (work/case-file.html, writing/post.html).
// The static <meta> tag in those files is necessarily generic (see the
// comments in those files / the Content Manual addendum on prerendering),
// but this at least gets browser tabs and any crawler that executes JS
// (e.g. modern Googlebot) the real per-piece description, truncated to a
// sane length so it doesn't just dump an entire quick_description run-on.
function updateMetaDescription(text) {
  if (!text) return;
  const trimmed = String(text).trim();
  const truncated = trimmed.length > 160 ? trimmed.slice(0, 157).trimEnd() + '\u2026' : trimmed;
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', 'description');
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', truncated);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', truncated);
  const twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc) twDesc.setAttribute('content', truncated);
}

function ensureFontAwesome() {
  if (document.querySelector('link[data-font-awesome="true"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
  link.crossOrigin = 'anonymous';
  link.referrerPolicy = 'no-referrer';
  link.dataset.fontAwesome = 'true';
  document.head.appendChild(link);
}

// Single source of truth for nav links.
const NAV_LINKS = [
  { label: 'Home', href: 'index.html', match: ['index.html'] },
  { label: 'Work', href: 'work.html', match: ['work.html', 'work/case-file.html'] },
  { label: 'About', href: 'about.html', match: ['about.html'] },
  { label: 'Writing', href: 'writing.html', match: ['writing.html'] },
  { label: 'Contact', href: 'contact.html', match: ['contact.html'] }
];

function resolvePath(relPrefix, href) {
  return relPrefix + href;
}

function currentFileName() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts.length === 0) return 'index.html';
  const last = parts[parts.length - 1];
  if (parts.length >= 2 && (parts[parts.length - 2] === 'work')) {
    return 'work/' + last;
  }
  return last || 'index.html';
}

function renderNav(relPrefix) {
  const nav = document.getElementById('site-nav');
  if (!nav) return;
  const current = currentFileName();

  const linksHtml = NAV_LINKS.map(link => {
    const isActive = link.match.includes(current);
    return `<a href="${resolvePath(relPrefix, link.href)}"${isActive ? ' class="active" aria-current="page"' : ''}>${link.label}</a>`;
  }).join('');

  nav.innerHTML = linksHtml + '<button type="button" id="theme-toggle" class="theme-toggle" aria-label="Toggle light and dark mode">&#9789;</button>';

  initThemeToggle();

  const toggle = document.getElementById('nav-toggle');
  const scrim = document.getElementById('nav-scrim');

  function closeMenu() {
    nav.classList.remove('open');
    if (scrim) scrim.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function openMenu() {
    nav.classList.add('open');
    if (scrim) scrim.classList.add('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.contains('open');
      isOpen ? closeMenu() : openMenu();
    });
  }
  if (scrim) {
    scrim.addEventListener('click', closeMenu);
  }
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
}

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function applyThemeIcon(btn) {
  if (!btn) return;
  btn.textContent = currentTheme() === 'light' ? '\u2600' : '\u263D';
}

function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  applyThemeIcon(btn);
  btn.addEventListener('click', () => {
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) { /* ignore */ }
    applyThemeIcon(btn);
    document.dispatchEvent(new CustomEvent('site:themechange', { detail: { theme: next } }));
  });
}

function decorateLinkWithIcon(el, iconClass) {
  if (!el || el.dataset.iconDecorated === 'true') return;
  const label = (el.dataset.iconLabel || el.textContent || '').trim();
  if (!label) return;
  el.dataset.iconLabel = label;
  el.innerHTML = `<span class="${iconClass}" aria-hidden="true"></span><span>${label}</span>`;
  el.dataset.iconDecorated = 'true';
}

// Homepage-only: the hero canvas shows the name in large type (see
// .hero-name in index.html). Showing it a second time in the nav at the
// same moment reads as a mistake, so the nav copy (.top-strip .identity)
// stays hidden while .hero-name is in view and fades in once it isn't.
// No-ops on every other page, since they have no .hero-name element.
function initHeroNameSync() {
  const heroName = document.querySelector('.hero-name');
  const identity = document.querySelector('.top-strip .identity');
  if (!heroName || !identity) return;

  if (!('IntersectionObserver' in window)) {
    identity.classList.add('is-visible');
    return;
  }

  const topStrip = document.querySelector('.top-strip');

  // The nav is sticky, so it can visually cover .hero-name before the
  // name's own bounding box has scrolled past the viewport edge. Shrink
  // the observer's root by the nav's height so the reveal lines up with
  // what's actually covered, not just what's technically out of frame.
  function currentRootMargin() {
    const navHeight = topStrip ? Math.ceil(topStrip.getBoundingClientRect().height) : 0;
    return `-${navHeight}px 0px 0px 0px`;
  }

  function handleEntries(entries) {
    entries.forEach((entry) => {
      identity.classList.toggle('is-visible', !entry.isIntersecting);
    });
  }

  let observer = new IntersectionObserver(handleEntries, { threshold: 0, rootMargin: currentRootMargin() });
  observer.observe(heroName);

  // Nav height can change (mobile menu breakpoint, font load reflow) --
  // recreate the observer with an updated margin on resize.
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      observer.disconnect();
      observer = new IntersectionObserver(handleEntries, { threshold: 0, rootMargin: currentRootMargin() });
      observer.observe(heroName);
    }, 200);
  });
}

function setFooterYear() {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
}

function loadSiteIdentity(relPrefix) {
  ensureFontAwesome();
  loadContentJSON(relPrefix, 'site.json')
    .then(site => {
      document.querySelectorAll('.js-site-name').forEach(el => { el.textContent = site.name; });
      document.querySelectorAll('.js-signature-line').forEach(el => { el.textContent = site.signature_line; });
      const setLinkVisibility = (selector, url, iconClass, fallbackLabel) => {
        document.querySelectorAll(selector).forEach((el) => {
          const hasLink = !!(url && String(url).trim());
          if (!hasLink) {
            el.style.display = 'none';
            el.setAttribute('hidden', '');
            return;
          }
          el.href = url;
          if (fallbackLabel && !el.textContent.trim()) el.textContent = fallbackLabel;
          el.style.display = '';
          el.removeAttribute('hidden');
          decorateLinkWithIcon(el, iconClass);
        });
      };

      setLinkVisibility('.js-email-link', 'mailto:' + site.email, 'fa-solid fa-envelope', site.email);
      setLinkVisibility('.js-github-link', site.social.github, 'fa-brands fa-github', 'GitHub');
      setLinkVisibility('.js-linkedin-link', site.social.linkedin, 'fa-brands fa-linkedin', 'LinkedIn');
      document.querySelectorAll('.js-youtube-link').forEach(el => {
        if (site.social.youtube && String(site.social.youtube).trim()) {
          el.href = site.social.youtube;
          el.style.display = '';
          el.removeAttribute('hidden');
          decorateLinkWithIcon(el, 'fa-brands fa-youtube');
        } else {
          el.style.display = 'none';
          el.setAttribute('hidden', '');
        }
      });
      document.querySelectorAll('.js-scholar-link').forEach(el => {
        if (site.social.scholar && String(site.social.scholar).trim()) {
          el.href = site.social.scholar;
          el.style.display = '';
          el.removeAttribute('hidden');
          decorateLinkWithIcon(el, 'fa-solid fa-graduation-cap');
        } else {
          el.style.display = 'none';
          el.setAttribute('hidden', '');
        }
      });
      document.querySelectorAll('.js-resume-link').forEach(el => {
        if (site.resume && String(site.resume).trim()) {
          el.href = relPrefix + site.resume;
          el.style.display = '';
          el.removeAttribute('hidden');
          decorateLinkWithIcon(el, 'fa-solid fa-file-arrow-down');
        } else {
          el.style.display = 'none';
          el.setAttribute('hidden', '');
        }
      });
      if (site.hero) {
        document.querySelectorAll('.js-hero-eyebrow').forEach(el => { el.textContent = site.hero.eyebrow || ''; });
        document.querySelectorAll('.js-hero-intro').forEach(el => { el.textContent = site.hero.intro || ''; });
      }

      const about = site.about;
      if (about) {
        const photo = document.getElementById('about-photo');
        const photoColor = document.getElementById('about-photo-color');
        if (photo && about.photo) {
          const bw = about.photo_bw || about.photo;
          photo.src = relPrefix + bw;
          photo.alt = about.photo_alt || '';
          // The color image is the one that cross-fades in on hover (see
          // .about-photo-color in css/about-contact.css) -- both stay
          // loaded at once now rather than swapping a single <img>'s src.
          if (photoColor) {
            photoColor.src = relPrefix + about.photo;
            photoColor.alt = '';
          }
        }
        const bioEl = document.getElementById('about-bio');
        if (bioEl && Array.isArray(about.bio)) {
          bioEl.innerHTML = about.bio.map(p => `<p>${p}</p>`).join('');
        }
        const researchInterestsEl = document.getElementById('research-interests');
        if (researchInterestsEl && Array.isArray(about.research_interests)) {
          researchInterestsEl.innerHTML = about.research_interests.map(p => `<p>${p}</p>`).join('');
        }
        const timelineEl = document.getElementById('timeline');
        if (timelineEl && Array.isArray(about.timeline)) {
          timelineEl.innerHTML = about.timeline.map(item => `
            <li>
              <span class="timeline-year">${item.year}</span>
              <span class="timeline-label">${item.label}</span>
            </li>`).join('');
        }
        const beliefsEl = document.getElementById('beliefs-list');
        if (beliefsEl && Array.isArray(about.beliefs)) {
          beliefsEl.innerHTML = about.beliefs.map(b => `<p class="belief-item">${b}</p>`).join('');
        }
        const currentlyEl = document.getElementById('currently-card');
        if (currentlyEl && about.currently) {
          currentlyEl.innerHTML = `
            <dl>
              <div><dt>Reading</dt><dd>${about.currently.reading}</dd></div>
              <div><dt>Working on</dt><dd>${about.currently.working_on}</dd></div>
              <div><dt>Listening to</dt><dd>${about.currently.listening_to}</dd></div>
            </dl>`;
        }
        const contactEl = document.getElementById('contact-text');
        if (contactEl && about.contact_text) {
          contactEl.textContent = about.contact_text;
        }
      }

      const skillsEl = document.getElementById('skills-list');
      if (skillsEl && Array.isArray(site.skills)) {
        skillsEl.innerHTML = site.skills.map(group => `
          <div class="skills-group">
            ${group.group ? `<p class="skills-group-label">${group.group}</p>` : ''}
            <div class="skills-chips">
              ${(group.items || []).map(item => `<span class="tag-chip">${item}</span>`).join('')}
            </div>
          </div>`).join('');
      }
    })
    .catch(err => console.error('Failed to load site.json', err));
}
