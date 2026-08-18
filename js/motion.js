/* ============================================================
   RETENCY · MOTION
   Interactive canvas graphics, dropped in with one attribute:

     <div class="mg" data-motion="flow"></div>
     <div class="mg mg-tall" data-motion="grid"></div>
     <div class="mg" data-motion="rings"></div>

   Rules this file lives by, because the site has to stay fast:
   · ONE rAF for every instance on the page. Never one loop each.
   · Nothing offscreen does any work — IntersectionObserver gates it.
   · Device pixel ratio capped at 1.75. A 3x retina buffer costs 3x
     the fill rate for no visible gain on graphics this soft.
   · Particle counts scale to the element's area and stay capped.
   · fillRect over arc() for small marks — arc is an order of
     magnitude more expensive per call at these counts.
   · No per-particle shadowBlur or gradients. Those are the two
     things that reliably destroy canvas framerate.
   · prefers-reduced-motion renders ONE static frame and stops.
   ============================================================ */
(() => {
  'use strict';

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE  = matchMedia('(hover: none), (pointer: coarse)').matches;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  const INK = '12,12,14';
  const RED = '230,56,70';

  /* cheap smooth field — two crossed sines beat real Perlin here and
     cost a fraction of it. Good enough for organic drift. */
  const field = (x, y, t) =>
    Math.sin(x * 0.0042 + t * 0.34) * 1.6 +
    Math.cos(y * 0.0051 - t * 0.27) * 1.4 +
    Math.sin((x + y) * 0.0025 + t * 0.19) * 1.1;

  const instances = [];
  let running = false;

  function frame(now) {
    const t = now * 0.001;
    let live = 0;
    for (let i = 0; i < instances.length; i++) {
      const m = instances[i];
      if (!m.visible) continue;
      live++;
      m.step(t);
    }
    if (live || instances.some(m => m.visible)) requestAnimationFrame(frame);
    else running = false;                       // everything offscreen: stop burning frames
  }
  const wake = () => { if (!running) { running = true; requestAnimationFrame(frame); } };

  class Motion {
    constructor(host) {
      this.host = host;
      this.mode = host.dataset.motion || 'flow';
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'mg-canvas';
      host.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.visible = false;

      /* pointer, in element space, eased so it never snaps */
      this.px = -9999; this.py = -9999;
      this.tx = -9999; this.ty = -9999;
      this.energy = 0;                          // 0..1, rises while the cursor is in

      this.resize();
      let rt;
      this._onResize = () => { clearTimeout(rt); rt = setTimeout(() => this.resize(), 140); };
      addEventListener('resize', this._onResize, { passive: true });

      /* The constructor runs at DOMContentLoaded, before layout has
         settled, so the host can still measure 0 wide — which produced a
         1px-wide backing store that was redrawn every frame and showed
         nothing. Re-measure whenever the box actually changes size. */
      if (window.ResizeObserver) {
        let last = 0;
        new ResizeObserver(entries => {
          const w = entries[0].contentRect.width;
          if (w > 2 && Math.abs(w - last) > 1) { last = w; this.resize(); }
        }).observe(host);
      }

      /* Listen on the whole section, not the canvas. The canvas sits
         behind the copy at pointer-events:none so it can never swallow a
         click — which also means it would never see a pointermove. Track
         on the section and convert into canvas space. */
      if (!COARSE) {
        const zone = host.closest('section') || host.parentElement || host;
        zone.addEventListener('pointermove', e => {
          const r = host.getBoundingClientRect();
          this.tx = e.clientX - r.left;
          this.ty = e.clientY - r.top;
        }, { passive: true });
        zone.addEventListener('pointerleave', () => { this.tx = -9999; this.ty = -9999; }, { passive: true });
      }

      /* On touch there is no cursor, and cursor reaction is the entire
         point of these graphics. Animating them on a phone spends GPU
         and battery on motion nobody can interact with — so paint one
         static frame for the texture and never run the loop. Same for
         reduced-motion. This is a design decision for the phone, not
         the desktop version throttled. */
      if (COARSE || REDUCED) {
        new IntersectionObserver(([e], obs) => {
          if (!e.isIntersecting) return;
          this.visible = true; this.step(0.6); this.visible = false;
          obs.disconnect();
        }, { rootMargin: '120px 0px' }).observe(host);
        return;
      }

      new IntersectionObserver(([e]) => {
        this.visible = e.isIntersecting;
        if (this.visible) wake();
      }, { rootMargin: '120px 0px' }).observe(host);
    }

    resize() {
      const r = this.host.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 1.75);
      this.w = Math.max(1, r.width);
      this.h = Math.max(1, r.height);
      this.canvas.width  = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.canvas.style.width = this.w + 'px';
      this.canvas.style.height = this.h + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.build();
    }

    build() {
      const area = this.w * this.h;
      if (this.mode === 'grid') {
        this.gap = clamp(Math.sqrt(area / 620), 20, 40);
        this.cols = Math.ceil(this.w / this.gap) + 1;
        this.rows = Math.ceil(this.h / this.gap) + 1;
      } else if (this.mode === 'rings') {
        this.rings = Math.round(clamp(this.w / 46, 7, 20));
      } else {
        const n = Math.round(clamp(area / 1750, 60, 340));
        this.p = new Float32Array(n * 4);       // x, y, px, py — flat, no object churn
        for (let i = 0; i < n; i++) this.spawn(i, true);
        this.n = n;
      }
    }

    spawn(i, initial) {
      const o = i * 4;
      const x = Math.random() * this.w;
      const y = initial ? Math.random() * this.h : this.h + 8;
      this.p[o] = x; this.p[o + 1] = y; this.p[o + 2] = x; this.p[o + 3] = y;
    }

    /* pointer easing + energy, shared by every mode */
    trackPointer() {
      const inside = this.tx > -9998;
      this.energy += ((inside ? 1 : 0) - this.energy) * 0.06;
      if (inside) {
        if (this.px < -9998) { this.px = this.tx; this.py = this.ty; }
        this.px += (this.tx - this.px) * 0.12;
        this.py += (this.ty - this.py) * 0.12;
      }
    }

    step(t) {
      if (this.w < 2 || this.h < 2) return;   // not laid out yet: don't burn frames
      const c = this.ctx;
      this.trackPointer();
      if (this.mode === 'grid')  return this.grid(c, t);
      if (this.mode === 'rings') return this.ringsDraw(c, t);
      return this.flow(c, t);
    }

    /* ---------- FLOW: particles riding a field, cursor bends it ---------- */
    flow(c, t) {
      /* fade instead of clear — gives trails for one cheap fillRect */
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = 'rgba(247,245,240,0.085)';
      c.fillRect(0, 0, this.w, this.h);

      const p = this.p, n = this.n;
      const hasP = this.px > -9998;
      for (let i = 0; i < n; i++) {
        const o = i * 4;
        let x = p[o], y = p[o + 1];
        p[o + 2] = x; p[o + 3] = y;

        const a = field(x, y, t);
        let vx = Math.cos(a) * 1.25;
        let vy = Math.sin(a) * 1.25 - 0.32;     // gentle upward bias

        if (hasP) {
          const dx = x - this.px, dy = y - this.py;
          const d2 = dx * dx + dy * dy;
          if (d2 < 26000) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / 161) * 3.4 * this.energy;   // push out of the way
            vx += (dx / d) * f;
            vy += (dy / d) * f;
          }
        }

        x += vx; y += vy;
        if (x < -10 || x > this.w + 10 || y < -10 || y > this.h + 10) { this.spawn(i, false); continue; }
        p[o] = x; p[o + 1] = y;

        /* a slice of the field runs red — the accent, not the whole thing */
        const hot = (i % 9) === 0;
        c.strokeStyle = hot
          ? `rgba(${RED},${(0.5 + this.energy * 0.4).toFixed(2)})`
          : `rgba(${INK},${(0.24 + this.energy * 0.16).toFixed(2)})`;
        c.lineWidth = hot ? 1.5 : 1;
        c.beginPath();
        c.moveTo(p[o + 2], p[o + 3]);
        c.lineTo(x, y);
        c.stroke();
      }
    }

    /* ---------- GRID: lattice that bends around the cursor ---------- */
    grid(c, t) {
      c.clearRect(0, 0, this.w, this.h);
      const g = this.gap, hasP = this.px > -9998;
      for (let r = 0; r < this.rows; r++) {
        for (let col = 0; col < this.cols; col++) {
          const bx = col * g, by = r * g;
          /* slow travelling swell so it is never fully still */
          const w = Math.sin(bx * 0.014 + by * 0.01 - t * 1.15);
          let x = bx, y = by + w * 3.2;
          let s = 1.6 + w * 0.7;
          let red = 0;

          if (hasP) {
            const dx = bx - this.px, dy = by - this.py;
            const d2 = dx * dx + dy * dy;
            if (d2 < 34000) {
              const d = Math.sqrt(d2) || 1;
              const f = (1 - d / 184);
              const push = f * f * 26 * this.energy;
              x += (dx / d) * push;
              y += (dy / d) * push;
              s += f * f * 3.4 * this.energy;
              red = f * f * this.energy;
            }
          }
          if (s <= 0.2) continue;
          c.fillStyle = red > 0.04
            ? `rgba(${RED},${(0.30 + red * 0.7).toFixed(2)})`
            : `rgba(${INK},0.20)`;
          c.fillRect(x - s / 2, y - s / 2, s, s);
        }
      }
    }

    /* ---------- RINGS: concentric arcs, cursor pulls them open ---------- */
    ringsDraw(c, t) {
      c.clearRect(0, 0, this.w, this.h);
      const cx = this.w / 2, cy = this.h / 2;
      const base = Math.min(this.w, this.h) * 0.06;
      let ox = 0, oy = 0;
      if (this.px > -9998) {
        ox = (this.px - cx) * 0.14 * this.energy;
        oy = (this.py - cy) * 0.14 * this.energy;
      }
      for (let i = 0; i < this.rings; i++) {
        const k = i / this.rings;
        const rr = base + i * base * 0.92 + Math.sin(t * 0.9 - i * 0.42) * 5.5;
        const hot = i % 4 === 0;
        c.strokeStyle = hot
          ? `rgba(${RED},${(0.42 * (1 - k) + this.energy * 0.22).toFixed(2)})`
          : `rgba(${INK},${(0.20 * (1 - k)).toFixed(2)})`;
        c.lineWidth = hot ? 1.6 : 1;
        c.beginPath();
        /* each ring lags the cursor a little more than the last */
        c.arc(cx + ox * (k + 0.25), cy + oy * (k + 0.25), Math.max(1, rr), 0, 6.283);
        c.stroke();
      }
    }
  }

  const boot = () => {
    document.querySelectorAll('[data-motion]').forEach(el => {
      try { instances.push(new Motion(el)); } catch (e) { console.warn('motion:', e); }
    });
    if (instances.length) wake();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
