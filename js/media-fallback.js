// Static HTML is the baseline. A component may replace it only after rendering.
(function () {
  function update(viewer, state) {
    var shell = viewer.closest('.scientific-media');
    if (!shell || shell.firstElementChild !== viewer) return;
    var reference = shell.querySelector('.media-reference');
    var ready = state === 'ready';
    shell.setAttribute('data-media-state', ready ? 'ready' : state === 'failed' ? 'failed' : 'pending');
    reference.hidden = ready;
    viewer.inert = !ready;
    if (ready) viewer.removeAttribute('aria-hidden');
    else viewer.setAttribute('aria-hidden', 'true');
  }
  document.addEventListener('media:state', function (event) {
    update(event.target, event.detail.state);
  });
  document.addEventListener('webglcontextlost', function (event) {
    var viewer = event.target.closest('stl-reader, vtk-reader, scroll-reveal-viewer');
    if (viewer) {
      viewer.setAttribute('data-media-state', 'failed');
      update(viewer.closest('scroll-reveal-viewer') || viewer, 'failed');
    }
  }, true);
})();
