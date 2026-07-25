# RETENCY SITE — CONTINUATION PROMPT

Copy everything below into a new chat.

---

I'm Parth Agarwal, founder of **Retency** — an AI-native creative studio in Bengaluru. Continue work on my site. Read this fully before touching anything.

## PROJECT

- **Local path:** `C:\Users\dg611\Desktop\CLAUDE CODE\retency-site\`
- **Live:** https://retency.in (Vercel, auto-deploys on push to `main`)
- **Repo:** https://github.com/LUCIFERFALLA/retency-site
- Static HTML/CSS/JS. **No Node, no build step.** Windows + PowerShell/Bash.
- Push workflow: you run `git add . && git commit -m "..." && git push` yourself. I never touch git. Vercel deploys in ~30–60s.
- **Local preview:** `python -m http.server 8899` from the project root, then open `http://127.0.0.1:8899/index.html`. Always review locally before pushing.

## CURRENT STATE — READ CAREFULLY

The site has **19 pages** that are fully SEO-optimised (schema, sitemap, llms.txt, canonicals, blog, pillar page, service pages, privacy/terms). **Do not break that work.**

There is an **in-progress visual redesign** committed locally but **NOT pushed**:
- `d366a69` — latest redesign state
- `bf63cc4` — earlier redesign state
- `d395a54` — abandoned WebGL/ASCII hero experiment (kept for reference only)
- `041bca7` — **last pushed commit = what's live right now**

So: **live production is still the OLD dark site.** The redesign lives only on my machine.

### Redesign so far (homepage only, `index.html`)

New files: `css/studio.css` and `js/studio.js` (both additive; `index.html` has `<body class="studio">`).

- **Light editorial theme** — warm white `#f7f5f0`, near-black ink `#0c0c0e`, single red accent `#e63846`. Dark full-bleed bands for media, with **gradient feathered edges** (no hard black cuts).
- **Hero** — headline plus **8 real client videos** scattered around it, drifting with the cursor. On scroll they **converge into a row that becomes a draggable, drifting carousel**. A CTA banner ("Growth is luck. Luck is engineered.") sits above the row.
- **Swarajya section** — the trailer opens from an inset frame to full-bleed as you scroll. Title sits at the **top** (never covering the film), then an invitation + "Enter the world" CTA arrives. Links to `/swarajya`.
- **Portfolio rail** — separate infinite momentum carousel; wheel, drag, throw, and page-scroll all drive it.
- **Process section** — a **custom canvas motion graphic** ("signal pipeline"): particles enter as noise on the left and resolve into a clean red wave on the right. ~2KB, no network cost.
- Scroll reveals with stagger on ~43 elements; stats count up on arrival.
- **Fonts:** display = **Syne** (600/700/800), body = **Inter**. Set via `--f-display` / `--f-body` in `css/styles.css`. Font links updated on all 17 pages.
- **All gold is gone** — 17 hardcoded gold values purged. Red only.
- HUD/crosshairs/coordinate readouts and the custom cursor were built, then **removed** (felt gimmicky and AI-ish). Native cursor. Don't reintroduce.
- Perf: was 6 FPS / 568ms frames because live videos were being CSS-blurred. Fixed — blur is applied once to the container and clips pause while blurred. **Now 57 FPS, 28ms worst frame.** Offscreen sections do no work.

## MY TASTE — LEARNED THE HARD WAY

- **No gold.** Red (`#e63846`), white, black only.
- **Light theme**, not dark.
- **No serif** display fonts — they read as "default AI premium". Syne is current; I want **bold, sharp, fun, readable**. Change it if you have something better.
- **No HUD markings, no crosshairs, no custom cursor, no coordinate readouts.** They make it look small and AI-generated.
- **No text covering video.** Put copy above or beside, never centred on top of footage.
- **Generous spacing.** Give sections room and give people time to read as things move.
- **No section should be boring or static.** Motion everywhere, driven by scroll.
- **Custom canvas/CSS motion graphics, not generated video files** — sharper, lighter, editable. (I agreed with this reasoning.)
- Must stay **fast and smooth**. Never trade that away.
- Keep it **human**, not "AI-looking".

