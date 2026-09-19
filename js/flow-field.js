// <flow-field></flow-field>
//
// Homepage hero background: a real incompressible-flow simulation (the
// same family of technique as the popular WebGL fluid-dynamics demos),
// run on the GPU with WebGL2. Compared to the old CPU/Canvas2D version,
// the difference is the pressure-projection step: after every advection
// the velocity field is corrected to be divergence-free by solving a
// Poisson equation for pressure (Jacobi iteration) and subtracting its
// gradient. That correction is what turns "some blur that follows the
// cursor" into an actual fluid that pushes, curls and rolls up into
// eddies at the edges of a moving disturbance.
//
// Pipeline per frame (Stam's "Stable Fluids", the standard real-time
// scheme every one of these demos uses):
//   1. curl / vorticity confinement  – re-inject the small rotational
//      detail that numerical diffusion would otherwise smear away, which
//      is what produces the rollups and instability at shear layers.
//   2. divergence of velocity
//   3. Jacobi-iterate pressure against that divergence
//   4. subtract the pressure gradient from velocity (projection)
//   5. semi-Lagrangian self-advection of velocity, then advection of the
//      dye/density field through that corrected velocity
//
// Interaction: continuous pointer *motion*, not drag/click-drag. Every
// pointermove injects a soft velocity + dye splat sized by cursor speed.
// The fluid's own inertia (advection carries motion forward a step at a
// time) plus dye dissipation is what makes it lag a beat behind the
// cursor and settle after it stops, rather than snapping to a shape.
//
// Same Web Component contract as the rest of this stack:
// - No motion before interaction; loop parks itself once the field
//   settles back to rest and only wakes on the next splat.
// - Pauses via IntersectionObserver when scrolled out of view.
// - Fully static (a fixed gradient wash, no sim, no listeners) under
//   prefers-reduced-motion, and as the automatic fallback if WebGL2 or
//   floating-point render targets aren't available.
// - Disposes GL resources / RAF / listeners on disconnect.

