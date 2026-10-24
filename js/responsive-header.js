// Keep the identity consistent on every screen; mobile chrome rests out of view.
(() => {
  const header = document.querySelector('.top-strip');
  const identity = header && header.querySelector('.identity');
  if (!identity) return;
  const name = document.querySelector('.has-hero .hero-name');
  const toggle = document.getElementById('nav-toggle');
  const mobile = matchMedia('(max-width: 639px)');
  const idleDelay = 1800;
  let timer, scheduled = false, previousY = window.scrollY;
  const locked = () => toggle?.getAttribute('aria-expanded') === 'true' || !!header.querySelector(':focus-visible');
  function syncIdentity() {
    scheduled = false;
    const bounds = name && name.getBoundingClientRect();
    const hidden = !!bounds && bounds.bottom > header.getBoundingClientRect().height && bounds.top < window.innerHeight;
    document.body.classList.toggle('hero-name-in-view', hidden);
    identity.inert = hidden;
    identity.setAttribute('aria-hidden', String(hidden));
  }
  function schedule() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(syncIdentity); }
  }
  function reveal() {
    clearTimeout(timer);
    document.body.classList.toggle('mobile-menu-open', toggle?.getAttribute('aria-expanded') === 'true');
    document.body.classList.remove('header-idle');
    schedule();
    if (mobile.matches && window.scrollY > 24 && !locked()) {
      timer = setTimeout(() => {
        if (mobile.matches && window.scrollY > 24 && !locked()) document.body.classList.add('header-idle');
      }, idleDelay);
    }
  }
  document.body.classList.add('header-enhanced');
  window.addEventListener('scroll', () => {
    if (window.scrollY !== previousY) { previousY = window.scrollY; reveal(); }
    schedule();
  }, {passive:true});
  window.addEventListener('resize', reveal);
  window.addEventListener('pageshow', reveal);
  header.addEventListener('focusin', reveal);
  header.addEventListener('focusout', () => requestAnimationFrame(reveal));
  header.addEventListener('pointerdown', reveal, {passive:true});
  document.addEventListener('keydown', event => { if (event.key === 'Tab') reveal(); });
  if (toggle) new MutationObserver(reveal).observe(toggle, {attributes:true, attributeFilter:['aria-expanded']});
  if (document.fonts) document.fonts.ready.then(reveal);
  reveal();
})();
