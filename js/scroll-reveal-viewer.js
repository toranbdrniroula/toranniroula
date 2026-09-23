// <scroll-reveal-viewer mode="images|model" bg-color="..." surface-color="..." label="...">
//   <reveal-frame src="..." alt="...">                                     <!-- mode="images" -->
//     <reveal-caption><span class="tag">...</span><h4>...</h4><p>...</p></reveal-caption>
//   </reveal-frame>
//   <reveal-frame href="model.stl" azimuth="20" elevation="16" distance="3.1" target="0,0,0">  <!-- mode="model" -->
//     <reveal-caption>...</reveal-caption>
//   </reveal-frame>
//   <reveal-frame azimuth="80" elevation="6" distance="0.85" target="0,0,-0.8">
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
// - mode="model" loads exactly one Three.js model -- STL via STLLoader, or
//   GLB/GLTF via GLTFLoader, auto-detected from the extension on the FIRST
//   <reveal-frame href="...">; later frames don't need their own href -- and
//   flies a camera around it as the track scrolls. Each <reveal-frame> is a
//   waypoint:
//     azimuth    orbit angle around the model, degrees. Plain lerp between
//                waypoints (no wraparound), so pick a monotonically
//                increasing (or decreasing) sequence across frames for one
//                continuous sweep rather than jumping back and forth.
//     elevation  camera height above the horizontal plane, degrees.
//     distance   camera distance from its target, in world units *after*
//                the model has been fit to a 1.6-unit longest dimension --
//                so roughly 0.8-1.2 reads as a close-up on a detail and
//                2.5-3.5 as a full establishing shot.
//     target     "x,y,z", each a fraction of the model's own half-extent on
//                that axis: 0 is the model's center, +1/-1 is that axis's
//                extreme edge. E.g. target="0,0,-1" points the camera at
//                whatever sits at the model's forward-most tip. Resolved to
//                a real point once the model's actual bounding box is known
//                (all defaulting to "0,0,0", the model's center, if unset).
//   The model itself never rotates -- only the camera dollies and orbits --
//   which is what makes "zoom in on this one part" actually read as zooming
//   rather than the whole object just spinning in place around a fixed
//   frame. Three.js loads lazily via dynamic import() resolved through the
//   page's <script type="importmap">, the same pattern <stl-reader> uses,
//   so no extra module-loader script is needed on the page.
// - Colors default to this site's CSS custom properties (--color-bg-elevated,
//   --color-accent, --color-divider, --color-text, --color-text-muted) so
//   the viewer re-themes automatically with the site's light/dark toggle;
//   override per-instance with the bg-color / surface-color attributes.
// - Respects prefers-reduced-motion: locks to the frame nearest the current
//   scroll position with no interpolation or transition at all.

const TRANSITION_BAND = 0.18; // mode="images": fraction of each step spent blending; rest is a clean hold

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