(function () {
  const VERT_SRC = `#version 300 es
    precision highp float;
    in vec2 aPosition;
    out vec2 vUv;
    out vec2 vL;
    out vec2 vR;
    out vec2 vT;
    out vec2 vB;
    uniform vec2 texelSize;
    void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const FRAG_HEADER = `#version 300 es
    precision highp float;
    precision highp sampler2D;
  `;

  const FRAG = {
    copy: `
      in vec2 vUv;
      uniform sampler2D uTexture;
      out vec4 fragColor;
      void main () { fragColor = texture(uTexture, vUv); }
    `,
    clear: `
      in vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;
      out vec4 fragColor;
      void main () { fragColor = value * texture(uTexture, vUv); }
    `,
    splat: `
      in vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      out vec4 fragColor;
      void main () {
        vec2 p = vUv - point;
        p.x *= aspectRatio;
        float falloff = exp(-dot(p, p) / radius);
        vec3 base = texture(uTarget, vUv).xyz;
        fragColor = vec4(base + falloff * color, 1.0);
      }
    `,
    advection: `
      in vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform float dt;
      uniform float dissipation;
      out vec4 fragColor;
      void main () {
        vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
        vec4 result = texture(uSource, coord);
        float decay = 1.0 + dissipation * dt;
        fragColor = result / decay;
      }
    `,
    divergence: `
      in vec2 vUv;
      in vec2 vL;
      in vec2 vR;
      in vec2 vT;
      in vec2 vB;
      uniform sampler2D uVelocity;
      out vec4 fragColor;
      void main () {
        float L = texture(uVelocity, vL).x;
        float R = texture(uVelocity, vR).x;
        float T = texture(uVelocity, vT).y;
        float B = texture(uVelocity, vB).y;
        vec2 C = texture(uVelocity, vUv).xy;
        if (vL.x < 0.0) L = -C.x;
        if (vR.x > 1.0) R = -C.x;
        if (vT.y > 1.0) T = -C.y;
        if (vB.y < 0.0) B = -C.y;
        float div = 0.5 * (R - L + T - B);
        fragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `,
    curl: `
      in vec2 vUv;
      in vec2 vL;
      in vec2 vR;
      in vec2 vT;
      in vec2 vB;
      uniform sampler2D uVelocity;
      out vec4 fragColor;
      void main () {
        float L = texture(uVelocity, vL).y;
        float R = texture(uVelocity, vR).y;
        float T = texture(uVelocity, vT).x;
        float B = texture(uVelocity, vB).x;
        float vort = R - L - T + B;
        fragColor = vec4(0.5 * vort, 0.0, 0.0, 1.0);
      }
    `,
    vorticity: `
      in vec2 vUv;
      in vec2 vL;
      in vec2 vR;
      in vec2 vT;
      in vec2 vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curlStrength;
      uniform float dt;
      out vec4 fragColor;
      void main () {
        float L = texture(uCurl, vL).x;
        float R = texture(uCurl, vR).x;
        float T = texture(uCurl, vT).x;
        float B = texture(uCurl, vB).x;
        float C = texture(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curlStrength * C;
        force.y *= -1.0;
        vec2 vel = texture(uVelocity, vUv).xy;
        fragColor = vec4(vel + force * dt, 0.0, 1.0);
      }
    `,
    pressure: `
      in vec2 vUv;
      in vec2 vL;
      in vec2 vR;
      in vec2 vT;
      in vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      out vec4 fragColor;
      void main () {
        float L = texture(uPressure, vL).x;
        float R = texture(uPressure, vR).x;
        float T = texture(uPressure, vT).x;
        float B = texture(uPressure, vB).x;
        float div = texture(uDivergence, vUv).x;
        float p = (L + R + B + T - div) * 0.25;
        fragColor = vec4(p, 0.0, 0.0, 1.0);
      }
    `,
    gradientSubtract: `
      in vec2 vUv;
      in vec2 vL;
      in vec2 vR;
      in vec2 vT;
      in vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      out vec4 fragColor;
      void main () {
        float L = texture(uPressure, vL).x;
        float R = texture(uPressure, vR).x;
        float T = texture(uPressure, vT).x;
        float B = texture(uPressure, vB).x;
        vec2 vel = texture(uVelocity, vUv).xy;
        vel -= vec2(R - L, T - B);
        fragColor = vec4(vel, 0.0, 1.0);
      }
    `,
    display: `
      in vec2 vUv;
      uniform sampler2D uDye;
      uniform vec3 bgColor;
      uniform vec3 accentColor;
      out vec4 fragColor;
      void main () {
        vec3 dye = texture(uDye, vUv).rgb;
        float t = clamp(max(max(dye.r, dye.g), dye.b), 0.0, 1.4);
        vec3 col;
        if (t < 0.85) {
          col = mix(bgColor, accentColor, t / 0.85);
        } else {
          col = mix(accentColor, vec3(1.0), clamp((t - 0.85) / 0.55, 0.0, 1.0));
        }
        fragColor = vec4(col, 1.0);
      }
    `
  };

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('Shader compile error: ' + info);
    }
    return shader;
  }

  function createProgram(gl, vertSrc, fragBody) {
    const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_HEADER + fragBody);
    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error('Program link error: ' + info);
    }
    gl.deleteShader(vert);
    gl.deleteShader(frag);

    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  }

  class FlowField extends HTMLElement {
    connectedCallback() {
      this._teardown = () => {};
      // Two independent flags:
      //  - _inViewport: is the canvas actually on screen right now? Only
      //    gates whether we bother drawing to it -- the sim itself doesn't
      //    care.
      //  - _pageVisible: is this browser tab even in the foreground? This
      //    is what should actually pause the simulation (no point burning
      //    GPU/battery on a backgrounded tab). Scrolling the canvas out of
      //    view within an active tab must NOT stop the sim from marching --
      //    otherwise it sits frozen at whatever state it was in when it
      //    left the viewport and only "unfreezes" on the next pointermove,
      //    instead of having kept evolving the whole time.
      this._inViewport = false;
      this._pageVisible = document.visibilityState !== 'hidden';
      this._observer = new IntersectionObserver((entries) => {
        this._inViewport = entries.some(e => e.isIntersecting);
        if (this._inViewport) {
          if (this._wake) this._wake();
          // Repaint immediately with whatever state the sim has marched to
          // while off-screen, rather than waiting a frame.
          if (this._renderNow) this._renderNow();
        }
      }, { rootMargin: '100px' });
      this._observer.observe(this);

      const onVisibilityChange = () => {
        this._pageVisible = document.visibilityState !== 'hidden';
        if (this._pageVisible && this._wake) this._wake();
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      const removeVisibilityListener = () => document.removeEventListener('visibilitychange', onVisibilityChange);

      this._mount();

      // _mount()/_mountWebGL()/_mountStatic() set their own this._teardown;
      // wrap it so the visibility listener above always gets cleaned up too.
      const innerTeardown = this._teardown;
      this._teardown = () => { removeVisibilityListener(); innerTeardown(); };
    }

    disconnectedCallback() {
      if (this._observer) this._observer.disconnect();
      this._teardown();
    }

    _readColorRGB01(varName, fallback) {
      const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(v);
      if (!m) return fallback;
      return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
    }

    _mount() {
      const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      this.style.display = 'block';
      this.style.position = 'absolute';
      this.style.inset = '0';
      this.style.overflow = 'hidden';

      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      this.innerHTML = '';
      this.appendChild(canvas);

      if (reduceMotion) {
        this._mountStatic(canvas);
        return;
      }

      const ok = this._mountWebGL(canvas);
      if (!ok) this._mountStatic(canvas);
    }

    // Fixed, non-interactive wash: no simulation, no listeners, nothing
    // ever moves. Used under prefers-reduced-motion and as the fallback
    // when WebGL2 float render targets aren't available.
    _mountStatic(canvas) {
      const ctx = canvas.getContext('2d', { alpha: false });
      const paint = () => {
        const rect = this.getBoundingClientRect();
        canvas.width = Math.max(1, rect.width);
        canvas.height = Math.max(1, rect.height);
        const bg = this._readColorRGB01('--color-bg', [0.04, 0.04, 0.05]).map(c => c * 255);
        const accent = this._readColorRGB01('--color-accent', [0.31, 0.66, 1]).map(c => c * 255);
        const grad = ctx.createRadialGradient(
          canvas.width * 0.7, canvas.height * 0.35, 0,
          canvas.width * 0.7, canvas.height * 0.35, Math.max(canvas.width, canvas.height) * 0.7
        );
        grad.addColorStop(0, `rgba(${accent[0]},${accent[1]},${accent[2]},0.10)`);
        grad.addColorStop(1, `rgba(${bg[0]},${bg[1]},${bg[2]},1)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      };
      paint();
      const ro = new ResizeObserver(paint);
      ro.observe(this);
      this._teardown = () => ro.disconnect();
    }

    // Real incompressible-flow simulation on the GPU. Returns false if the
    // browser can't support it, so the caller can fall back gracefully.
    _mountWebGL(canvas) {
      const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
      if (!gl) return false;

      const floatExt = gl.getExtension('EXT_color_buffer_float');
      if (!floatExt) return false;
      // Half-float linear filtering is core to WebGL2 (unlike WebGL1,
      // which needed OES_texture_half_float_linear), so this is always
      // safe for the HALF_FLOAT textures used below.
      const filterMode = gl.LINEAR;

      let programs;
      try {
        programs = {
          copy: createProgram(gl, VERT_SRC, FRAG.copy),
          clear: createProgram(gl, VERT_SRC, FRAG.clear),
          splat: createProgram(gl, VERT_SRC, FRAG.splat),
          advection: createProgram(gl, VERT_SRC, FRAG.advection),
          divergence: createProgram(gl, VERT_SRC, FRAG.divergence),
          curl: createProgram(gl, VERT_SRC, FRAG.curl),
          vorticity: createProgram(gl, VERT_SRC, FRAG.vorticity),
          pressure: createProgram(gl, VERT_SRC, FRAG.pressure),
          gradientSubtract: createProgram(gl, VERT_SRC, FRAG.gradientSubtract),
          display: createProgram(gl, VERT_SRC, FRAG.display)
        };
      } catch (e) {
        console.warn('flow-field: shader compile failed, falling back', e);
        return false;
      }

      // Fullscreen triangle-strip quad, shared by every pass.
      const quadVAO = gl.createVertexArray();
      const quadVBO = gl.createBuffer();
      gl.bindVertexArray(quadVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);

      const blit = (fbo) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.bindVertexArray(quadVAO);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };

      function createFBO(w, h, internalFormat, format, type) {
        gl.activeTexture(gl.TEXTURE0);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterMode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterMode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT);

        return {
          texture, fbo, width: w, height: h,
          texelSizeX: 1 / w, texelSizeY: 1 / h,
          attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; }
        };
      }

      function createDoubleFBO(w, h, internalFormat, format, type) {
        let fbo1 = createFBO(w, h, internalFormat, format, type);
        let fbo2 = createFBO(w, h, internalFormat, format, type);
        return {
          width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h,
          get read() { return fbo1; }, set read(v) { fbo1 = v; },
          get write() { return fbo2; }, set write(v) { fbo2 = v; },
          swap() { const t = fbo1; fbo1 = fbo2; fbo2 = t; }
        };
      }

      // Simulation runs at a coarser resolution than the visible dye
      // field: velocity/pressure don't need per-pixel detail, but the
      // dye trail reads much smoother at a higher resolution. Bumped up
      // from 128/640 -- finer velocity/pressure grid resolves a pushed
      // eddy more crisply, and a higher-res dye field means the trail
      // doesn't visibly pixelate at the edges of a fast swipe. This is a
      // real cost (more texture bandwidth + the Jacobi pressure solve
      // below runs PRESSURE_ITERATIONS times per frame at SIM_RES), so if
      // this reads as sluggish on lower-powered/mobile GPUs, SIM_RES is
      // the first thing to dial back down.
      const SIM_RES = 192;
      const DYE_RES = 960;
      const PRESSURE_ITERATIONS = 24;
      const CURL_STRENGTH = 14;              // vorticity confinement: higher = more rollups/instability
      // How quickly momentum bleeds off each frame -- this (not an actual
      // density or viscosity term; the sim has neither, it's inviscid
      // stable fluids at implicit unit density) is what stands in for
      // "how viscous the fluid feels." Lowered from 1.6 so a push's
      // momentum survives more advection steps before decaying, which is
      // what actually makes it carry farther -- a literal density/mass
      // change wouldn't touch this at all, since there's no mass term to
      // change.
      const VELOCITY_DISSIPATION = 1.1;
      const DENSITY_DISSIPATION = 1.5;       // how quickly the visible dye trail fades
      const PRESSURE_DISSIPATION = 0.8;
      // Governs when the sim is allowed to fully park itself: tracked on the
      // CPU (mirroring the GPU's own exponential decay law) rather than a
      // fixed frame count, so any motion that's actually still moving keeps
      // animating and only the true idle state stops the RAF loop.
      const ENERGY_EPSILON = 0.0025;
      const MAX_AWAKE_SECONDS = 30; // safety cap against runaway loops

      let simWidth, simHeight, dyeWidth, dyeHeight;
      let velocity, dye, divergence, curlField, pressure;

      const getResolution = (targetRes) => {
        const rect = this.getBoundingClientRect();
        const w = Math.max(1, rect.width);
        const h = Math.max(1, rect.height);
        const aspect = w / h;
        let width, height;
        if (aspect > 1) { width = Math.round(targetRes * aspect); height = targetRes; }
        else { width = targetRes; height = Math.round(targetRes / aspect); }
        return { width: Math.max(4, width), height: Math.max(4, height) };
      };

      const allocate = () => {
        const rect = this.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));

        const sim = getResolution(SIM_RES);
        const dyeRes = getResolution(DYE_RES);
        simWidth = sim.width; simHeight = sim.height;
        dyeWidth = dyeRes.width; dyeHeight = dyeRes.height;

        velocity = createDoubleFBO(simWidth, simHeight, gl.RG16F, gl.RG, gl.HALF_FLOAT);
        divergence = createFBO(simWidth, simHeight, gl.R16F, gl.RED, gl.HALF_FLOAT);
        curlField = createFBO(simWidth, simHeight, gl.R16F, gl.RED, gl.HALF_FLOAT);
        pressure = createDoubleFBO(simWidth, simHeight, gl.R16F, gl.RED, gl.HALF_FLOAT);
        dye = createDoubleFBO(dyeWidth, dyeHeight, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
      };

      const useProgram = (p) => gl.useProgram(p.program);

      let raf = null;
      // CPU-side estimate of how much kinetic energy is still in the sim.
      // Splats add to it; every step() decays it by the same factor the
      // velocity-advection shader applies to the GPU field, so this tracks
      // (without any GPU readback) whether the fluid has actually come to
      // rest yet. The loop only stops once this has decayed below
      // ENERGY_EPSILON -- not after a fixed number of frames -- so motion
      // that's still rolling around when the pointer stops keeps animating
      // until it genuinely settles.
      let energy = 0;
      let awakeSince = 0;

      const splat = (xUv, yUv, dxUv, dyUv, speedNorm) => {
        const rect = this.getBoundingClientRect();
        const aspect = rect.width / Math.max(1, rect.height);

        gl.viewport(0, 0, simWidth, simHeight);
        useProgram(programs.splat);
        gl.uniform1i(programs.splat.uniforms.uTarget, velocity.read.attach(0));
        gl.uniform1f(programs.splat.uniforms.aspectRatio, aspect);
        gl.uniform2f(programs.splat.uniforms.point, xUv, yUv);
        // Smaller radius + more force per unit area is the closest analog
        // to "the cursor acts like a smaller mass": the same swipe speed
        // now concentrates its momentum into a tighter spot rather than
        // spreading it over a wider one, so it reads as a sharper, more
        // point-like impulse instead of a soft push -- and combined with
        // the lower VELOCITY_DISSIPATION above, that concentrated
        // momentum also has more distance to travel before it decays.
        gl.uniform3f(programs.splat.uniforms.color, dxUv * speedNorm * 170, -dyUv * speedNorm * 170, 0);
        gl.uniform1f(programs.splat.uniforms.radius, 0.0008 + 0.0009 * speedNorm);
        blit(velocity.write.fbo);
        velocity.swap();

        const dyeAmount = Math.min(0.85, 0.16 + speedNorm * 0.4);
        gl.viewport(0, 0, dyeWidth, dyeHeight);
        useProgram(programs.splat);
        gl.uniform1i(programs.splat.uniforms.uTarget, dye.read.attach(0));
        gl.uniform2f(programs.splat.uniforms.point, xUv, yUv);
        gl.uniform3f(programs.splat.uniforms.color, dyeAmount, dyeAmount, dyeAmount);
        gl.uniform1f(programs.splat.uniforms.radius, 0.0012 + 0.0014 * speedNorm);
        blit(dye.write.fbo);
        dye.swap();

        // Contribution scales with how much velocity/dye this splat actually
        // injected, so a light touch decays quickly while a vigorous swipe
        // keeps the sim awake for longer -- proportional to reality rather
        // than a flat reset.
        energy += 0.05 + speedNorm * speedNorm * 0.35;
        awakeSince = performance.now();
        this._wake();
      };

      // Shared drag-tracking logic for both input sources. Mouse and touch
      // get their own `last` cursor + their own sensitivity curve, fed
      // through here, so a finger doesn't inherit the mouse's last known
      // position (which would produce one huge spurious "teleport" splat)
      // and can react more gently than a mouse does.
      const trackMove = (x, y, rect, now, state, sens) => {
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) { state.last = null; return; }
        if (state.last) {
          const dt = Math.max(now - state.last.t, 1);
          const dxPx = x - state.last.x, dyPx = y - state.last.y;
          const dist = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
          const speed = dist / (dt / 1000);
          if (speed > sens.threshold) {
            const dirX = dxPx / (dist || 1), dirY = dyPx / (dist || 1);
            const speedNorm = Math.min(speed / sens.divisor, sens.cap);
            splat(x / rect.width, 1 - y / rect.height, dirX, dirY, speedNorm);
          }
        }
        state.last = { x, y, t: now };
      };

      const MOUSE_SENS = { threshold: 3, divisor: 1400, cap: 1.6 };
      // Touch reacts at a noticeably softer, more damped rate than the
      // mouse: a higher speed threshold before it registers at all, a
      // bigger divisor so the same finger speed maps to a smaller
      // speedNorm, and a lower cap so even a fast swipe stays gentle
      // (speedNorm scales splat radius, dye amount and injected velocity
      // directly -- see splat() above).
      const TOUCH_SENS = { threshold: 5, divisor: 2600, cap: 0.85 };

      const mouseState = { last: null };
      const onPointerMove = (e) => {
        // Touch is handled separately below: on most mobile browsers a
        // touch's pointermove sequence gets silently cancelled the moment
        // the browser recognizes the gesture as a page scroll (since
        // pointer-events lets the touch fall through to scrollable content
        // underneath), so relying on pointermove alone means touch barely
        // does anything. Raw touchmove events don't have that problem --
        // they keep firing for the whole drag even while the page scrolls.
        if (e.pointerType === 'touch') return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        trackMove(x, y, rect, performance.now(), mouseState, MOUSE_SENS);
      };
      window.addEventListener('pointermove', onPointerMove, { passive: true });

      const touchState = { last: null };
      const onTouchMove = (e) => {
        const touch = e.touches[0];
        if (!touch) return;
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        trackMove(x, y, rect, performance.now(), touchState, TOUCH_SENS);
      };
      const onTouchEnd = () => { touchState.last = null; };
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd, { passive: true });
      window.addEventListener('touchcancel', onTouchEnd, { passive: true });

      let bg = this._readColorRGB01('--color-bg', [0.04, 0.04, 0.05]);
      let accent = this._readColorRGB01('--color-accent', [0.31, 0.66, 1]);
      const onThemeChange = () => {
        bg = this._readColorRGB01('--color-bg', [0.04, 0.04, 0.05]);
        accent = this._readColorRGB01('--color-accent', [0.31, 0.66, 1]);
      };
      document.addEventListener('site:themechange', onThemeChange);

      const step = (dt) => {
        gl.disable(gl.BLEND);

        // Vorticity confinement: restore the small-scale swirl that
        // advection alone would diffuse away. This is what produces
        // rollups and a mild, controlled instability at the edges of a
        // moving disturbance rather than a flow that just smooths out.
        gl.viewport(0, 0, simWidth, simHeight);
        useProgram(programs.curl);
        gl.uniform2f(programs.curl.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.curl.uniforms.uVelocity, velocity.read.attach(0));
        blit(curlField.fbo);

        useProgram(programs.vorticity);
        gl.uniform2f(programs.vorticity.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.vorticity.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(programs.vorticity.uniforms.uCurl, curlField.attach(1));
        gl.uniform1f(programs.vorticity.uniforms.curlStrength, CURL_STRENGTH);
        gl.uniform1f(programs.vorticity.uniforms.dt, dt);
        blit(velocity.write.fbo);
        velocity.swap();

        // Divergence of the (not yet incompressible) velocity field.
        useProgram(programs.divergence);
        gl.uniform2f(programs.divergence.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.divergence.uniforms.uVelocity, velocity.read.attach(0));
        blit(divergence.fbo);

        // Slight pressure dissipation between frames avoids residual
        // build-up ("ghost" pressure) from earlier splats.
        useProgram(programs.clear);
        gl.uniform1i(programs.clear.uniforms.uTexture, pressure.read.attach(0));
        gl.uniform1f(programs.clear.uniforms.value, PRESSURE_DISSIPATION);
        blit(pressure.write.fbo);
        pressure.swap();

        // Jacobi-solve the Poisson pressure equation against divergence.
        useProgram(programs.pressure);
        gl.uniform2f(programs.pressure.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.pressure.uniforms.uDivergence, divergence.attach(0));
        for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
          gl.uniform1i(programs.pressure.uniforms.uPressure, pressure.read.attach(1));
          blit(pressure.write.fbo);
          pressure.swap();
        }

        // Projection: subtract the pressure gradient so velocity becomes
        // (numerically) divergence-free, i.e. behaves incompressibly.
        useProgram(programs.gradientSubtract);
        gl.uniform2f(programs.gradientSubtract.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.gradientSubtract.uniforms.uPressure, pressure.read.attach(0));
        gl.uniform1i(programs.gradientSubtract.uniforms.uVelocity, velocity.read.attach(1));
        blit(velocity.write.fbo);
        velocity.swap();

        // Self-advect velocity (carries its own momentum forward), then
        // advect the dye through the now-corrected velocity field. The
        // dye moves a step behind the velocity that moves a step behind
        // the splat, which is the source of the cursor-lag look.
        useProgram(programs.advection);
        gl.uniform2f(programs.advection.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.advection.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(programs.advection.uniforms.uSource, velocity.read.attach(0));
        gl.uniform1f(programs.advection.uniforms.dt, dt);
        gl.uniform1f(programs.advection.uniforms.dissipation, VELOCITY_DISSIPATION);
        blit(velocity.write.fbo);
        velocity.swap();

        gl.viewport(0, 0, dyeWidth, dyeHeight);
        useProgram(programs.advection);
        gl.uniform2f(programs.advection.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.advection.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(programs.advection.uniforms.uSource, dye.read.attach(1));
        gl.uniform1f(programs.advection.uniforms.dt, dt);
        gl.uniform1f(programs.advection.uniforms.dissipation, DENSITY_DISSIPATION);
        blit(dye.write.fbo);
        dye.swap();
      };

      const render = () => {
        gl.viewport(0, 0, canvas.width, canvas.height);
        useProgram(programs.display);
        gl.uniform1i(programs.display.uniforms.uDye, dye.read.attach(0));
        gl.uniform3f(programs.display.uniforms.bgColor, bg[0], bg[1], bg[2]);
        gl.uniform3f(programs.display.uniforms.accentColor, accent[0], accent[1], accent[2]);
        blit(null);
      };

      // Exposed so connectedCallback's IntersectionObserver can force an
      // immediate repaint the moment the canvas re-enters the viewport,
      // showing the sim's current (marched-forward) state right away
      // instead of waiting for the next scheduled frame.
      this._renderNow = () => { if (this._inViewport) render(); };

      let prevTime = performance.now();

      const loop = (now) => {
        const dt = Math.min((now - prevTime) / 1000, 1 / 30);
        prevTime = now;
        // Always step the sim forward while the tab is in the foreground,
        // regardless of whether the canvas is scrolled into view -- that's
        // what keeps it from being frozen when scrolled back. Only the
        // (comparatively cheap, but pointless if no one can see it) final
        // draw-to-screen is skipped while off-screen.
        step(dt);
        if (this._inViewport) render();

        // Match the exponential decay the advection shader applies to the
        // velocity field (result / (1 + dissipation * dt)) so this estimate
        // tracks real on-GPU motion closely enough to know when it's safe
        // to stop stepping entirely (true idle, not just off-screen).
        energy /= 1 + VELOCITY_DISSIPATION * dt;

        const awakeTooLong = (now - awakeSince) / 1000 > MAX_AWAKE_SECONDS;
        if (this._pageVisible && energy > ENERGY_EPSILON && !awakeTooLong) {
          raf = requestAnimationFrame(loop);
        } else {
          raf = null;
          energy = 0;
        }
      };

      this._wake = () => {
        if (raf == null && this._pageVisible) {
          prevTime = performance.now();
          awakeSince = prevTime;
          raf = requestAnimationFrame(loop);
        }
      };

      allocate();
      render();

      const resizeObserver = new ResizeObserver(() => { allocate(); render(); });
      resizeObserver.observe(this);

      this._teardown = () => {
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('touchcancel', onTouchEnd);
        document.removeEventListener('site:themechange', onThemeChange);
        resizeObserver.disconnect();
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      };

      return true;
    }
  }

  customElements.define('flow-field', FlowField);
})();
