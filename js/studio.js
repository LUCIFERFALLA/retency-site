/* ============================================================
   RETENCY · STUDIO
   Scroll-driven reel · infinite momentum rail · HUD · cursor
   One rAF loop. Transform-only. No WebGL, no framework.
   ============================================================ */
(() => {
  'use strict';

  const html = document.documentElement;
  html.classList.add('js');

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE  = matchMedia('(hover: none), (pointer: coarse)').matches;
  const NARROW  = matchMedia('(max-width: 768px)').matches;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp  = (a, b, t) => a + (b - a) * t;

  /* one shared ticker so we never stack rAF loops */
  const tasks = [];
  let ticking = false;
  const onTick = fn => { tasks.push(fn); if (!ticking) { ticking = true; requestAnimationFrame(run); } };
  function run(now) {
    requestAnimationFrame(run);
    for (let i = 0; i < tasks.length; i++) tasks[i](now);
  }

  /* ==========================================================
     0 · HERO — scattered client work converges into a reel
     ========================================================== */
  function initHeroX() {
    const hx = document.querySelector('[data-hx]');
    if (!hx) return;
    const tiles  = [...hx.querySelectorAll('.hx-tile')];
    const copy   = hx.querySelector('.hx-copy');
    const banner = hx.querySelector('.hx-banner');
    if (!tiles.length) return;

    if (REDUCED) { tiles.forEach(t => t.style.opacity = 0); return; }

    const N = tiles.length;
    const conf = tiles.map(t => ({
      el: t,
      sx: parseFloat(t.style.getPropertyValue('--sx')) || 0,
      sy: parseFloat(t.style.getPropertyValue('--sy')) || 0,
      sr: parseFloat(t.style.getPropertyValue('--sr')) || 0
    }));

    // wake the videos only while the hero is on screen
    let live = false;
    new IntersectionObserver(([e]) => {
      live = e.isIntersecting;
      tiles.forEach(t => {
        const v = t.querySelector('video'); if (!v) return;
        if (live) {
          const s = v.querySelector('source[data-src]');
          if (s && !s.src) { s.src = s.dataset.src; v.load(); }
          const p = v.play(); if (p && p.catch) p.catch(() => {});
        } else if (!v.paused) v.pause();
      });
    }, { rootMargin: '200px 0px' }).observe(hx);

    let mx = 0, my = 0, px = 0, py = 0;
    if (!COARSE) {
      addEventListener('pointermove', e => {
        mx = (e.clientX / innerWidth - 0.5) * 2;
        my = (e.clientY / innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    const field = hx.querySelector('.hx-field');
    const hint  = hx.querySelector('.hx-rowhint');
    let cur = 0, carousel = false, lastJ = -1, paused = false;
    // carousel state for the joined row
    let off = 0, vel = 0, dragging = false, lastX = 0, moved = 0;
    const SPAN = () => N * clamp(innerWidth * 0.152, 96, 210);
    if (field) {
      let downX = 0, downY = 0, claimed = false;
      // Leave dead space at the screen edges on touch. A thumb coming
      // down the side of the phone to scroll should never be able to
      // grab the reel by accident — the drag only arms away from the
      // edges, where the gesture is unambiguous.
      const EDGE = () => (COARSE ? 28 : 0);
      field.addEventListener('pointerdown', e => {
        if (!carousel) return;
        const m = EDGE();
        if (m && (e.clientX < m || e.clientX > innerWidth - m)) return;
        dragging = true; claimed = false; moved = 0;
        lastX = e.clientX; downX = e.clientX; downY = e.clientY;
      });
      field.addEventListener('pointermove', e => {
        if (!dragging) return;
        if (!claimed) {
          const adx = Math.abs(e.clientX - downX), ady = Math.abs(e.clientY - downY);
          if (adx < 8 && ady < 8) return;          // not yet a gesture
          if (ady * (COARSE ? 0.75 : 1) > adx) { dragging = false; return; }  // vertical -> let the page scroll
          claimed = true;
          field.classList.add('dragging');
          try { field.setPointerCapture(e.pointerId); } catch (_) {}
        }
        const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
        off -= dx; vel = -dx * 1.4;
      });
      const end = () => { dragging = false; field.classList.remove('dragging'); };
      field.addEventListener('pointerup', end);
      field.addEventListener('pointercancel', end);
      field.addEventListener('wheel', e => {
        if (!carousel || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault(); vel += e.deltaX * 0.5;
      }, { passive: false });
    }
    onTick(() => {
      const r = hx.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;   // offscreen: do nothing
      const total = Math.max(1, r.height - innerHeight);
      const raw = clamp(-r.top / total, 0, 1);
      cur = lerp(cur, raw, 0.12);
      px = lerp(px, mx, 0.06);
      py = lerp(py, my, 0.06);

      // phase A (0 -> .48): drift behind the copy, faint
      // phase B (.48 -> 1): converge into a row, scale up, opaque
      const conv = clamp((cur - 0.42) / 0.58, 0, 1);
      const eased = conv * conv * (3 - 2 * conv);
      const vw = innerWidth / 100, vh = innerHeight / 100;
      const step = clamp(innerWidth * 0.152, 96, 210);

      for (let i = 0; i < N; i++) {
        const c = conf[i];
        let ex = (i - (N - 1) / 2) * step;        // row target, px
        if (carousel) {                            // wrap into an endless belt
          const span = SPAN();
          ex = (((ex - off) % span) + span * 1.5) % span - span / 2;
        }

        // On a phone the copy sits low-left and the scattered clips used to
        // land straight on it. Rather than fading the work into nothing —
        // the clips ARE the product — bias the whole drift upward so they
        // own the top of the screen and the copy owns the bottom. The bias
        // eases out as they converge into the row.
        // Keep the clips out of the copy. On a phone that means pushing
        // them up (copy is bottom-left); on desktop it means pushing them
        // up AND right, so the type owns the lower-left quadrant and the
        // work owns the upper-right. Both biases ease out as the row
        // converges, so the joined belt still lands dead centre.
        const yBias = (1 - eased) * -innerHeight * (NARROW ? 0.17 : 0.13);
        const xBias = NARROW ? 0 : (1 - eased) * innerWidth * 0.13;
        const y = lerp(c.sy * vh * (NARROW ? 0.55 : 1), 0, eased) + yBias + py * (8 - i * 0.9);
        const x = lerp(c.sx * vw, ex, eased) + xBias + px * (10 - i * 1.1);
        const rot = lerp(c.sr, 0, eased);
        const sc = lerp(0.92, 1.24, eased);
        // They sit in their own zone on a phone now, so they no longer
        // need to be faded almost to nothing to keep the copy readable.
        const op = lerp(NARROW ? 0.5 : 0.30, 1, eased);
        c.el.style.transform =
          `translate(-50%,-50%) translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        c.el.style.opacity = op.toFixed(3);
      }

      if (carousel) {
        if (!dragging) vel *= 0.93;
        off += vel * 0.06 + 0.30;
      }

      if (copy) {
        const fade = clamp((cur - 0.34) / 0.30, 0, 1);
        copy.style.transform = `translate3d(0,${(-fade * 64).toFixed(1)}px,0)`;
        copy.style.opacity = (1 - fade * 0.96).toFixed(3);
        copy.style.pointerEvents = fade > 0.7 ? 'none' : '';
      }

      // once joined: the row blurs back into one slab, the title forms over
      // it, and the belt keeps drifting underneath (still draggable).
      // Blur is applied ONCE to the container and the clips pause while
      // blurred — filtering live video per-element destroys the framerate.
      const join = clamp((eased - 0.62) / 0.38, 0, 1);
      const j = join * join * (3 - 2 * join);
      carousel = j > 0.35;
      if (Math.abs(j - lastJ) > 0.004) {
        lastJ = j;
        if (field) {
          field.style.filter = j > 0.01
            ? `blur(${(j * 11).toFixed(1)}px) brightness(${(1 - j * 0.7).toFixed(2)}) saturate(${(1 - j * 0.3).toFixed(2)})`
            : '';
        }
        if (banner) {
          banner.style.opacity = j.toFixed(3);
          banner.style.transform = `translate(-50%,-50%) translate3d(0,${((1 - j) * 26).toFixed(1)}px,0)`;
          banner.classList.toggle('on', j > 0.55);
        }
        if (hint) hint.classList.toggle('on', j > 0.62);

        const shouldPause = j > 0.4;
        if (shouldPause !== paused) {
          paused = shouldPause;
          for (let i = 0; i < N; i++) {
            const v = conf[i].el.querySelector('video');
            if (!v) continue;
            if (paused) { if (!v.paused) v.pause(); }
            else { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
          }
        }
      }
    });
  }

  /* ==========================================================
     0b · SWARAJYA — title, film opens, invitation
     ========================================================== */
  function initSwarajya() {
    const sec = document.querySelector('[data-swa]');
    if (!sec) return;
    const frame  = sec.querySelector('.swa-frame');
    const lead   = sec.querySelector('.swa-lead');
    const invite = sec.querySelector('.swa-invite');
    const vid    = sec.querySelector('video');
    if (!frame) return;

    let armed = false;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!armed && vid) {
          armed = true;
          const s = vid.querySelector('source[data-src]');
          if (s && !s.src) { s.src = s.dataset.src; vid.load(); }
        }
        const p = vid?.play(); if (p && p.catch) p.catch(() => {});
      } else if (vid && !vid.paused) vid.pause();
    }, { rootMargin: '300px 0px' }).observe(sec);

    if (REDUCED) return;
    const START = COARSE ? 0.86 : 0.52;
    let cur = 0;

    onTick(() => {
      const r = sec.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const total = Math.max(1, r.height - innerHeight);
      cur = lerp(cur, clamp(-r.top / total, 0, 1), 0.13);

      // the film opens across the first 62%
      const o = clamp(cur / 0.62, 0, 1);
      const eo = o * o * (3 - 2 * o);
      frame.style.transform = `scale(${(START + (1 - START) * eo).toFixed(4)})`;
      frame.style.borderRadius = `${((1 - eo) * (COARSE ? 14 : 26)).toFixed(1)}px`;

      // title leads, then lifts away
      if (lead) {
        const away = clamp((cur - 0.42) / 0.26, 0, 1);
        lead.style.transform = `translate3d(0,${(-away * 70).toFixed(1)}px,0) scale(${(1 - away * 0.10).toFixed(3)})`;
        lead.style.opacity = (1 - away).toFixed(3);
      }
      // invitation arrives once the film is open
      if (invite) {
        const inn = clamp((cur - 0.60) / 0.22, 0, 1);
        invite.style.opacity = inn.toFixed(3);
        invite.style.transform = `translateX(-50%) translate3d(0,${((1 - inn) * 26).toFixed(1)}px,0)`;
        invite.classList.toggle('on', inn > 0.6);
      }
    });
  }

  /* ==========================================================
     1 · REEL — showreel grows as you scroll through it
     ========================================================== */
  function initReel() {
    const runway = document.querySelector('[data-reel]');
    if (!runway) return;
    const frame = runway.querySelector('.reel-frame');
    const vid   = runway.querySelector('video');
    const bar   = runway.querySelector('.reel-bar');
    if (!frame) return;

    const START = COARSE ? 0.82 : 0.56;   // starting scale
    let cur = START, target = START, prog = 0;

    if (REDUCED) { frame.style.transform = 'none'; return; }

    // lazy source
    const load = () => {
      const s = vid?.querySelector('source[data-src]');
      if (s && !s.src) { s.src = s.dataset.src; vid.load(); }
    };
    let armed = false;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!armed) { armed = true; load(); }
        const p = vid?.play(); if (p && p.catch) p.catch(() => {});
      } else if (vid && !vid.paused) vid.pause();
    }, { rootMargin: '300px 0px' }).observe(runway);

    onTick(() => {
      const r = runway.getBoundingClientRect();
      const total = Math.max(1, r.height - innerHeight);
      prog = clamp(-r.top / total, 0, 1);
      // expand across the first 70% of the runway, then hold full-bleed
      const e = clamp(prog / 0.70, 0, 1);
      const eased = e * e * (3 - 2 * e);            // smoothstep
      target = START + (1 - START) * eased;
      cur = lerp(cur, target, 0.14);
      frame.style.transform = `scale(${cur.toFixed(4)})`;
      frame.style.borderRadius = `${(1 - eased) * (COARSE ? 16 : 26)}px`;
      if (bar) bar.style.width = (prog * 100).toFixed(2) + '%';
    });
  }

  /* ==========================================================
     2 · INFINITE RAIL — wheel + drag + page-scroll momentum
     ========================================================== */
  function initRail() {
    const view = document.querySelector('[data-rail]');
    if (!view) return;
    const track = view.querySelector('.rail-track');
    if (!track) return;

    const originals = [...track.children];
    if (!originals.length) return;

    let guard = 0;
    while (track.scrollWidth < innerWidth * 2.4 && guard++ < 8) {
      originals.forEach(n => track.appendChild(n.cloneNode(true)));
    }

    let setW = 0;
    const measure = () => {
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      setW = originals.reduce((s, n) => s + n.getBoundingClientRect().width + gap, 0);
    };
    measure();
    addEventListener('resize', measure, { passive: true });

    let off = 0, vel = 0, dragging = false, lastX = 0, moved = 0;
    const DRIFT = REDUCED ? 0 : 0.32;

    view.addEventListener('wheel', e => {
      const horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (horiz) e.preventDefault();
      vel += (horiz ? e.deltaX : e.deltaY) * 0.5;
    }, { passive: false });

    // page scroll drives it too — scrolling keeps the rail travelling
    let lastY = scrollY;
    addEventListener('scroll', () => {
      const dy = scrollY - lastY; lastY = scrollY;
      const r = view.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) vel += dy * 0.85;
    }, { passive: true });

    let downX = 0, downY = 0, claimed = false;
    view.addEventListener('pointerdown', e => {
      dragging = true; claimed = false; moved = 0;
      lastX = e.clientX; downX = e.clientX; downY = e.clientY;
    });
    view.addEventListener('pointermove', e => {
      if (!dragging) return;
      if (!claimed) {
        const adx = Math.abs(e.clientX - downX), ady = Math.abs(e.clientY - downY);
        if (adx < 8 && ady < 8) return;
        if (ady > adx) { dragging = false; return; }   // vertical -> page scrolls
        claimed = true;
        try { view.setPointerCapture(e.pointerId); } catch (_) {}
      }
      const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
      off -= dx; vel = -dx * 1.5;
    });
    const end = () => { dragging = false; };
    view.addEventListener('pointerup', end);
    view.addEventListener('pointercancel', end);
    view.addEventListener('click', e => { if (moved > 8) { e.preventDefault(); e.stopPropagation(); } }, true);

    const cards = [...track.children];
    let vis = false;
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; }, { rootMargin: '200px 0px' }).observe(view);

    let n = 0;
    function media() {
      const vr = view.getBoundingClientRect();
      let playing = 0;
      for (const c of cards) {
        const v = c.querySelector('video');
        if (!v) continue;
        const r = c.getBoundingClientRect();
        const on = vis && r.right > vr.left - 60 && r.left < vr.right + 60;
        if (on && playing < 4) {
          playing++;
          const s = v.querySelector('source[data-src]');
          if (s && !s.src) { s.src = s.dataset.src; v.load(); }
          if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
        } else if (!v.paused) v.pause();
      }
    }

    onTick(() => {
      if (!vis) return;
      if (!dragging) vel *= 0.93;
      off += vel * 0.06 + DRIFT;
      if (setW > 0) off = ((off % setW) + setW) % setW;
      track.style.transform = `translate3d(${-off.toFixed(2)}px,0,0)`;
      if (++n % 18 === 0) media();
    });
  }

  /* ==========================================================
     3 · HUD
     ========================================================== */
  function initHud() {
    const hud = document.querySelector('.hud');
    if (!hud) return;
    const coord = hud.querySelector('[data-coord]');
    const clock = hud.querySelector('[data-clock]');
    const prog  = hud.querySelector('.hud-prog');
    const scr   = hud.querySelector('[data-scrollpct]');

    requestAnimationFrame(() => hud.classList.add('ready'));

    if (clock) {
      const p = n => String(n).padStart(2, '0');
      const tick = () => {
        const d = new Date();
        const ist = new Date(d.getTime() + (d.getTimezoneOffset() + 330) * 60000);
        clock.textContent = `IST ${p(ist.getHours())}:${p(ist.getMinutes())}:${p(ist.getSeconds())}`;
      };
      tick(); setInterval(tick, 1000);
    }

    if (coord && !COARSE) {
      let x = 0, y = 0, q = false;
      addEventListener('pointermove', e => {
        x = e.clientX; y = e.clientY;
        if (q) return; q = true;
        requestAnimationFrame(() => {
          q = false;
          coord.textContent = `X ${String(Math.round(x)).padStart(4,'0')}  Y ${String(Math.round(y)).padStart(4,'0')}`;
        });
      }, { passive: true });
    }

    let q2 = false;
    addEventListener('scroll', () => {
      if (q2) return; q2 = true;
      requestAnimationFrame(() => {
        q2 = false;
        const max = html.scrollHeight - innerHeight;
        const p = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
        if (prog) prog.style.transform = `scaleY(${p.toFixed(4)})`;
        if (scr)  scr.textContent = `${String(Math.round(p * 100)).padStart(3,'0')}%`;
      });
    }, { passive: true });
  }

  /* ==========================================================
     4 · CURSOR — magnetic, and flips on dark bands
     ========================================================== */
  function initCursor() {
    if (COARSE || REDUCED) return;
    const dot  = document.querySelector('.cur');
    const ring = document.querySelector('.cur-ring');
    if (!dot || !ring) return;
    const lbl = ring.querySelector('.lbl');

    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      const el = document.elementFromPoint(mx, my);
      const dark = !!el?.closest?.('.band, .reel-runway, .footer, .marquee-section, .rail-view');
      dot.classList.toggle('on-dark', dark);
      ring.classList.toggle('on-dark', dark);
    }, { passive: true });

    onTick(() => {
      rx = lerp(rx, mx, 0.17); ry = lerp(ry, my, 0.17);
      dot.style.transform  = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx.toFixed(2)}px,${ry.toFixed(2)}px) translate(-50%,-50%)`;
    });

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
     5 · KINETIC TYPE + REVEALS
     ========================================================== */
  function splitChars(el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    const walk = node => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const token of n.nodeValue.split(/(\s+)/)) {
            if (!token) continue;
            if (/^\s+$/.test(token)) { frag.appendChild(document.createTextNode(' ')); continue; }
            const word = document.createElement('span');
            word.className = 'kt-word';
            for (const ch of token) {
              const w = document.createElement('span'); w.className = 'kt kt-armed';
              const i = document.createElement('span'); i.textContent = ch;
              w.appendChild(i); word.appendChild(w);
            }
            frag.appendChild(word);
          }
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains('kt')) walk(n);
      }
    };
    walk(el);
  }

  function initType() {
    const heads = [...document.querySelectorAll('[data-kinetic]')];
    if (!REDUCED) heads.forEach(splitChars);

    const play = el => {
      el.querySelectorAll('.kt > span').forEach((s, i) => {
        s.style.transition = 'transform .95s cubic-bezier(0.16,1,0.3,1)';
        s.style.transitionDelay = `${Math.min(i * 20, 640)}ms`;
        s.style.transform = 'translateY(0)';
      });
    };

    const io = new IntersectionObserver(es => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        if (e.target.hasAttribute('data-kinetic')) play(e.target);
        else e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    heads.forEach(h => io.observe(h));
    document.querySelectorAll('.sr').forEach(n => io.observe(n));

    // never let content stay hidden
    setTimeout(() => {
      heads.forEach(play);
      document.querySelectorAll('.sr').forEach(n => n.classList.add('in'));
    }, 2600);
  }

  /* ==========================================================
     6 · SECTION MOTION — auto-reveal + counting numbers
     ========================================================== */
  function initSections() {
    if (!document.body.classList.contains('studio')) return;

    // tag the meaningful blocks so nothing arrives statically
    const SEL = [
      '.section-head > *', '.svc', '.work-card', '.testimonial', '.process-step',
      '.timeline-item', '.blog-card', '.trust-cell', '.founder-portrait',
      '.founder-note', '.contact-form', '.faq-item', '.price-card', '.retainer-card'
    ].join(',');

    const nodes = [...document.querySelectorAll(SEL)]
      .filter(n => !n.closest('[data-hx],[data-swa],.rail-track'));
    nodes.forEach(n => n.classList.add('rv'));

    const io = new IntersectionObserver(es => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    nodes.forEach(n => io.observe(n));

    // never leave anything hidden
    setTimeout(() => nodes.forEach(n => n.classList.add('in')), 2800);

    // numbers count up when they arrive
    if (REDUCED) return;
    const nums = [...document.querySelectorAll('.hx-stat b, .testi-metric em')];
    const cio = new IntersectionObserver(es => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        cio.unobserve(el);
        const raw = el.textContent.trim();
        const m = raw.match(/^([^\d]*)(\d[\d,.]*)(.*)$/);
        if (!m) continue;
        const [, pre, numStr, post] = m;
        const target = parseFloat(numStr.replace(/,/g, ''));
        if (!isFinite(target)) continue;
        const dec = (numStr.split('.')[1] || '').length;
        const t0 = performance.now(), DUR = 1100;
        const step = now => {
          const p = clamp((now - t0) / DUR, 0, 1);
          const v = target * (1 - Math.pow(1 - p, 3));
          el.textContent = pre + v.toFixed(dec) + post;
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = raw;
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.6 });
    nums.forEach(n => cio.observe(n));
  }

  /* ==========================================================
     7 · SIGNAL — a generative motion graphic for data sections.
     Pure canvas. ~0 payload. Draws a live "creative pipeline":
     particles enter as noise, get shaped, exit as a clean wave.
     ========================================================== */
  function initSignal() {
    const host = document.querySelector('[data-signal]');
    if (!host || REDUCED) return;
    const cv = document.createElement('canvas');
    cv.className = 'sig-canvas';
    host.appendChild(cv);
    const ctx = cv.getContext('2d', { alpha: true });
    if (!ctx) return;

    let W = 0, H = 0, DPR = 1, live = false, t = 0;
    const P = [];

    function size() {
      DPR = Math.min(devicePixelRatio || 1, 2);
      const r = host.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = W * DPR; cv.height = H * DPR;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const want = Math.round(clamp(W / 16, 26, 78));
      P.length = 0;
      for (let i = 0; i < want; i++) {
        P.push({ p: Math.random(), s: 0.0012 + Math.random() * 0.0022, o: Math.random() * 6.283, a: 0.25 + Math.random() * 0.6 });
      }
    }
    size();
    addEventListener('resize', size, { passive: true });

    new IntersectionObserver(([e]) => { live = e.isIntersecting; }, { threshold: 0.02 }).observe(host);

    onTick(() => {
      if (!live || W < 2) return;
      t += 0.006;
      ctx.clearRect(0, 0, W, H);
      const midY = H * 0.5;

      // the resolved signal line — chaos on the left, order on the right
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(230,56,70,0.20)';
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12) {
        const n = x / W;
        const chaos = (Math.sin(x * 0.09 + t * 5) + Math.sin(x * 0.041 - t * 3.3)) * 14 * (1 - n);
        const order = Math.sin(n * 6.5 - t * 2.2) * 16 * n;
        const y = midY + chaos + order;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();

      // particles travelling the pipeline
      for (const q of P) {
        q.p += q.s;
        if (q.p > 1) q.p = 0;
        const n = q.p, x = n * W;
        const chaos = (Math.sin(x * 0.09 + t * 5 + q.o) + Math.sin(x * 0.041 - t * 3.3)) * 15 * (1 - n);
        const order = Math.sin(n * 6.5 - t * 2.2) * 16 * n;
        const y = midY + chaos + order + Math.sin(q.o + t) * 5 * (1 - n);
        const r = 0.8 + n * 1.7;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 6.283);
        ctx.fillStyle = n > 0.62
          ? `rgba(230,56,70,${(q.a * n).toFixed(3)})`
          : `rgba(12,12,14,${(q.a * 0.42).toFixed(3)})`;
        ctx.fill();
      }
    });
  }

  /* ==========================================================
     6 · FOUNDER — portrait clears, the quote arrives a word at
     a time as you scroll, the signature draws itself.
     ========================================================== */
  function initFounder() {
    const sec = document.querySelector('[data-fnd]');
    if (!sec) return;

    /* signature: set the real path length so the dash animation is exact */
    const path = sec.querySelector('.fnd-sign-path');
    if (path && path.getTotalLength) {
      const len = Math.ceil(path.getTotalLength());
      path.style.setProperty('--len', len);
    }

    /* wrap every word so it can be lifted independently. Walk text nodes
       only, so the <em> accents survive untouched. */
    const quote = sec.querySelector('[data-fnd-quote]');
    let words = [];
    if (quote) {
      const walker = document.createTreeWalker(quote, NodeFilter.SHOW_TEXT);
      const nodes = [];
      let n; while ((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(node => {
        const parts = node.textContent.split(/(\s+)/);
        if (parts.length < 2) return;
        const frag = document.createDocumentFragment();
        parts.forEach(p => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          const s = document.createElement('span');
          s.className = 'fnd-w';
          s.textContent = p;
          frag.appendChild(s);
        });
        node.parentNode.replaceChild(frag, node);
      });
      words = [...quote.querySelectorAll('.fnd-w')];
    }

    /* arrival: clears the portrait, draws the signature, counts the facts */
    let counted = false;
    new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      sec.classList.add('is-in');
      if (counted) return;
      counted = true;
      sec.querySelectorAll('.fnd-fact b').forEach(el => {
        const target = parseInt(el.dataset.count, 10);
        if (!target) return;
        if (REDUCED) { el.textContent = target; return; }
        const t0 = performance.now(), dur = 1500;
        const step = now => {
          const p = clamp((now - t0) / dur, 0, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.28 }).observe(sec);

    if (REDUCED || !words.length) return;

    /* scrub the words in against scroll position through the section */
    words.forEach(w => { w.style.opacity = '0'; w.style.transform = 'translate3d(0,14px,0)'; });
    const portrait = sec.querySelector('.fnd-portrait-inner');
    let last = -1;

    onTick(() => {
      const r = sec.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;   // offscreen: idle

      /* 0 when the section's top hits 85% of the viewport, 1 by 35% */
      const p = clamp((innerHeight * 0.85 - r.top) / (innerHeight * 0.5), 0, 1);
      if (Math.abs(p - last) < 0.004) return;
      last = p;

      const n = words.length;
      for (let i = 0; i < n; i++) {
        /* each word gets its own slice of the runway, with overlap */
        const start = (i / n) * 0.72;
        const wp = clamp((p - start) / 0.28, 0, 1);
        const e = wp * wp * (3 - 2 * wp);
        words[i].style.opacity = e.toFixed(3);
        words[i].style.transform = `translate3d(0,${((1 - e) * 14).toFixed(2)}px,0)`;
      }
      if (portrait) {
        portrait.style.transform = `translate3d(0,${((1 - p) * -22).toFixed(1)}px,0)`;
      }
    });
  }

  /* ==========================================================
     BOOT
     ========================================================== */
  const boot = () => {
    const safe = (fn, n) => { try { fn(); } catch (e) { console.warn('studio:' + n, e); } };
    safe(initHeroX, 'herox');
    safe(initSwarajya, 'swarajya');
    safe(initReel, 'reel');
    safe(initRail, 'rail');
    safe(initType, 'type');
    safe(initSections, 'sections');
    safe(initSignal, 'signal');
    safe(initFounder, 'founder');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
