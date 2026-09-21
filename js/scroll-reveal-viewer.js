// <scroll-reveal-viewer mode="images|model" bg-color="..." surface-color="...">
//   <reveal-frame src="..." alt="...">          <!-- mode="images" -->
//     <reveal-caption><span class="tag">...</span><h4>...</h4><p>...</p></reveal-caption>
//   </reveal-frame>
//   <reveal-frame href="model.stl" rot="0,90,0">  <!-- mode="model" -->
//     <reveal-caption>...</reveal-caption>
//   </reveal-frame>
//   ...
// </scroll-reveal-viewer>
//
// A scroll-pinned "walk around it" viewer, in the spirit of hero-carousel.js
// but driven continuously by scroll position instead of a timer/click:
//
// - The element expands into an (N * 100svh) tall track; a sticky stage
//   inside it holds the visual and stays pinned to the viewport for the
//   whole scroll. N is the number of <reveal-frame> children.
// - mode="images" crossfades between consecutive <reveal-frame src> images.
//   Unlike a plain linear crossfade (which keeps both frames semi-visible
//   across the *entire* inter-step scroll distance and looks like a smeared
//   double-exposure when the frames aren't pixel-aligned), the opacity here
//   is mapped through a narrow smoothstep band centered on the transition
//   point (see TRANSITION_BAND below): each frame holds at full opacity for
//   most of its step and swaps quickly near the midpoint, so there's a
//   short, crisp cut rather than a long blend.
// - mode="model" loads one Three.js model (STL via STLLoader, or GLB/GLTF
//   via GLTFLoader, auto-detected from the href extension) and continuously
//   interpolates its rotation between each frame's rot="x,y,z" (degrees,
//   Euler XYZ) waypoint as the track scrolls -- true orbiting motion tied to
//   scroll rather than a sequence of flat images. Swapping mode="images" for
//   mode="model" (plus a real exported model) is a markup-only change; the
//   scroll-progress/caption/progress-dot logic is shared by both modes.
// - Colors default to this site's CSS custom properties (--color-bg-elevated,
//   --color-accent, --color-divider, --color-text, --color-text-muted) so
//   the viewer re-themes automatically with the site's light/dark toggle;
//   override per-instance with the bg-color / surface-color attributes.
// - Respects prefers-reduced-motion: locks to the frame nearest the current
//   scroll position with no interpolation or transition at all.

const TRANSITION_BAND = 0.18; // fraction of each inter-frame step spent blending; rest is a clean hold

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