let threeModulesPromise = null;
function loadThreeModules() {
  if (!threeModulesPromise) {
    threeModulesPromise = Promise.all([
      import('three'),
      import('three/addons/loaders/STLLoader.js'),
      import('three/addons/loaders/GLTFLoader.js')
    ]);
  }
  return threeModulesPromise;
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
      .srv-msg {
        position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        text-align: center; padding: 16px; font-size: 13px; color: var(--color-text-muted, #8C8C92);
      }
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
        const az = parseFloat(fr.getAttribute('azimuth'));
        const el = parseFloat(fr.getAttribute('elevation'));
        const dist = parseFloat(fr.getAttribute('distance'));
        const targetFrac = (fr.getAttribute('target') || '0,0,0').split(',').map(Number);
        fr._view = {
          azimuth: Number.isFinite(az) ? az : 0,
          elevation: Number.isFinite(el) ? el : 12,
          distance: Number.isFinite(dist) && dist > 0 ? dist : 2.4,
          targetFrac: [targetFrac[0] || 0, targetFrac[1] || 0, targetFrac[2] || 0],
          target: null // resolved to a real Vector3 once the model's bounding box is known
        };
      }
    });

    const onScroll = () => {
      const rect = track.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      let p = total > 0 ? (-rect.top) / total : 0;
      p = Math.max(0, Math.min(1, p));
      const pos = p * (n - 1);
      const idx = Math.min(n - 2, Math.floor(pos));
      const rawFrac = pos - idx;
      // mode="images": map through a narrow band centered on the midpoint so
      // most of the step is a clean hold, not a blend -- see TRANSITION_BAND.
      const lo = 0.5 - TRANSITION_BAND / 2, hi = 0.5 + TRANSITION_BAND / 2;
      const imageFrac = reduced ? (rawFrac < 0.5 ? 0 : 1) : smoothstep(lo, hi, rawFrac);
      const activeIdx = rawFrac < 0.5 ? idx : Math.min(idx + 1, n - 1);

      caps.forEach((c, i) => c.classList.toggle('active', i === activeIdx));
      dotEls.forEach((d, i) => d.classList.toggle('active', i === activeIdx));

      if (mode === 'images') {
        layers.forEach((img, i) => {
          let op = 0;
          if (i === idx) op = 1 - imageFrac;
          else if (i === idx + 1) op = imageFrac;
          img.style.opacity = op;
        });
      } else if (model) {
        // mode="model": the camera flight needs to move continuously across
        // the *whole* step, not hold-then-snap like the image crossfade, so
        // this uses a full-range ease instead of the narrow TRANSITION_BAND.
        const modelFrac = reduced ? (rawFrac < 0.5 ? 0 : 1) : smoothstep(0, 1, rawFrac);
        const va = frameEls[idx]._view, vb = frameEls[Math.min(idx + 1, n - 1)]._view;
        if (va && vb && va.target && vb.target) {
          model.setView(
            va.azimuth + (vb.azimuth - va.azimuth) * modelFrac,
            va.elevation + (vb.elevation - va.elevation) * modelFrac,
            va.distance + (vb.distance - va.distance) * modelFrac,
            va.target.clone().lerp(vb.target, modelFrac)
          );
        }
      }
    };

    let model = null;
    if (mode === 'model') {
      this._setupModel(inner, frameEls).then((m) => { model = m; onScroll(); });
    }

    window.addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
    window.addEventListener('resize', () => { if (model) model.resize(); onScroll(); });
    onScroll();
  }

  _showMessage(container, msg) {
    const el = document.createElement('div');
    el.className = 'srv-msg';
    el.textContent = msg;
    container.appendChild(el);
  }

  // mode="model": lazy-loads Three.js (STLLoader/GLTFLoader) through the
  // page's <script type="importmap"> -- same pattern as <stl-reader> -- fits
  // the model to a 1.6-unit box, and returns a controller whose setView()
  // points a spherical-orbit camera at a resolved target. Kept as a separate
  // async method so mode="images" (the common case) never pays for Three.js
  // at all.
  async _setupModel(container, frameEls) {
    const frame0 = frameEls[0];
    const href = frame0 && frame0.getAttribute('href');
    if (!href) {
      this._showMessage(container, 'Model unavailable (missing href on the first reveal-frame).');
      return null;
    }
    if (!window.WebGLRenderingContext) {
      this._showMessage(container, "This browser doesn't support WebGL.");
      return null;
    }

    let modules;
    try {
      modules = await loadThreeModules();
    } catch (err) {
      console.error('scroll-reveal-viewer: failed to load Three.js', err);
      this._showMessage(container, "Couldn't load the 3D viewer library.");
      return null;
    }
    const [THREE, { STLLoader }, { GLTFLoader }] = modules;
    const surfaceColor = this.getAttribute('surface-color') || '#c9d3de';

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(2, 3, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.3);
    rim.position.set(-3, -1.5, -2);
    scene.add(rim);
    const pivot = new THREE.Group();
    scene.add(pivot);

    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    };

    let halfExtent = new THREE.Vector3(0.8, 0.8, 0.8);
    const toLocal = (fx, fy, fz) => new THREE.Vector3(fx * halfExtent.x, fy * halfExtent.y, fz * halfExtent.z);

    const fit = (obj) => {
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 1.6 / maxDim;
      obj.scale.setScalar(scale);
      // Three composes an object's world transform as position + scale*local,
      // so centering it on the origin AFTER scaling requires the position
      // offset to be scaled down by the same factor (-center*scale), not the
      // raw, unscaled center. Using the raw center here was the bug: it left
      // the (correctly tiny) fitted mesh displaced by whatever the model's
      // real-world center offset was -- e.g. several feet of fuselage length
      // -- which at this scene's scale (whole aircraft = 1.6 units) is a
      // displacement several times the model's own size, so the camera's
      // orbit around (0,0,0)-ish targets mostly framed empty space instead
      // of the aircraft. This is unrelated to source units (feet vs.
      // meters): the ratio-based fit above is unit-agnostic, so the same bug
      // would occur regardless of what units the STL was exported in.
      obj.position.copy(center).multiplyScalar(-scale);
      pivot.add(obj);
      halfExtent = size.multiplyScalar(scale / 2);
    };

    const loaded = await new Promise((resolve) => {
      const onError = (err) => {
        console.error('scroll-reveal-viewer: failed to load model', href, err);
        this._showMessage(container, "Couldn't load this model — check the file and try again.");
        resolve(false);
      };
      if (/\.glb$|\.gltf$/i.test(href)) {
        new GLTFLoader().load(href, (gltf) => { fit(gltf.scene); resolve(true); }, undefined, onError);
      } else {
        new STLLoader().load(href, (geom) => {
          geom.computeVertexNormals();
          const mat = new THREE.MeshStandardMaterial({ color: surfaceColor, metalness: 0.1, roughness: 0.6 });
          fit(new THREE.Mesh(geom, mat));
          resolve(true);
        }, undefined, onError);
      }
    });
    if (!loaded) return null;

    // Now that the model's real half-extent is known, resolve every
    // waypoint's target="x,y,z" fraction into an actual local-space point.
    frameEls.forEach((fr) => {
      if (fr._view) fr._view.target = toLocal(...fr._view.targetFrac);
    });

    resize();

    return {
      setView(azimuthDeg, elevationDeg, distance, target) {
        const az = THREE.MathUtils.degToRad(azimuthDeg);
        const el = THREE.MathUtils.degToRad(elevationDeg);
        const r = Math.cos(el) * distance;
        camera.position.set(
          target.x + r * Math.sin(az),
          target.y + distance * Math.sin(el),
          target.z + r * Math.cos(az)
        );
        camera.lookAt(target);
        render();
      },
      resize
    };
  }
}

customElements.define('scroll-reveal-viewer', ScrollRevealViewer);
