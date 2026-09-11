// <stl-reader href="..." bg-color="#0a0a0f" surface-color="#4fa3d1" height="420" auto-rotate="true"></stl-reader>
//
// Fixed 3D geometry viewer for hero shots and frozen isosurfaces – STL
// (via STLLoader) and glTF/GLB (via GLTFLoader, for baked vertex-colored
// exports), auto-detected from the file extension in `href`. Same
// Web Component contract as the site's other readers: attributes are the
// only content-author-facing API.
//
// - Three.js + STLLoader/GLTFLoader/OrbitControls load lazily via dynamic
//   import(), resolved through the page-level <script type="importmap">
//   (see page <head>s) – only fetched once a <stl-reader> actually mounts,
//   and only once per page even with multiple instances.
// - IntersectionObserver defers mounting until scrolled into view.
// - Single live, user-rotatable viewer, not an autoplay carousel: gentle
//   idle auto-rotation is allowed (matches the homepage-hero decision) but
//   stops the moment the user drags, and never runs at all if the user's
//   OS is set to prefers-reduced-motion.
// - Fails visibly, not silently, on a bad href or a WebGL/parse error.
// - Disposes all GPU resources on disconnect (page navigation, removal).
// - OrbitControls already pans (right-click-drag on desktop, two-finger
//   drag on touch) -- it's just not discoverable, and there's no mouse
//   button 1:1 with "right-click" on most trackpads. A small overlay adds
//   an explicit "Pan" toggle (remaps left-drag/one-finger-drag to pan
//   while active) and a "Reset view" button, so there's always a
//   reliable, visible way in and a way back.