class ScrollRevealViewer extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;

    const mode = this.getAttribute('mode') || 'images';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frameEls = Array.from(this.querySelectorAll('reveal-frame'));
    const n = frameEls.length;
    if (!n) return;

    const style = document.createElement('style');
    style.textContent = `
      scroll-reveal-viewer { display: block; }
      .srv-track { position: relative; }
      .srv-stage {
        position: sticky; top: 0; height: 100svh;
        display: flex; align-items: center; justify-content: center; overflow: hidden;
        background: var(--srv-bg, var(--color-bg-elevated, #141417));
        color: var(--color-text, #F0EFEA);
      }
      .srv-inner { position: relative; width: min(80vw, 680px); height: min(62vh, 540px); }
      .srv-inner img {
        position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain;
        will-change: opacity;
      }
      .srv-inner canvas { position: absolute; inset: 0; width: 100% !important; height: 100% !important; }
      .srv-cap {
        position: absolute; left: 50%; bottom: 6%; transform: translateX(-50%);
        text-align: center; opacity: 0; transition: opacity .25s ease;
        width: min(90vw, 420px); pointer-events: none;
      }
      .srv-cap.active { opacity: 1; }
      .srv-cap .tag {
        font-family: var(--font-mono, monospace); color: var(--color-accent, #4FA8FF);
        font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
      }
      .srv-cap h4 { margin: 6px 0 4px; font-size: 20px; font-family: var(--font-display, serif); font-weight: 600; }
      .srv-cap p { font-size: 13.5px; margin: 0; color: var(--color-text-muted, #8C8C92); max-width: none; }
      .srv-progress { position: absolute; top: 22px; right: 22px; display: flex; flex-direction: column; gap: 7px; }
      .srv-progress i { width: 5px; height: 20px; border-radius: 3px; background: var(--color-divider, #232328); transition: background .3s; }
      .srv-progress i.active { background: var(--color-accent, #4FA8FF); }
      .srv-hint {
        position: absolute; top: 22px; left: 22px; font-family: var(--font-mono, monospace);
        font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--color-text-muted, #8C8C92); opacity: .7;
      }
    `;

    const track = document.createElement('div');
    track.className = 'srv-track';
    track.style.height = (n * 100) + 'svh';

    const stage = document.createElement('div');
    stage.className = 'srv-stage';
    if (this.hasAttribute('bg-color')) stage.style.setProperty('--srv-bg', this.getAttribute('bg-color'));

    const hint = document.createElement('div');
    hint.className = 'srv-hint';
    hint.textContent = this.getAttribute('label') || 'Scroll to explore';

    const inner = document.createElement('div');
    inner.className = 'srv-inner';

    const dots = document.createElement('div');
    dots.className = 'srv-progress';

    stage.append(hint, inner, dots);
    track.appendChild(stage);
    this.innerHTML = '';
    this.append(style, track);

    const layers = [], caps = [], dotEls = [];
    frameEls.forEach((fr, i) => {
      const capSrc = fr.querySelector('reveal-caption');
      const cap = document.createElement('div');
      cap.className = 'srv-cap' + (i === 0 ? ' active' : '');
      if (capSrc) cap.innerHTML = capSrc.innerHTML;
      stage.appendChild(cap);
      caps.push(cap);

      const d = document.createElement('i');
      if (i === 0) d.className = 'active';
      dots.appendChild(d);
      dotEls.push(d);

      if (mode === 'images') {
        const img = document.createElement('img');
        img.src = fr.getAttribute('src');
        img.alt = fr.getAttribute('alt') || '';
        img.style.opacity = i === 0 ? 1 : 0;
        inner.appendChild(img);
        layers.push(img);
      } else {
        fr._rot = (fr.getAttribute('rot') || '0,0,0').split(',').map(Number);
      }
    });

    let model = null;
    if (mode === 'model') model = this._setupModel(inner, frameEls[0]);

    const onScroll = () => {
      const rect = track.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      let p = total > 0 ? (-rect.top) / total : 0;
      p = Math.max(0, Math.min(1, p));
      const pos = p * (n - 1);
      const idx = Math.min(n - 2, Math.floor(pos));
      const rawFrac = pos - idx;
      // Map the raw 0..1 inter-step position through a narrow band centered
      // on the midpoint so most of the step is a clean hold, not a blend.
      const lo = 0.5 - TRANSITION_BAND / 2, hi = 0.5 + TRANSITION_BAND / 2;
      const frac = reduced ? (rawFrac < 0.5 ? 0 : 1) : smoothstep(lo, hi, rawFrac);
      const activeIdx = rawFrac < 0.5 ? idx : Math.min(idx + 1, n - 1);

      caps.forEach((c, i) => c.classList.toggle('active', i === activeIdx));
      dotEls.forEach((d, i) => d.classList.toggle('active', i === activeIdx));

      if (mode === 'images') {
        layers.forEach((img, i) => {
          let op = 0;
          if (i === idx) op = 1 - frac;
          else if (i === idx + 1) op = frac;
          img.style.opacity = op;
        });
      } else if (model) {
        const a = frameEls[idx]._rot, b = frameEls[Math.min(idx + 1, n - 1)]._rot;
        model.setRotationDeg(
          a[0] + (b[0] - a[0]) * frac,
          a[1] + (b[1] - a[1]) * frac,
          a[2] + (b[2] - a[2]) * frac
        );
      }
    };

    window.addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
    window.addEventListener('resize', () => { if (model) model.resize(); onScroll(); });
    onScroll();
  }

  // mode="model" needs Three.js (STLLoader/GLTFLoader) loaded as an ES module
  // with an import map before this script runs -- see body.md for the exact
  // <script type="importmap"> block. Kept as a separate method so mode="images"
  // (the common case) never pays for Three.js at all.
  _setupModel(container, frame0) {
    if (!window.THREE_SRV) {
      console.warn('scroll-reveal-viewer: mode="model" requires window.THREE_SRV = { THREE, STLLoader, GLTFLoader } to be set before this element upgrades.');
      return null;
    }
    const { THREE, STLLoader, GLTFLoader } = window.THREE_SRV;
    const href = frame0.getAttribute('href');
    const surfaceColor = this.getAttribute('surface-color') || '#c9d3de';

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    camera.position.set(0, 0.6, 3.2);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(2, 3, 4);
    scene.add(dir);
    const pivot = new THREE.Group();
    scene.add(pivot);

    const fit = (obj) => {
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      obj.position.sub(center);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      obj.scale.setScalar(1.6 / maxDim);
      pivot.add(obj);
      render();
    };

    if (/\.glb$|\.gltf$/i.test(href)) {
      new GLTFLoader().load(href, (gltf) => fit(gltf.scene), undefined, console.warn);
    } else {
      new STLLoader().load(href, (geom) => {
        geom.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({ color: surfaceColor, metalness: 0.1, roughness: 0.6 });
        fit(new THREE.Mesh(geom, mat));
      }, undefined, console.warn);
    }

    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    };
    resize();

    return {
      setRotationDeg(rx, ry, rz) {
        pivot.rotation.set(THREE.MathUtils.degToRad(rx), THREE.MathUtils.degToRad(ry), THREE.MathUtils.degToRad(rz));
        render();
      },
      resize
    };
  }
}

customElements.define('scroll-reveal-viewer', ScrollRevealViewer);
