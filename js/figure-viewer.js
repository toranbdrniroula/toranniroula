// Image links still open their originals when native modal dialogs are unavailable.
(function () {
  if (!window.HTMLDialogElement || !HTMLDialogElement.prototype.showModal) return;
  var dialog = document.createElement('dialog');
  dialog.className = 'figure-dialog';
  dialog.setAttribute('aria-label', 'Enlarged figure');
  dialog.innerHTML = '<div class="figure-dialog-controls"><a target="_blank" rel="noopener">Open original image</a><button type="button" autofocus>Close</button></div><img alt=""><p class="figure-dialog-caption"></p>';
  document.body.appendChild(dialog);
  var image = dialog.querySelector('img');
  var caption = dialog.querySelector('p');
  var original = dialog.querySelector('a');
  var trigger;
  var previousOverflow;
  var activeCarousel;
  function close() { dialog.close(); }
  dialog.querySelector('button').addEventListener('click', close);
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) {
      var bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }
  });
  dialog.addEventListener('close', function () {
    document.body.style.overflow = previousOverflow;
    image.removeAttribute('src');
    if (trigger && trigger.isConnected) trigger.focus();
    if (activeCarousel) activeCarousel.dispatchEvent(new Event('figure:close'));
  });
  // Carousels rebuild their light DOM after loading; upgrade those images too.
  function linkImages() {
    document.querySelectorAll('article hero-carousel img').forEach(function (img) {
      if (img.closest('a')) return;
      var link = document.createElement('a');
      link.className = 'figure-open';
      link.href = img.src;
      link.setAttribute('aria-label', 'Enlarge image: ' + (img.alt || 'figure'));
      img.replaceWith(link);
      link.appendChild(img);
    });
    document.querySelectorAll('article .hc-slide').forEach(function (slide) {
      slide.inert = !slide.classList.contains('hc-active');
    });
  }
  linkImages();
  new MutationObserver(linkImages).observe(document.querySelector('main'), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  document.addEventListener('click', function (event) {
    var link = event.target.closest('article a.figure-open');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    var source = link.querySelector('img');
    if (!source) return;
    image.src = link.href;
    image.alt = source.alt;
    original.href = link.href;
    var figure = source.closest('figure');
    var carousel = source.closest('hero-carousel');
    var description = carousel ? carousel.querySelector('.hc-caption') : figure && figure.querySelector('figcaption');
    caption.textContent = description ? description.textContent : source.alt;
    trigger = link;
    previousOverflow = document.body.style.overflow;
    try { dialog.showModal(); } catch (error) { return; }
    activeCarousel = carousel;
    if (activeCarousel) activeCarousel.dispatchEvent(new Event('figure:open'));
    document.body.style.overflow = 'hidden';
    event.preventDefault();
  });
}());
