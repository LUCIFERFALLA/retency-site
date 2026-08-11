# RETENCY — CONTINUATION PROMPT

Copy everything below the line into a new chat.

---

I'm Parth Agarwal, founder of **Retency**, an AI-native creative studio in Bengaluru. You're continuing an in-progress redesign of my site. Read all of this before touching anything.

## PROJECT

- **Path:** `D:\CLAUDE CODE\retency-site\`
- **Live:** https://retency.in (Vercel, auto-deploys on push to `main`)
- **Repo:** https://github.com/LUCIFERFALLA/retency-site
- Static HTML/CSS/JS. **No Node, no build step.** Windows, PowerShell + Bash.
- **You run git yourself:** `git add . && git commit -m "..." && git push`. I never touch git. Vercel deploys in ~30–60s.
- **Preview locally before pushing:** `python -m http.server 8899` from the project root → `http://127.0.0.1:8899/index.html`.

## STATE OF PLAY — IMPORTANT

The site has **19 pages that are fully SEO-optimised** (JSON-LD schema, sitemap, llms.txt, canonicals, blog + pillar page, 4 service pages, privacy/terms). **Do not break that.**

There is a **visual redesign committed locally but NOT pushed**. Live production is still the OLD DARK SITE.

Commits (newest first):
- `8a6289d` — Helvetica, bigger hero cards, hero spacing, blur+title restore, mobile scroll fix ← **current**
- `d366a69` — Syne type, 8 hero tiles, 250M stat, Swarajya copy to top, reveal-bug fix
- `bf63cc4` — light theme, converging hero, Swarajya scroll-open, canvas graphic
- `d395a54` — abandoned WebGL/ASCII hero (reference only)
- `041bca7` — **last PUSHED commit = what's live now**

### What the redesign is

New files `css/studio.css` + `js/studio.js` (additive). `index.html` has `<body class="studio">`. Only the homepage is converted.

- **Light editorial theme** — warm white `#f7f5f0`, ink `#0c0c0e`, one red accent `#e63846`. Dark full-bleed bands for media with **gradient feathered edges** (no hard black cuts).
- **Hero** — headline + **8 real client videos** scattered, drifting with cursor. On scroll they **converge into a row**, the row **blurs into one slab**, the title forms over it (*"Growth is luck. Luck is engineered."* + CTA), and the belt **keeps drifting and is draggable**.
- **Swarajya section** — trailer opens from inset frame to full-bleed on scroll. Copy sits at the **TOP** (never over the film), then invitation + "Enter the world" arrives. Links to `/swarajya`.
- **Portfolio rail** — separate infinite momentum carousel (wheel, drag, throw, page-scroll).
- **Process section** — custom **canvas motion graphic**: particles enter as noise on the left, resolve into a clean red wave on the right (~2KB, no network cost).
- Scroll reveals with stagger on ~43 elements. Stats count up on arrival.
- **Type:** one constant family — `'Helvetica Neue', Helvetica, 'Inter', Arial, sans-serif` on `--f-display`, `--f-body`, `--f-mono` in `css/styles.css`. Real Helvetica on Mac/iOS, Inter elsewhere. (We tried and rejected: Fraunces, Instrument Serif, Bricolage Grotesque, Syne.)
- **Zero gold** — 17 hardcoded gold values purged. Red only.
- **Perf:** was 6 FPS / 568ms frames from CSS-blurring live videos. Fixed — blur applied once to the container, clips pause while blurred. **57 FPS, 28ms worst frame.** Offscreen sections do no work.
- **Mobile:** horizontal drag handlers now only claim a gesture when horizontal movement dominates, so vertical page scroll is never swallowed. `touch-action: pan-y` on `.hx-field` and `.rail-view`.

## MY TASTE — LEARNED OVER MANY ITERATIONS

- **No gold.** Red `#e63846`, white, black.
- **Light theme**, not dark.
- **No serif display fonts** — they read as default "AI premium". Helvetica, kept constant, is the current answer.
- **No HUD markings, crosshairs, coordinate readouts, or custom cursor.** Built then removed — they made it look small and AI-generated. Do not reintroduce.
- **Never put text over the middle of a video.** Above or beside only.
- **Spacing is the premium signal.** Be generous. Give people time to read as things move.
- **No boring or static sections.** Motion driven by scroll, everywhere.
- **Custom canvas/CSS motion graphics, not generated video files** — sharper, lighter, editable. I agreed with this.
- Must stay **fast and smooth**. Never trade that away.
- Should feel **human and fun**, not AI-generated.

## FIRST THING TO DO

Run the local server and check the homepage. **I could not verify the hero blur/title-form in my last session** (Lenis blocks programmatic scroll and the test browser became unresponsive). Confirm by actually scrolling:
1. Tiles converge into a row.
2. Row blurs and the title slab forms over it.
3. Belt keeps drifting and can be dragged.
4. Vertical scrolling still works on a phone/narrow viewport.

