/* ============================================
   RETENCY — Interactions & animations
   ============================================ */
(function () {
  'use strict';

  // ---------- Lazy-load [data-hero-video] videos ----------
  const isPhone = window.matchMedia('(max-width: 768px)').matches;
  const isSlow  = (navigator.connection && /2g|slow-2g/.test(navigator.connection.effectiveType || '')) || false;
  document.querySelectorAll('[data-hero-video]').forEach((vid) => {
    // Truly slow networks only: keep poster. Phones DO get video (smaller variant).
    if (isSlow) {
      vid.removeAttribute('autoplay');
      vid.removeAttribute('loop');
      return;
    }
    const loadVideo = () => {
      const source = vid.querySelector('source[data-src]');
      if (source && !source.src) {
        let src = source.dataset.src;
        if (src.includes('cloudinary.com') && src.includes('/upload/')) {
          if (isPhone) {
            src = src.replace('/upload/', '/upload/w_720,br_700k,');
          } else if (window.innerWidth < 1100) {
            src = src.replace('/upload/', '/upload/w_1280,br_1500k,');
          }
        }
        source.src = src;
        vid.load();
        vid.play().catch(() => { /* autoplay blocked — poster stays */ });
      }
    };
    // Wait until idle so headlines paint first
    if ('requestIdleCallback' in window) requestIdleCallback(loadVideo, { timeout: 800 });
    else setTimeout(loadVideo, 500);
    // Pause when off-screen
    const vObs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) vid.play().catch(() => {});
      else vid.pause();
    }, { threshold: 0.1 });
    vObs.observe(vid);
  });

  // ---------- Portfolio circular gallery ----------
  initCircularGallery();

  // ---------- Trailer sound toggle ----------
  document.querySelectorAll('[data-sound-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const vid = document.getElementById(btn.dataset.soundToggle);
      if (!vid) return;
      vid.muted = !vid.muted;
      btn.querySelector('.ico-muted').style.display = vid.muted ? '' : 'none';
      btn.querySelector('.ico-sound').style.display = vid.muted ? 'none' : '';
      btn.querySelector('.lbl').textContent = vid.muted ? 'Sound' : 'Mute';
      if (!vid.muted) vid.play().catch(() => {});
    });
  });

  // ---------- Smooth scroll (Lenis) ----------
  let lenis;
  if (window.Lenis && window.matchMedia('(min-width: 768px)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  // ---------- Reveal on scroll ----------
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -80px 0px' });
  document.querySelectorAll('.reveal, .reveal-stagger').forEach((el) => observer.observe(el));

  // ---------- Service cards: mouse-tracked glow ----------
  document.querySelectorAll('.svc').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // ---------- Mobile menu ----------
  const burger = document.querySelector('.nav-burger');
  const drawer = document.querySelector('.mobile-menu');
  if (burger && drawer) {
    const closeDrawer = () => drawer.classList.remove('open');
    burger.addEventListener('click', () => drawer.classList.toggle('open'));
    drawer.querySelector('.mobile-menu-close')?.addEventListener('click', closeDrawer);
    drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeDrawer));
    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  // ---------- Hero orb subtle parallax ----------
  const orb = document.querySelector('.hero-orb');
  const hero = document.querySelector('.hero');
  if (orb && hero && window.matchMedia('(pointer: fine)').matches) {
    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / r.width;
      const dy = (e.clientY - r.top - r.height / 2) / r.height;
      orb.style.transform = `translate(calc(-50% + ${dx * 24}px), calc(-50% + ${dy * 24}px))`;
    });
  }

  // ---------- Smooth anchor links ----------
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          if (lenis) lenis.scrollTo(target, { offset: -80 });
          else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // ---------- Contact form -> Airtable (no mailto fallback) ----------
  const form = document.querySelector('.contact-form');
  if (form) {
    const AIRTABLE_TOKEN = 'patuOIf443aDYoRyO.481ad6586bea9f9e24192967330f8d84fbd07c0581770f97cee1da5ccff6b298';
    const BASE_ID  = 'appwu9VFeVwRjN91T';
    const TABLE_ID = 'tbl6HI3c48n2Haw51';

    const btn = form.querySelector('.form-submit');
    const originalHTML = btn ? btn.innerHTML : '';

    // Inject an error message slot below the button
    let errBox = form.querySelector('.form-error');
    if (!errBox) {
      errBox = document.createElement('div');
      errBox.className = 'form-error';
      errBox.style.cssText = 'display:none;margin-top:14px;padding:12px 14px;border-radius:10px;background:rgba(214,47,60,0.08);border:1px solid rgba(214,47,60,0.3);color:#f6a8ae;font-size:13px;line-height:1.5;font-family:var(--f-body)';
      btn.insertAdjacentElement('afterend', errBox);
    }

    // Honeypot anti-spam
    if (!form.querySelector('[name="website"]')) {
      const hp = document.createElement('input');
      hp.type = 'text'; hp.name = 'website'; hp.tabIndex = -1; hp.autocomplete = 'off';
      hp.style.cssText = 'position:absolute;left:-9999px;opacity:0;pointer-events:none;height:0';
      hp.setAttribute('aria-hidden', 'true');
      form.appendChild(hp);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));

      if (d.website) { return; } // honeypot
      const last = +sessionStorage.getItem('retency_last_submit') || 0;
      if (Date.now() - last < 10000) { return; }
      sessionStorage.setItem('retency_last_submit', Date.now());

      errBox.style.display = 'none';
      if (btn) { btn.disabled = true; btn.innerHTML = 'Sending…'; }

      try {
        const payload = {
          records: [{
            fields: {
              Name:    d.name    || '',
              Email:   d.email   || '',
              Brand:   d.brand   || '',
              Budget:  d.budget  || '',
              Service: d.service || '',
              Message: d.message || '',
            }
          }],
          typecast: true
        };

        const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errBody = await res.text();
          console.error('Airtable error', res.status, errBody);
          throw new Error(`${res.status}: ${errBody}`);
        }

        if (btn) {
          btn.innerHTML = '✓ Sent — we’ll reply within 24 hours';
          btn.style.background = 'var(--copper)';
          btn.style.color = 'var(--bg)';
        }
        form.querySelectorAll('input, textarea, select').forEach(f => f.disabled = true);

      } catch (err) {
        console.error('Submission failed:', err);
        errBox.innerHTML = `
          <strong>We couldn't save your submission.</strong><br/>
          Please email us directly at <a href="mailto:retencymedia@gmail.com" style="color:var(--copper);text-decoration:underline">retencymedia@gmail.com</a> — we'll respond within 24 hours.
        `;
        errBox.style.display = 'block';
        if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
      }
    });
  }

  // ---------- Mobile sticky CTA: show after hero scrolls past ----------
  try {
    const stickyCta = document.getElementById('mobileStickyCta');
    const heroEl = document.querySelector('.hero');
    if (stickyCta && heroEl && window.matchMedia('(max-width: 768px)').matches) {
      const heroObs = new IntersectionObserver(([entry]) => {
        stickyCta.classList.toggle('visible', !entry.isIntersecting);
      }, { threshold: 0 });
      heroObs.observe(heroEl);
    }
  } catch (e) { /* silent */ }

  // =========================================================
  // Circular video gallery — buttery-smooth single-rAF lerp loop
  // =========================================================
  function initCircularGallery() {
    const stage = document.getElementById('circStage');
    const ring  = document.getElementById('circRing');
    if (!stage || !ring) return;

    const cards = Array.from(ring.querySelectorAll('.circ-card'));
    if (!cards.length) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    // ----- Mobile: horizontal scroll snap, no 3D -----
    if (isMobile) {
      // Mobile-only Cloudinary transform — smaller bitrate + width
      const mobileSrc = (raw) => {
        if (!raw || !raw.includes('cloudinary.com') || !raw.includes('/upload/')) return raw;
        return raw.replace('/upload/', '/upload/w_540,br_500k,');
      };
      const mvObs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const v = entry.target.querySelector('video');
          if (!v) return;
          if (entry.isIntersecting) {
            const src = v.getAttribute('data-src');
            if (src && !v.src) { v.src = mobileSrc(src); v.load(); }
            v.play().catch(()=>{});
          } else { v.pause(); }
        });
      }, { threshold: 0.6, rootMargin: '0px 100px' });
      cards.forEach((c) => mvObs.observe(c));
      return;
    }

    // ----- Desktop: 3D ring with smooth rAF + lerp -----
    const N = cards.length;
    const step = 360 / N;

    // Adaptive radius: never overlaps
    const computeRadius = () => {
      const cw = cards[0].getBoundingClientRect().width || 260;
      const minR = Math.round(cw / (2 * Math.tan(Math.PI / N)) * 1.25);
      return Math.max(420, Math.min(680, minR));
    };
    let radius = computeRadius();
    cards.forEach((c, i) => {
      c.style.setProperty('--a', `${i * step}deg`);
      c.style.setProperty('--radius', `${radius}px`);
    });

    // Build dots
    const dotsEl = document.getElementById('circDots');
    if (dotsEl) {
      dotsEl.innerHTML = '';
      cards.forEach((_, i) => {
        const b = document.createElement('button');
        b.className = 'circ-dot';
        b.type = 'button';
        b.setAttribute('aria-label', `Go to slide ${i + 1}`);
        b.addEventListener('click', () => goTo(i));
        dotsEl.appendChild(b);
      });
    }
    const dots = () => Array.from(document.querySelectorAll('.circ-dot'));

    // State — separate "target" and "current" so we can lerp smoothly
    let target  = 0;       // where we want to be (degrees)
    let current = 0;       // where we actually are
    let manual  = false;   // user just clicked something → pause drift briefly
    let manualTimer = null;
    let inView  = false;
    let lastFront = -1;

    // CSS transition is OFF — we control transform every frame via JS
    ring.style.transition = 'none';
    ring.style.willChange = 'transform';

    const updateFrontCard = () => {
      const norm = ((-current % 360) + 360) % 360;
      const front = Math.round(norm / step) % N;
      if (front === lastFront) return;
      lastFront = front;
      cards.forEach((c, i) => c.classList.toggle('is-front', i === front));
      dots().forEach((d, i) => d.classList.toggle('active', i === front));
      cards.forEach((c, i) => {
        const v = c.querySelector('video');
        if (!v) return;
        if (i === front) v.play().catch(()=>{});
        else v.pause();
      });
    };

    // Snap to a card
    const goTo = (idx) => {
      manual = true;
      clearTimeout(manualTimer);
      manualTimer = setTimeout(() => { manual = false; }, 2500);
      target = -idx * step;
    };

    document.querySelector('[data-circ-prev]')?.addEventListener('click', () => {
      const cur = Math.round(((-current % 360) + 360) % 360 / step) % N;
      goTo((cur - 1 + N) % N);
    });
    document.querySelector('[data-circ-next]')?.addEventListener('click', () => {
      const cur = Math.round(((-current % 360) + 360) % 360 / step) % N;
      goTo((cur + 1) % N);
    });

    // Lazy-load + visibility
    const ioStage = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) {
        cards.forEach((c) => {
          const v = c.querySelector('video');
          const src = v?.getAttribute('data-src');
          if (src && !v.src) { v.src = src; v.load(); }
        });
      } else {
        cards.forEach((c) => c.querySelector('video')?.pause());
      }
    }, { threshold: 0.15 });
    ioStage.observe(stage);

    // ---- Single rAF loop — lerp for smoothness ----
    const DRIFT_SPEED = 0.12;   // deg/frame — gentle continuous rotation
    const LERP        = 0.085;  // 0..1 — higher = snappier, lower = silkier

    const tick = () => {
      if (inView && !manual) {
        target -= DRIFT_SPEED;
      }
      // smooth interpolation toward target
      const diff = target - current;
      if (Math.abs(diff) < 0.001) {
        current = target;
      } else {
        current += diff * LERP;
      }
      // single transform write per frame
      ring.style.transform = `rotateY(${current}deg)`;
      updateFrontCard();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Resize handler
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        radius = computeRadius();
        cards.forEach((c) => c.style.setProperty('--radius', `${radius}px`));
      }, 120);
    });
  }
})();