## STILL TO DO

1. **Founder section** — currently just a photo beside a quote. Make it interactive and fun, with motion. High priority.
2. **Propagate the light theme + motion to the other 18 pages.** Right now only the homepage is light; everything else is still dark. **This mismatch must be resolved before pushing** — a half-light/half-dark site is the one outcome that definitely looks broken.
3. **More custom motion graphics** in other sections (services, proof, contact) — same canvas approach as the Process one.
4. **Header** — I said it felt too generic. It's been lightened (outlined CTA, underline-on-hover section links) but check it feels right.
5. **More videos coming from me.** Hero tiles live in `index.html` as `<figure class="hx-tile" data-i="N" style="--sx:..;--sy:..;--sr:..">`; add new ones there and they auto-space in the converge.
6. Then **push to Vercel** once I approve.

## KEY NUMBERS (use these exactly)

- **24H** — brief to first cut
- **40+** — brands shipped
- **62%** — avg ROAS lift
- **250M+** — views engineered
- 70% of SuperMoney's public Meta Ad Library is our work
- Shivora Ghee ≈ ₹80 CAC; SHEIN = 24-hour turnaround during the Slay Sale
- AI ad creatives ₹5,000–₹15,000/video, 5 business-day delivery

## CLIENTS (all real — never invent testimonials, press, or metrics)

SuperMoney (fintech), SHEIN (fashion), Flipkart, XTEP (sportswear), Shivora Ghee (FMCG), Parv Essentials (D2C), Enorex (lubricants B2B→D2C), Manak Petroleum (lubricants, SEO). Original IP: **Swarajya**, India's first AI anime (Chhatrapati Shivaji Maharaj).

## ASSETS — Cloudinary

Two accounts in play. Newer uploads are on `daklv12br`, most media on `uebesiag`.

Hero/work videos (`uebesiag`): `57_supermoney_crowd_o0ta6n`, `16_ipl_interview_0804_uzibug`, `HANUMAN_kvilbb`, `13_cashback_nita_0704_si7djk`, `42_walk_spot_hu9jjq`, `22_girl_stadium_ugc1004_hyaabr`
Newest SHEIN clips: `v1785018765/2_men_outfi_sets_qqhmly.mp4`, `v1785019089/04_shein_haul_ln9chs.mp4`
Swarajya trailer: `v1783360946/second_draft_1_olzldl.mp4`
Founder photo: `v1783365954/IMG_8912_mdktoh.jpg`
Logos: SuperMoney `v1783365774/White_logo_1_1_1_jsbdnc.png` (white — needs a dark background), XTEP `v1783365833/WhatsApp_Image_...wwk6yn.png`, Shivora `v1783365802/...noskhu.png`, Parv `v1783365927/logo_1_szysi0.png`, SHEIN + Flipkart + Enorex + Manak on `daklv12br`.

**Cloudinary gotcha:** always include `h_NNN` or `w_NNN` when transforming images — `q_auto,f_auto` alone 400s on some IDs. Videos are fine with `q_auto,f_auto` and should be capped with `br_` for weight.

## HARD RULES

1. **Never touch the `.reveal` rule in `css/styles.css`.** It broke the site once. It needs a `.visible` class from `js/main.js`; when that observer misses, whole sections sit at `opacity:0`. On studio pages it is neutralised from `css/studio.css` instead — keep doing it that way.
2. **One change at a time, separate commits**, so anything can be reverted.
3. Don't push until I've reviewed locally and said go.
4. No mocks, no fake content, no invented numbers.
5. Flag risks before pushing. Tell me when changes will be visible (~30–60s after push).
6. I prefer brutally honest assessments over agreement. Push back if I'm wrong.

## PENDING ON MY SIDE (not code)

- Set `retency.in` as **primary domain in Vercel** (apex currently 307s to `www`, but canonicals say apex).
- Submit sitemap + request indexing in Google Search Console.
- Send real social URLs so `sameAs` can be filled on Organization + Person schema (currently empty).
- Set up Google Business Profile.

Start by running the local server and looking at `index.html`, then tell me what you'd do first.