Fix anything broken there before new work.

## STILL TO DO

1. **Founder section** — currently a photo beside a quote. Make it interactive and fun with motion. High priority; I called out that it should feel premium and playful.
2. **Convert the other 18 pages to the light theme + motion.** Only the homepage is light right now. **This must be resolved before pushing** — half-light/half-dark is the one outcome that definitely looks broken.
3. **More custom canvas motion graphics** in other sections (services, proof, contact), same approach as the Process one.
4. **Header** — I said it felt too generic. Now: outlined CTA, section links with red underline-on-hover. Check it feels right.
5. **More videos coming from me.** Hero tiles are `<figure class="hx-tile" data-i="N" style="--sx:..;--sy:..;--sr:..">` in `index.html`; add and they auto-space in the converge.
6. **Push to Vercel** once I approve.

## KEY NUMBERS — use exactly

- **24H** brief to first cut
- **40+** brands shipped
- **62%** avg ROAS lift
- **250M+** views engineered
- 70% of SuperMoney's public Meta Ad Library is our work
- Shivora Ghee ≈ ₹80 CAC · SHEIN = 24-hour turnaround during the Slay Sale
- AI ad creatives ₹5,000–₹15,000/video, 5 business-day delivery

## CLIENTS — all real. Never invent testimonials, press, or metrics.

SuperMoney (fintech), SHEIN (fashion), Flipkart, XTEP (sportswear), Shivora Ghee (FMCG), Parv Essentials (D2C), Enorex (lubricants, B2B→D2C), Manak Petroleum (lubricants, SEO). Original IP: **Swarajya**, India's first AI anime (Chhatrapati Shivaji Maharaj).

## ASSETS — Cloudinary (two accounts)

Most media on `uebesiag`; newest uploads on `daklv12br`.

- **Hero deck (9 tiles, current):** `v1783359624/57_supermoney_crowd_o0ta6n`, `v1783360201/HANUMAN_kvilbb`, `v1783360303/42_walk_spot_hu9jjq`, `v1785018765/2_men_outfi_sets_qqhmly`, `v1785019089/04_shein_haul_ln9chs`, `v1785019856/SHOW_AD_mex7jx`, `v1785019936/54_hostage_drama_1_y3bawq`, `v1785019942/Copy_of_39asmr_yltbak`, `v1785019961/52_Therapist_1_wixurd`
- Retired from the hero (weaker): `16_ipl_interview_0804_uzibug`, `13_cashback_nita_0704_si7djk`, `22_girl_stadium_ugc1004_hyaabr` — still used in the portfolio rail
- **`Copy_of_39asmr_yltbak` is a `.mov`** — always request it as `.mp4` so Cloudinary transcodes it; `.mov` will not play in most browsers
- Swarajya trailer: `v1783360946/second_draft_1_olzldl.mp4`
- Founder photo: `v1783365954/IMG_8912_mdktoh.jpg`
- Logos: SuperMoney `v1783365774/White_logo_1_1_1_jsbdnc.png` (**white — needs a dark background**), XTEP `v1783365833/WhatsApp_Image_...wwk6yn.png`, Shivora `v1783365802/...noskhu.png`, Parv `v1783365927/logo_1_szysi0.png`; SHEIN, Flipkart, Enorex, Manak on `daklv12br`.

**Gotcha:** always include `h_NNN` or `w_NNN` when transforming images — `q_auto,f_auto` alone returns 400 on some IDs. Cap videos with `br_` for weight.

## HARD RULES

1. **Never edit the `.reveal` rule in `css/styles.css`.** It broke the site once. It needs a `.visible` class from `js/main.js`; when that observer misses, entire sections sit at `opacity:0` — this is exactly why sections "weren't opening". On studio pages it's neutralised from `css/studio.css` instead. Keep doing it that way.
2. **One change at a time, separate commits**, so anything can be reverted.
3. **Don't push until I've reviewed locally and said go.**
4. No mocks, no fake content, no invented numbers.
5. Flag risks before pushing. Tell me when changes go live (~30–60s).
6. Give me brutally honest assessments, not agreement. Push back when I'm wrong.
7. Verify with real measurement, and tell me plainly when you couldn't verify something.

## PENDING ON MY SIDE (not code)

- Set `retency.in` as **primary domain in Vercel** (apex currently 307s to `www` while canonicals declare apex).
- Submit sitemap + request indexing in Google Search Console.
- Send real social URLs so `sameAs` can be filled on Organization + Person schema (currently empty `[]`).
- Set up Google Business Profile.

Start by previewing the homepage locally, verify the four hero behaviours above, then tell me what you'd fix first.