(function () {
  let threeModulesPromise = null;

  function parseThemeColorAttr(value, fallbackColor) {
    const raw = String(value || '').trim();
    if (!raw) return { light: fallbackColor, dark: fallbackColor };
    const parts = raw.split(/\s*(?:,|;|:|\u2014|\u2013)\s*/).filter(Boolean);
    if (parts.length >= 2) return { light: parts[0], dark: parts[1] };
    return { light: parts[0], dark: parts[0] };
  }

  function currentThemeName() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function resolveThemeColor(colors) {
    return currentThemeName() === 'light' ? colors.light : colors.dark;
  }

  function loadThreeModules() {
    if (!threeModulesPromise) {
      threeModulesPromise = Promise.all([
        import('three'),
        import('three/addons/loaders/STLLoader.js'),
        import('three/addons/loaders/GLTFLoader.js'),
        import('three/addons/controls/OrbitControls.js')
      ]);
    }
    return threeModulesPromise;
  }

  class StlReader extends HTMLElement {
    connectedCallback() {
      this._teardown = () => {};
      if (this._mounted) return;
      this._observer = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) {
          this._observer.disconnect();
          this._mount();
        }
      }, { rootMargin: '200px' });
      this._observer.observe(this);
    }

    disconnectedCallback() {
      if (this._observer) this._observer.disconnect();
      this._teardown();
    }

    _showMessage(msg) {
      this.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:120px;color:var(--color-text-muted, #8C8C92);font-size:13px;text-align:center;padding:16px;">${msg}</div>`;
    }

    async _mount() {
      this._mounted = true;
      const href = this.getAttribute('href');
      const height = this.getAttribute('height') || '420';
      const surfaceColor = this.getAttribute('surface-color') || '#4fa3d1';
      const autoRotateAttr = this.getAttribute('auto-rotate');
      const wantsAutoRotate = autoRotateAttr !== 'false';

      const resolveBackgroundColor = () => {
        const bgColors = parseThemeColorAttr(
          this.getAttribute('bg-color'),
          getComputedStyle(document.documentElement).getPropertyValue('--color-bg-elevated').trim() || '#0a0a0f'
        );
        return resolveThemeColor(bgColors);
      };
      const bgColor = resolveBackgroundColor();

      this.style.display = 'block';
      this.style.width = '100%';
      this.style.height = height + 'px';
      this.style.background = bgColor;
      this.style.position = 'relative';

      if (!href) {
        this._showMessage('Model unavailable (missing href).');
        return;
      }

      this._showMessage('Loading model&hellip;');

      let modules;
      try {
        modules = await loadThreeModules();
      } catch (err) {
        console.error('stl-reader: failed to load Three.js', err);
        this._showMessage("Couldn't load the 3D viewer library.");
        return;
      }
      const [THREE, { STLLoader }, { GLTFLoader }, { OrbitControls }] = modules;

      if (!window.WebGLRenderingContext) {
        this._showMessage("This browser doesn't support WebGL.");
        return;
      }

      this.innerHTML = '';
      const host = document.createElement('div');
      host.style.width = '100%';
      host.style.height = '100%';
      this.appendChild(host);

      const width = this.clientWidth || 400;
      const heightPx = this.clientHeight || parseInt(height, 10);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(bgColor);

      const camera = new THREE.PerspectiveCamera(45, width / Math.max(heightPx, 1), 0.01, 2000);
      camera.position.set(0, 0, 5);

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
      } catch (err) {
        this._showMessage("Couldn't start WebGL for this model.");
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, heightPx);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      const applyThemeBackground = () => {
        const nextBgColor = resolveBackgroundColor();
        this.style.background = nextBgColor;
        scene.background = new THREE.Color(nextBgColor);
        renderer.render(scene, camera);
      };
      this._themeHandler = applyThemeBackground;
      document.addEventListener('site:themechange', this._themeHandler);
      applyThemeBackground();

      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
      keyLight.position.set(3, 5, 4);
      scene.add(keyLight);
      const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
      rimLight.position.set(-4, -2, -3);
      scene.add(rimLight);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;

      // Overlay controls: Pan toggle + Reset view. Positioned absolutely
      // over the canvas since this viewer (unlike <vtk-reader>) has no
      // dedicated controls strip -- it's meant to stay a clean hero shot
      // by default, so the overlay is small and only appears on hover on
      // pointer devices, but stays visible on touch (no hover state to
      // rely on there).
      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'absolute', bottom: '8px', right: '8px', display: 'flex',
        gap: '6px', zIndex: '2', opacity: '0.85', transition: 'opacity 0.15s ease'
      });
      const makeOverlayButton = (label) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        Object.assign(btn.style, {
          background: 'rgba(10,10,12,0.55)', color: '#F0EFEA',
          border: '1px solid rgba(255,255,255,0.25)', borderRadius: '3px',
          fontSize: '10px', cursor: 'pointer', padding: '3px 7px',
          fontFamily: 'inherit', backdropFilter: 'blur(2px)'
        });
        return btn;
      };
      const panToggleBtn = makeOverlayButton('Pan');
      const resetViewBtn = makeOverlayButton('Reset view');
      overlay.appendChild(panToggleBtn);
      overlay.appendChild(resetViewBtn);
      host.style.position = 'relative';
      host.appendChild(overlay);

      let panActive = false;
      const setPanActive = (active) => {
        panActive = active;
        panToggleBtn.style.background = active ? 'var(--color-accent, #4FA8FF)' : 'rgba(10,10,12,0.55)';
        panToggleBtn.style.color = active ? '#0A0A0C' : '#F0EFEA';
        // Remap so a plain left-drag/one-finger-drag pans instead of
        // rotating while the toggle is active; MIDDLE stays dolly either
        // way, RIGHT stays pan too so desktop's existing right-click-drag
        // habit keeps working regardless of toggle state.
        controls.mouseButtons.LEFT = active ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
        controls.touches.ONE = active ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
      };
      panToggleBtn.addEventListener('click', () => setPanActive(!panActive));
      resetViewBtn.addEventListener('click', () => {
        setPanActive(false);
        renderer.render(scene, camera);
        if (currentObject) fitCameraToObject(currentObject);
        renderer.render(scene, camera);
      });

      const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      controls.autoRotate = wantsAutoRotate && !reduceMotion;
      controls.autoRotateSpeed = 1.0;
      controls.addEventListener('start', () => { controls.autoRotate = false; });

      const fitCameraToObject = (object) => {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const fitDist = (maxDim / (2 * Math.tan((camera.fov * Math.PI / 180) / 2))) * 1.6;
        camera.position.set(center.x, center.y, center.z + fitDist);
        camera.near = Math.max(fitDist / 100, 0.01);
        camera.far = fitDist * 100;
        camera.updateProjectionMatrix();
        controls.target.copy(center);
        controls.update();
      };

      const onError = (err) => {
        console.error('stl-reader: failed to load', href, err);
        this._showMessage("Couldn't load this model – check the file and try again.");
      };

      const isGltf = /\.(glb|gltf)(\?|$)/i.test(href);
      let currentObject = null;

      if (isGltf) {
        new GLTFLoader().load(href, (gltf) => {
          scene.add(gltf.scene);
          currentObject = gltf.scene;
          fitCameraToObject(gltf.scene);
        }, undefined, onError);
      } else {
        new STLLoader().load(href, (geometry) => {
          geometry.computeVertexNormals();
          const material = geometry.hasColors
            ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 })
            : new THREE.MeshStandardMaterial({ color: new THREE.Color(surfaceColor), roughness: 0.55, metalness: 0.05 });
          const mesh = new THREE.Mesh(geometry, material);
          scene.add(mesh);
          currentObject = mesh;
          fitCameraToObject(mesh);
        }, undefined, onError);
      }

      let raf = null;
      const renderLoop = () => {
        controls.update();
        renderer.render(scene, camera);
        raf = requestAnimationFrame(renderLoop);
      };
      renderLoop();

      const resizeObserver = new ResizeObserver(() => {
        const w = this.clientWidth;
        const h = this.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
      resizeObserver.observe(this);

      this._teardown = () => {
        if (this._themeHandler) {
          document.removeEventListener('site:themechange', this._themeHandler);
          this._themeHandler = null;
        }
        if (raf) cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        controls.dispose();
        renderer.dispose();
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => m.dispose());
          }
        });
      };
    }
  }

  customElements.define('stl-reader', StlReader);
})();
