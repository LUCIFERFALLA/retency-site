/* ============================================================
   RETENCY · STUDIO
   ASCII showreel shader · HUD · magnetic cursor · kinetic rail
   No build step. No framework. Raw WebGL + rAF.
   ============================================================ */
(() => {
  'use strict';

  const html = document.documentElement;
  html.classList.add('js');

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE  = matchMedia('(hover: none), (pointer: coarse)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp  = (a, b, t) => a + (b - a) * t;

  /* ==========================================================
     1 · ASCII SHOWREEL SHADER
     Video -> luminance -> glyph atlas -> crimson/copper ramp.
     Scroll dissolves the glyph field to reveal the raw film.
     ========================================================== */
  function initAsciiHero() {
    const plate = document.querySelector('[data-plate]');
    if (!plate) return;
    const cv  = plate.querySelector('canvas');
    const vid = plate.querySelector('video');
    if (!cv || !vid) return;

    if (REDUCED) { plate.classList.add('nogl'); startVideo(); return; }

    const gl = cv.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: 'high-performance', preserveDrawingBuffer: false
    });
    if (!gl) { plate.classList.add('nogl'); startVideo(); return; }

    /* ---- glyph atlas: density ramp rendered to a texture ---- */
    const CHARS = ' .:-=+*o#%@';
    const N = CHARS.length, CW = 32, CH = 48;
    const ac = document.createElement('canvas');
    ac.width = CW * N; ac.height = CH;
    const ax = ac.getContext('2d');
    ax.fillStyle = '#000'; ax.fillRect(0, 0, ac.width, ac.height);
    ax.fillStyle = '#fff';
    ax.font = '700 34px "DM Mono", ui-monospace, monospace';
    ax.textAlign = 'center'; ax.textBaseline = 'middle';
    for (let i = 0; i < N; i++) ax.fillText(CHARS[i], i * CW + CW / 2, CH / 2 + 1);

    const VERT = `
      attribute vec2 p;
      varying vec2 uv;
      void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.0,1.0); }`;

    const FRAG = `
      precision highp float;
      varying vec2 uv;
      uniform sampler2D uAtlas, uVid;
      uniform vec2  uRes;
      uniform float uTime, uDissolve, uCell, uHasVid, uChars, uHover;

      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
      float vnoise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),
                   mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
      }
      float fbm(vec2 p){
        float v=0.0, a=0.5;
        for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; }
        return v;
      }

      // black -> blood -> crimson -> hot red -> white. no gold.
      vec3 ramp(float t){
        t = clamp(t,0.0,1.0);
        vec3 c0 = vec3(0.027,0.027,0.031);
        vec3 c1 = vec3(0.290,0.035,0.055);
        vec3 c2 = vec3(0.780,0.090,0.130);
        vec3 c3 = vec3(0.965,0.180,0.220);
        vec3 c4 = vec3(1.000,1.000,1.000);
        if(t<0.26) return mix(c0,c1,t/0.26);
        if(t<0.55) return mix(c1,c2,(t-0.26)/0.29);
        if(t<0.82) return mix(c2,c3,(t-0.55)/0.27);
        return mix(c3,c4,(t-0.82)/0.18);
      }

      void main(){
        vec2 res = uRes;
        vec2 px  = uv*res;
        float aspect = res.x/max(res.y,1.0);

        // --- cell grid ---
        vec2 cell = vec2(uCell);
        vec2 cid  = floor(px/cell);
        vec2 cuv  = fract(px/cell);

        vec2 q = cid*cell/res;
        vec2 qa = vec2((q.x-0.5)*aspect, q.y-0.5);   // aspect-corrected
        float t = uTime*0.06;

        // --- the showreel, sampled per cell ---
        vec2 csample = (cid+0.5)*cell/res;
        vec3 vidCol = vec3(0.0);
        float lum = 0.0;
        if(uHasVid > 0.5){
          vidCol = texture2D(uVid, vec2(csample.x, 1.0-csample.y)).rgb;
          lum = dot(vidCol, vec3(0.2126,0.7152,0.0722));
        }

        // --- domain-warped signal field ---
        vec2 w = vec2(
          fbm(qa*2.4 + vec2(t*1.15, -t*0.7)),
          fbm(qa*2.4 + vec2(4.7 - t*0.8, 1.3 + t*0.95))
        );
        float flow = fbm(qa*3.1 + w*1.75 + vec2(t*0.5, -t*0.35));

        // --- slow radial breath: an instrument readout, not soup ---
        float r = length(qa);
        float breath = sin(r*7.0 - uTime*0.85)*0.5+0.5;
        flow = mix(flow, flow*0.62 + breath*0.42, 0.34);

        // horizontal sweep pulse
        float sweep = smoothstep(0.22,0.0,abs(fract(q.x*0.5 - uTime*0.045)-0.5)-0.30);
        flow += sweep*0.12;

        // --- cursor bloom (white hot) ---
        float d = distance(vec2((uv.x-0.5)*aspect, uv.y-0.5), vec2((uHover-0.5)*aspect, 0.0));
        float bloom = (1.0-smoothstep(0.0,0.40,d));

        // film drives the glyphs; the field keeps it breathing
        float v;
        if(uHasVid > 0.5){
          float shaped = pow(clamp(lum*1.30,0.0,1.0), 0.88);   // lift the film
          v = shaped*0.74 + flow*0.30 + bloom*0.20;
        } else {
          v = flow*1.16 + bloom*0.26 - 0.06;
        }
        v = clamp(v, 0.0, 1.0);
        // deepen the base so most of the frame reads BLACK
        v = pow(v, 1.30);

        // --- glyph lookup ---
        float gi = floor(v*(uChars-1.0)+0.5);
        vec2 guv = vec2((gi + cuv.x)/uChars, 1.0-cuv.y);
        float g  = texture2D(uAtlas, guv).r;

        vec3 col = ramp(v)*(0.10 + g*1.20);

        // white-hot cores where the field peaks
        col += vec3(1.0)*smoothstep(0.86,1.0,v)*g*0.55;

        // CRT scanline
        col *= 0.91 + 0.09*sin(px.y*0.9);

        // --- dissolve: glyphs melt to black as you scroll in ---
        float seed = hash(cid*0.137);
        float edge = smoothstep(uDissolve-0.18, uDissolve+0.18, seed*0.72 + q.y*0.28);
        col *= edge;

        // hot rim on the dissolving front
        float rim = (1.0-edge)*edge*4.0;
        col += vec3(0.965,0.180,0.220)*rim*0.60;

        // grain
        col += (hash(px+uTime)-0.5)*0.030;

        gl_FragColor = vec4(col,1.0);
      }`;

    const sh = (t, s) => {
      const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(o)); return null; }
      return o;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { plate.classList.add('nogl'); startVideo(); return; }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { plate.classList.add('nogl'); startVideo(); return; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const mkTex = (src, clampEdge) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, clampEdge ? gl.CLAMP_TO_EDGE : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      return t;
    };
    const atlasTex = mkTex(ac, true);
    const vidTex   = mkTex(null, true);
    gl.bindTexture(gl.TEXTURE_2D, vidTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([12,12,16,255]));

    const U = n => gl.getUniformLocation(prog, n);
    const uRes = U('uRes'), uTime = U('uTime'), uDis = U('uDissolve'),
          uCell = U('uCell'), uHasVid = U('uHasVid'), uChars = U('uChars'), uHover = U('uHover');
    gl.uniform1i(U('uAtlas'), 0);
    gl.uniform1i(U('uVid'), 1);
    gl.uniform1f(uChars, N);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlasTex);

    let W = 0, H = 0, DPR = 1;
    function resize() {
      DPR = Math.min(devicePixelRatio || 1, 1.6);
      const r = plate.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width  * DPR));
      H = Math.max(1, Math.round(r.height * DPR));
      cv.width = W; cv.height = H;
      gl.viewport(0, 0, W, H);
      gl.uniform2f(uRes, W, H);
      // cell size scales with viewport so density feels consistent
      const cell = (r.width < 700 ? 7.5 : r.width < 1200 ? 8.5 : 9.5) * DPR;
      gl.uniform1f(uCell, cell);
    }
    resize();
    addEventListener('resize', resize, { passive: true });

    /* ---- video: CORS-safe upload, graceful fallback ---- */
    let vidReady = false, vidBad = false;
    function startVideo() {
      const s = vid.querySelector('source[data-src]');
      if (s && !s.src) { s.src = s.dataset.src; vid.load(); }
      const p = vid.play(); if (p && p.catch) p.catch(() => {});
    }
    vid.crossOrigin = 'anonymous';
    vid.addEventListener('loadeddata', () => { vidReady = true; }, { once: true });
    if ('requestIdleCallback' in window) requestIdleCallback(startVideo, { timeout: 900 });
    else setTimeout(startVideo, 400);

    /* ---- scroll drive ---- */
    let dissolve = 0, dissolveT = 0, hoverX = 0.5, hoverXT = 0.5;
    function onScroll() {
      const r = plate.getBoundingClientRect();
      // glyphs fully melt by ~55% of the hero, so the last stretch is clean film
      const prog = clamp(-r.top / Math.max(1, r.height * 0.55), 0, 1);
      dissolveT = prog;
      if (vidReady && !vidBad) vid.style.opacity = String(clamp((prog - 0.28) / 0.42, 0, 1));
    }
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (!COARSE) {
      plate.addEventListener('pointermove', e => {
        const r = plate.getBoundingClientRect();
        hoverXT = clamp((e.clientX - r.left) / r.width, 0, 1);
      }, { passive: true });
    }

    /* ---- render loop, gated to visibility ---- */
    let vis = true, raf = 0, t0 = performance.now();
    new IntersectionObserver(([e]) => {
      vis = e.isIntersecting;
      if (vis && !raf) raf = requestAnimationFrame(frame);
      if (!vis && raf) { cancelAnimationFrame(raf); raf = 0; }
      if (vid.paused && vis) { const p = vid.play(); if (p && p.catch) p.catch(()=>{}); }
      else if (!vis && !vid.paused) vid.pause();
    }, { threshold: 0.01 }).observe(plate);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
      else if (!document.hidden && vis && !raf) raf = requestAnimationFrame(frame);
    });

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const t = (now - t0) / 1000;

      dissolve = lerp(dissolve, dissolveT, 0.075);
      hoverX   = lerp(hoverX, hoverXT, 0.06);

      if (vidReady && !vidBad && vid.readyState >= 2) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, vidTex);
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
          gl.uniform1f(uHasVid, 1);
        } catch (err) {
          vidBad = true;                 // tainted / CORS — go procedural
          gl.uniform1f(uHasVid, 0);
          plate.classList.add('nogl');   // let the film show normally beneath
        }
      } else {
        gl.uniform1f(uHasVid, 0);
      }

      gl.uniform1f(uTime, t);
      gl.uniform1f(uDis, dissolve);
      gl.uniform1f(uHover, hoverX);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    raf = requestAnimationFrame(frame);

    cv.addEventListener('webglcontextlost', e => {
      e.preventDefault(); if (raf) cancelAnimationFrame(raf); raf = 0;
      plate.classList.add('nogl');
    });
  }

  /* ==========================================================
     2 · HUD — coords, clock, scroll, crosshair
     ========================================================== */
  function initHud() {
    const hud = document.querySelector('.hud');
    if (!hud) return;
    const coord = hud.querySelector('[data-coord]');
    const clock = hud.querySelector('[data-clock]');
    const prog  = hud.querySelector('.hud-prog');
    const scr   = hud.querySelector('[data-scrollpct]');
    const vx = hud.querySelector('.hud-cross .vx');
    const hz = hud.querySelector('.hud-cross .hz');

    requestAnimationFrame(() => hud.classList.add('ready'));

    if (clock) {
      const tick = () => {
        // IST readout — the studio clock
        const d = new Date();
        const ist = new Date(d.getTime() + (d.getTimezoneOffset() + 330) * 60000);
        const p = n => String(n).padStart(2, '0');
        clock.textContent = `IST ${p(ist.getHours())}:${p(ist.getMinutes())}:${p(ist.getSeconds())}`;
      };
      tick(); setInterval(tick, 1000);
    }

    if (!COARSE && !REDUCED) {
      let x = 0, y = 0, pending = false;
      addEventListener('pointermove', e => {
        x = e.clientX; y = e.clientY;
        if (!pending) {
          pending = true;
          requestAnimationFrame(() => {
            pending = false;
            if (coord) coord.textContent =
              `X ${String(Math.round(x)).padStart(4,'0')}  Y ${String(Math.round(y)).padStart(4,'0')}`;
            if (vx) vx.style.transform = `translateX(${x}px)`;
            if (hz) hz.style.transform = `translateY(${y}px)`;
          });
        }
      }, { passive: true });
      document.body.classList.add('cross-on');
    }

    let sp = false;
    addEventListener('scroll', () => {
      if (sp) return; sp = true;
      requestAnimationFrame(() => {
        sp = false;
        const max = document.documentElement.scrollHeight - innerHeight;
        const p = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
        if (prog) prog.style.transform = `scaleY(${p})`;
        if (scr)  scr.textContent = `${String(Math.round(p * 100)).padStart(3,'0')}%`;
      });
    }, { passive: true });
  }

  /* ==========================================================
     3 · CURSOR — dot + magnetic ring
     ========================================================== */
  function initCursor() {
    if (COARSE || REDUCED) return;
    const dot  = document.querySelector('.cur');
    const ring = document.querySelector('.cur-ring');
    if (!dot || !ring) return;
    const lbl = ring.querySelector('.lbl');

    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });

    (function loop() {
      rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
      dot.style.transform  = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();

    const HOT = 'a,button,summary,input,textarea,select,.rail-view,[data-cursor]';
    document.addEventListener('pointerover', e => {
      const t = e.target.closest?.(HOT);
      if (!t) return;
      ring.classList.add('hot');
      if (lbl) lbl.textContent = t.dataset?.cursor || '';
    });
    document.addEventListener('pointerout', e => {
      if (e.target.closest?.(HOT) && !e.relatedTarget?.closest?.(HOT)) {
        ring.classList.remove('hot');
        if (lbl) lbl.textContent = '';
      }
    });
  }

  /* ==========================================================
     4 · INFINITE RAIL — wheel + drag + page-scroll momentum
     ========================================================== */
  function initRail() {
    const view = document.querySelector('[data-rail]');
    if (!view) return;
    const track = view.querySelector('.rail-track');
    if (!track) return;

    const originals = [...track.children];
    if (!originals.length) return;

    // clone until we comfortably exceed 2 viewports
    let guard = 0;
    while (track.scrollWidth < innerWidth * 2.2 && guard++ < 8) {
      originals.forEach(n => track.appendChild(n.cloneNode(true)));
    }

    let setW = 0;
    const measure = () => {
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      setW = originals.reduce((s, n) => s + n.getBoundingClientRect().width + gap, 0);
    };
    measure();
    addEventListener('resize', measure, { passive: true });

    let off = 0, vel = 0, drift = REDUCED ? 0 : 0.35, dragging = false, lastX = 0, moved = 0;

    // wheel: vertical OR horizontal both push the rail
    view.addEventListener('wheel', e => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.preventDefault();
      vel += d * 0.55;
    }, { passive: false });

    // page scroll feeds the rail — scrolling down keeps it travelling
    let lastY = scrollY;
    addEventListener('scroll', () => {
      const dy = scrollY - lastY; lastY = scrollY;
      const r = view.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) vel += dy * 0.9;
    }, { passive: true });

    // drag
    view.addEventListener('pointerdown', e => {
      dragging = true; moved = 0; lastX = e.clientX;
      view.setPointerCapture?.(e.pointerId);
    });
    view.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
      off -= dx; vel = -dx * 1.4;
    });
    const endDrag = () => { dragging = false; };
    view.addEventListener('pointerup', endDrag);
    view.addEventListener('pointercancel', endDrag);
    view.addEventListener('pointerleave', endDrag);
    // suppress accidental navigation after a drag
    view.addEventListener('click', e => { if (moved > 8) { e.preventDefault(); e.stopPropagation(); } }, true);

    // play only what's on screen, capped
    const cards = [...track.children];
    let vis = true;
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; }, { threshold: 0.01 }).observe(view);

    let mediaTick = 0;
    function media() {
      const vr = view.getBoundingClientRect();
      let playing = 0;
      for (const c of cards) {
        const v = c.querySelector('video');
        if (!v) continue;
        const r = c.getBoundingClientRect();
        const onScreen = r.right > vr.left - 80 && r.left < vr.right + 80 && vis;
        if (onScreen && playing < 4) {
          playing++;
          const s = v.querySelector('source[data-src]');
          if (s && !s.src) { s.src = s.dataset.src; v.load(); }
          if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
        } else if (!v.paused) v.pause();
      }
    }

    (function loop() {
      requestAnimationFrame(loop);
      if (!vis) return;
      if (!dragging) vel *= 0.94;
      off += vel * 0.06 + drift;
      if (setW > 0) { off = ((off % setW) + setW) % setW; }
      track.style.transform = `translate3d(${-off}px,0,0)`;
      if (++mediaTick % 20 === 0) media();
    })();
    media();
  }

  /* ==========================================================
     5 · KINETIC TYPE + REVEALS
     ========================================================== */
  function splitChars(el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    const walk = node => {
      const kids = [...node.childNodes];
      for (const n of kids) {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          // split into words first so lines never break mid-word
          for (const token of n.nodeValue.split(/(\s+)/)) {
            if (!token) continue;
            if (/^\s+$/.test(token)) { frag.appendChild(document.createTextNode(' ')); continue; }
            const word = document.createElement('span');
            word.className = 'kt-word';
            for (const ch of token) {
              const w = document.createElement('span');
              w.className = 'kt kt-armed';
              const i = document.createElement('span');
              i.textContent = ch;
              w.appendChild(i);
              word.appendChild(w);
            }
            frag.appendChild(word);
          }
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains('kt')) {
          walk(n);
        }
      }
    };
    walk(el);
  }

  function initType() {
    const heads = [...document.querySelectorAll('[data-kinetic]')];
    if (!REDUCED) heads.forEach(splitChars);

    const play = el => {
      const inner = [...el.querySelectorAll('.kt > span')];
      inner.forEach((s, i) => {
        s.style.transition = 'transform .95s cubic-bezier(0.16,1,0.3,1)';
        s.style.transitionDelay = `${Math.min(i * 22, 700)}ms`;
        s.style.transform = 'translateY(0)';
      });
    };

    const io = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        if (e.target.hasAttribute('data-kinetic')) play(e.target);
        else e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    heads.forEach(h => io.observe(h));
    document.querySelectorAll('.sr').forEach(n => io.observe(n));

    // safety: nothing stays hidden if observers never fire
    setTimeout(() => {
      heads.forEach(play);
      document.querySelectorAll('.sr').forEach(n => n.classList.add('in'));
    }, 2600);
  }

  /* ==========================================================
     6 · VELOCITY MARQUEE
     ========================================================== */
  function initMarqueeVelocity() {
    const tracks = [...document.querySelectorAll('.vmarquee .marquee-track')];
    if (!tracks.length || REDUCED) return;
    let last = scrollY, boost = 0;
    addEventListener('scroll', () => {
      const dy = Math.abs(scrollY - last); last = scrollY;
      boost = Math.min(boost + dy * 0.05, 9);
    }, { passive: true });
    (function loop() {
      requestAnimationFrame(loop);
      boost *= 0.93;
      const d = (1 + boost).toFixed(2);
      tracks.forEach(t => { t.style.animationDuration = `${Math.max(4, 26 / d)}s`; });
    })();
  }

  /* ==========================================================
     BOOT
     ========================================================== */
  const boot = () => {
    try { initHud(); }             catch (e) { console.warn('hud', e); }
    try { initCursor(); }          catch (e) { console.warn('cursor', e); }
    try { initAsciiHero(); }       catch (e) { console.warn('hero', e); }
    try { initRail(); }            catch (e) { console.warn('rail', e); }
    try { initType(); }            catch (e) { console.warn('type', e); }
    try { initMarqueeVelocity(); } catch (e) { console.warn('marquee', e); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
