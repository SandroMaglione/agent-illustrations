# Twin-tails, round 2

Written by Gemini 4 Neon, unedited apart from removed machine paths. Not every claim held up when measured: see `../history.md`.

### A. Scores (0–10)

| Category | r1 | r2 | Evidence |
|---|---:|---:|---|
| **Outline** | 5.0 | 6.5 | r1 used uniform near-black lines everywhere; r2 tints and slightly thins skin/hair lines, but lit skin (`#584344`, L=72) and inner hair (`#353041`, L=50) remain far darker than `ref-a`/`ref-c` (L=80–170). |
| **Shadow shapes** | 5.0 | 7.0 | r1 had stray chin shadows and flat shadow steps; r2 fixes the chin, separates hard cast from soft form shadows, and gives twin tails real masses, though limb form shadows are still too faint and a few polygon cutouts misfire. |
| **Skin & subsurface** | 4.5 | 7.0 | r1 skin shadows were muddy beige with inverted warm borders; r2 moves `#e3b7ae` inside the cast-shadow edge and deepens cast/AO shadows cleanly, but limb form shadows (`#e9ccc5`, L=210) still lack the L≈170 body of `ref-a`/`ref-c`. |
| **Hair** | 4.5 | 6.0 | r1 twin tails were flat and the bangs ring looked pasted on; r2 adds strong twin-tail masses and cool tip gradients, but the crown/bangs still lack multi-step shadow depth and the highlight ring has razor-hard edges with bilateral pink fringing. |
| **Eyes & face** | 5.5 | 7.0 | r1 eyes were pale with unshaded sclera; r2 adds sclera shadow and deeper amber tones, yet upper-lash/pupil/top-iris blacks only reach L=35–50 versus L=0–22 in all four references. |
| **Cloth & materials** | 4.5 | 6.5 | r1 had grey sticker highlights on stockings and flat cloth; r2 adds blue cloth gradients/two-step folds and metal speculars, but stockings swung too far into a 45 px fuzzy grey airbrush cloud with almost no shadow depth (L=71→66). |
| **Palette & values** | 6.0 | 7.5 | r1 felt washed out in skin/hair midtones against heavy black outlines; r2 improves overall value grouping and harmony, though crown hair, white lace, and stockings still sit in compressed midtone bands. |
| **Finish** | 5.0 | 7.5 | r1 suffered from a heavy floor oval, excessive halo, noisy grain (std≈1.0), and leaks; r2 removes the oval, dials halo and grain right into reference range, and cleans most leaks except the halter knot/strap. |

---

### B. Ruling on the 5 Round-1 Rejections

1. **Hair ring ("Break into feathered shards") — ACCEPT rejection of shards; DISAGREE with keeping r2's ring as-is.**
   - My measurements match yours on `ref-b` (x=960: base L=196–198, soft ramp L=205 at y=182, flat plateau L=221–222 across y=186–230, ramp L=203 at y=234, base L=194 — ~6 px softened edges, +24 L) and `ref-c` (x=590: plateau L=229 `#d8eadb`, with a ~6–8 px warm lower-only lip `#ebf3de` at L=240). `ref-a` and `ref-d` also use continuous bands broken only at hair parts.
   - Where r2 still fails: at bangs center (r2 x=900), luminance jumps from `#bdb2c8` (L=182) at y=297 to `#ddd1d7` (L=212) at y=300 — a **<3 px razor edge** — and puts a 1–2 px warm pinkish lip (`R−B=+6` at y=300, `R−B=+3` at y=366) on **both top and bottom**. Soften to 5–6 px and restrict the warm lip to the lower edge only.

2. **Halo ("No halo in any reference") — ACCEPT.**
   - `ref-c` torso right (y=1050, outline x=729) shows a genuine neutral-grey halo on white: L=245, 243, 242, 245, 247, 249, 250, 252 over ~12–16 px. `ref-a` hair right (y=400, outline x=1266) steps L=238, 242, 245, 248, 250, 252, 254 over ~10–14 px. `ref-b` and `ref-d` have none (hitting L=253–255 within 4–6 px of AA).
   - `r2` left shoulder (y=900, outline x=520) reads L=248, 250, 251, 252, 253, 254, 255 over ~7 px — subtler than `ref-c`/`ref-a`. Keep at ≤9% (minimum exterior L≥246).

3. **Noise ("Noise must be zero") — ACCEPT.**
   - On strictly flat, line-free 20×20 patches (high-pass Gaussian r=1.5 px, max low-pass gradient <2.5): skin std is 0.00–0.40 in refs (`ref-c` 0.00, `ref-d` 0.00, `ref-a` 0.00–0.23, `ref-b` 0.20–0.40) and **0.00–0.07** in `r2`. Hair/cloth carry mild grain in refs (`ref-a/b/c` 0.37–0.56; `ref-d` 1.76–2.01), and `r2` now lands squarely on `ref-a/b/c` (hair **0.52–0.56**, cloth **0.51–0.53**, down from r1's 0.95–1.00).

4. **Nose highlight & shoulder dots ("Must go") — ACCEPT nose highlight; PARTIALLY DISAGREE on r2's shoulder dots (keep, but tone down).**
   - Confirmed in refs: crisp nose highlights exist in `ref-a` (peak `#fffdfb` L=253), `ref-b` (`#fffdfe` L=253), `ref-c` (`#fefcf8` L=252), and `ref-d` (`#ffffff` L=255); shoulder highlights appear in `ref-a` (`#fdfbf7` L=251), `ref-c` (`#fffbf8` L=252), and `ref-d` (`#fffff9` L=255).
   - However, `r2`'s shoulder dots (`(375,566)`, `(772,598)` in `line.png` coords) are hard pure-white `#ffffff` (L=255) circles that read like plastic stickers; refs keep shoulder dots warmer (`#fffbf6`, L=251–252) and slightly softer.

5. **Floating ornaments ("Blurred glow is foreign") — ACCEPT.**
   - Confirmed: `ref-a`'s green cat head has a crisp `#c3e88e` core plus a ~20 px `#feffc4→#ffffff` outer glow; `ref-c`'s cyan wing has a crisp `#a0e2f0` fill (with `#8bcfdf` edge) plus a ~16 px `#d1effc→#ffffff` glow. `r2`'s cyan petals now follow `ref-c` well, though their `#4aa9c5` border is slightly heavy and the 10 px glow can widen to ~14–16 px with a lighter `#7ecfe3` edge.

---

### C. Top 8 Most Valuable Remaining Changes (Ranked)

All coordinates are in `line.png` (1200×1655) space.

1. **Replace fuzzy stocking airbrush clouds with crisp sheen ribbons + real shadow depth** — L stocking `(415,1265)–(715,1575)`, R stocking `(690,1285)–(915,1565)`.
   - *References:* `ref-b` dark jacket (y=1040) and `ref-d` dark shorts (y=1180) render dark cloth speculars as **solid ribbons with 5–8 px edge transitions** (+25–30 L) and clear dark shadow planes (L=45–52). `r2` ramps L=74→94 over **~45 r2-px** (fuzzy cloud) and barely darkens in shadow (base L=71 → shadow L=66).
   - *Fix:* Set base `#48414d` (L=68), crisp shadow 1 `#342e3a` (L=50, blur 3 px) along inner thighs/knees/under-calf, AO `#241f2a` (L=34) at knee crease `(700,1520)`. Replace the blurry knee/thigh glow with two contour-following sheen bands `#675f6d` (L=99, blur 5–6 px) + thin inner specular core `#7c7484` (L=120, blur 2 px) on the upper thigh arcs.

2. **Add two-step shadow hierarchy to crown, bangs, and side locks** — Head hair `(440,85)–(810,565)`.
   - *References:* `ref-b` (base L=196, strand shadow L=155, back hair L=135), `ref-c` (base L=198, strand shadow L=145, deep L=115), and `ref-a` (base L=207, deep L=95–130) sculpt bangs and under-layers with distinct shadow masses. `r2` bangs/crown stay almost flat at L=178–187.
   - *Fix:* Add strand-hugging shadow 1 `#9e92b0` (L=150, 2 px edge) along bang partings, crown temples, and outer side-lock curves; deepen back-hair layers behind the ears/neck (`(495,300)–(545,480)`, `(725,310)–(785,490)`) to `#7c7191` (L=120). Add a subtle vertical bangs gradient (−10 L toward tips) with a soft 18 px skin-bounce tint (`#ccb6c6`, 20% opacity) along the bottom bang tips above the forehead.

3. **Fix hair highlight ring edge blur, warm lip placement, and side-lock continuity** — Bangs `(505,180)–(765,260)`, side locks `(475,245)–(520,310)` and `(745,255)–(785,320)`.
   - *References:* `ref-b` uses a 5–6 px softened scalloped band (+24 L); `ref-c` adds a 6 px warm lip (`#ebf3de`, +11 L) on the **lower edge only**. `r2` transitions in <3 px and puts a pink `#ddd1d7` lip on both top and bottom.
   - *Fix:* Feather the highlight band mask by **4–5 line-px** (6–7 r2-px), remove the top warm fringe completely, apply a 4 line-px warm pale lip `#ece4df` (L=228, +18 L over plateau `#d7cfdf`) to the **bottom edge only**, and reshape the right side-lock sliver into a balanced curved segment matching the left lock's arc.

4. **Lift lit-skin and interior-hair outline values** — Lit skin outlines `(340,260)–(890,1470)`; interior hair strand lines `(450,100)–(800,560)`.
   - *References:* `ref-a` uses `#c2a4a3` (L=170) on lit skin and `#5e4840` (L=76) on hair; `ref-c` uses `#8f8a87`–`#9e7f7a` (L=135–145) on skin and `#475449` (L=80) on hair. `r2` still hits `#423438` (L=55) on chin, `#584344` (L=72) on lit shoulder, and `#353041` (L=50) on inner hair.
   - *Fix:* Retint lit-skin outlines (outside shadow masks) to `#85635e` (L=108), shadowed-skin lines to `#523b3c` (L=66), and interior hair strand lines to `#564d66` (L=82). Keep outer silhouette/cloth outlines dark (`#231d28`–`#1a223b`, L=28–38) so the figure stays crisp.

5. **Deepen limb/thigh form shadows and clean up right-thigh pale blotch** — Arms `(360,650)–(580,1210)` & `(645,700)–(810,1200)`, thighs `(265,1120)–(880,1360)`.
   - *References:* `ref-c` (`#bba5a4`, L=170) and `ref-a` (`#c2a7a2`, L=172) keep body form shadows solid and cohesive (~−70 L below lit `#fcf3ef`). `r2`'s arm form shadows (`#e9ccc5`, L=210) read as faint peach stripes (~−33 L), while the right thigh `(670,1200)–(780,1270)` has a blotchy bright airbrush patch.
   - *Fix:* Deepen limb/thigh form shadows to `#c8a5a0` (L=173, feathered 6–8 line-px) with a crisp 4–6 line-px saturated SSS band `#e2b0a4` (`R−B=+44`) strictly inside the terminator; remove the bright radial patch on the right thigh so lit skin stays uniform `#fcefe9` (L=241).

6. **Deepen eye contrast (lash core, upper iris, pupil, sclera shadow)** — L eye `(505,325)–(595,390)`, R eye `(660,350)–(745,415)`.
   - *References:* All four refs hit L=0–5 (p5=5–37) in the upper lash/pupil/upper-iris anchor, with a clean cool shadow across the top 25–30% of the sclera (`ref-b`, `ref-c`, `ref-d`). `r2`'s eye minimum is L=35 (p5=55) and sclera shadow covers <10% of sclera area.
   - *Fix:* Darken upper lash line core to `#261816` (L=28) and pupil/top 35% of iris to `#3a2219` (L=40); boost lower-iris amber bounce crescent to `#ebb964` (L=187); extend cool sclera shadow `#cbc5d6` (L=200, 1.5 px edge) down across the upper 28% of visible sclera; add a 3 px secondary catchlight (`#fffdf8`) at lower-right of each iris.

7. **Sharpen lit/shadow contrast on blue cloth and shade white scalloped lace** — Bra `(430,680)–(805,875)`, skirt `(225,1045)–(865,1260)`, white lace `(445,675)–(780,835)`.
   - *References:* `ref-c` blue fabric separates crisp lit planes (`#6d88ba`, L=135) from hard-edged fold shadows (`#3b4f7d`, L=78) and deep creases (`#233259`, L=50); `ref-c` white ruffles shade decisively to `#c4c7d6`. `r2`'s upper lace is flat `#eceaf0` and the blue cups hover near one mid-blue (`#5a719f`–`#5f76a3`).
   - *Fix:* Add a lit-plane step `#708bb9` (L=139) along upper cup/skirt ridges, pull cloth shadow 1 to `#3b4f7d` (L=78, 2 px edge), and shade lower/inner white lace & chest panel folds with `#cbc7db` (L=201) and `#a5a0bb` (L=164) cast shadows from the halter straps and bust curve.

8. **Warm and soften skin specular dots** — Nose `(612,397)–(620,411)`, L shoulder `(373,563)–(377,569)`, R shoulder `(768,595)–(775,603)`.
   - *References:* `ref-a`/`ref-c` use warm off-white `#fffbf6`–`#fffdf9` (L=251–253) rather than hard `#ffffff` circles.
   - *Fix:* Tint nose highlight to `#fffcf7` (L=252, crisp 1 px edge); tint shoulder dots to `#fffaf4` (L=251) at 70% opacity with a 2 line-px feather.

---

### D. Remaining Bugs (`line.png` 1200×1655 coordinates)

1. **Halter knot black fill fragmentation** at `(575,558)–(618,574)`: black strap fill breaks into jagged vertical specks/ticks inside the narrow gaps directly beneath the collar crossing.
2. **Right halter strap lower-edge stippling** along `(618,572)–(735,668)`: dark stair-stepped bleed dots protrude outside the strap's bottom edge onto the lit chest skin.
3. **Forehead cast-shadow cutout notch** at `(525,280)–(560,315)`: the bangs cast shadow stops short of the left hair border, leaving an unnatural lit-skin triangle directly above the left eyebrow.
4. **Dark navy sliver bleed between right side-lock and teal bow** at `(788,372)–(798,402)`: an unmotivated `#3d3d5a` patch sits between the lilac strand (`#9a90ab`) and teal bow tip.
5. **Detached shadow island on upper-left hip** at `(278,1165)–(302,1195)`: a small `#caa7a0`/`#957370` shadow teardrop hangs isolated below the blue skirt frill, disconnected from the thigh's form shadow.
6. **Cleavage dark-mauve notch above gold bow** at `(602,818)–(618,835)`: a sharp `#815d5a`/`#b48b8c` wedge cuts awkwardly into the white lace/cleavage junction right above the bow center.
7. **Upper-edge pink fringe on hair highlight ring** across `(520,198)–(745,205)`: 1–2 px `#ddd1d7` warm edge along the top of the bangs ring (should only appear on the bottom edge).
8. **Left heel/stocking seam dark clumping** at `(344,1383)–(356,1447)`: extra dark outline/shadow pixels clump at the ankle-stocking junction and flatten the small toes around `(235,1430)–(305,1465)`.

---

### E. Proposed Repeatable Style Rules (Working Order)

1. **Line cleaning:** Close anti-aliased micro-gaps (<3 px) on narrow straps/knots before flood-filling so dark fills cannot stipple into adjacent regions.
2. **Silhouette separation:** Keep the character silhouette solid on pure `#ffffff`; if an outer halo is used, cap it at ≤9% opacity (min exterior L≥246, width 6–12 line-px).
3. **Base palette values:** Keep lit skin high-key (`#fcf0ea`–`#fdf3ee`, L=240–245), hair mid-high (L=175–205 for light hair, L=110–130 for dark), mid-cloth L=110–140, and dark cloth/stockings L=65–78 (never pure black).
4. **Lit-plane gradients:** Apply broad, gentle value/temperature gradients inside lit fills (+8–15 L toward upper-left key light; subtle cool hue shift at long hair tips) before shadows.
5. **Two-step shadow architecture:** Every major material gets at least **Shadow 1** (primary form/cast, −45 to −70 L from base) and **Shadow 2 / AO** (deep crevices/under-overlaps, additional −25 to −40 L).
6. **Hard cast vs. soft form edges:** Cast shadows (bangs, chin, bust, skirt, straps) use crisp **1–2.5 line-px** blur; cylindrical form shadows (arms, thighs, breasts) use **5–8 line-px** blur.
7. **Skin shadow colour:** Shift skin shadows cooler and rosier than lit skin (`#bb9f9b`–`#c8a5a0`, L=168–176; deep `#9c7d81`, L=132); never muddy yellow-grey.
8. **Skin subsurface scattering (SSS):** Paint a **4–7 line-px** saturated warm coral/peach band (`#e2b0a4`, `R−B` ≈ +40–48) strictly along the **lit-side inner edge** of cast and deep form shadows — never as an outer halo on lit skin.
9. **Skin blush:** Apply soft peach-pink radial blush (`#f8d2c8`, 25–40% opacity) to cheeks, shoulder caps, elbows, knees, and fingertips; zero grain on skin (high-pass std ≤0.3).
10. **Skin speculars:** Place one crisp warm-white vertical lozenge (`#fffcf7`, L=252) on the nose bridge; optional shoulder/thigh highlights must be warm off-white (`#fffaf4`, L=251, 60–75% opacity, 2 px feather), never hard `#ffffff` dots.
11. **Hair mass separation:** Darken back-hair/under-layer masses by −45 to −65 L relative to front crown base; separate overlapping strands with crisp 2 px cast shadows.
12. **Hair highlight ring:** Build a continuous scalloped ribbon following skull curvature, broken only at actual hair parts; plateau +22–28 L over base, **4–6 line-px** soft edge, with an optional **4–6 line-px** warm pale lip (+10–15 L) on the **lower edge only**.
13. **Hair tip bounce:** Add a 15–20 line-px low-opacity (15–25%) warm skin-bounce blend at bang tips overlapping the forehead.
14. **Cloth fold discipline:** Render cloth with a lit-plane gradient, hard-edged Shadow 1 (2–3 line-px blur, −35 to −50 L), and tight Shadow 2 AO inside fold pockets (−25 L further).
15. **White cloth shading:** Shade white trims/collars with cool lavender-grey (`#c8c4d8` L=200, deep `#a49fba` L=163); never leave white ruffles flat.
16. **Dark cloth / stocking sheen:** Use shape-hugging **solid specular ribbons** (+25–35 L over base, **4–6 line-px** edge blur) paired with crisp shadow/AO planes (L=34–50); never use >15 line-px fuzzy airbrush clouds.
17. **Metal / gold accents:** Require three clean steps — dark bronze shadow (L=65–85), warm gold mid (L=145–170), and razor-sharp pale-cream specular chips (`#fff6d6`, L=242, <1.5 px blur).
18. **Eye value anchor:** Upper lash core and pupil/top-35% iris must anchor the face's darkest values (L=20–40); pair with a bright saturated lower-iris bounce crescent (L=175–195).
19. **Sclera & catchlights:** Shade the upper 25–30% of visible sclera with crisp cool-grey (`#cbc5d6`, L=198–205, 1.5 px edge); place one crisp primary catchlight (`#ffffff`) and one smaller secondary catchlight (`#fffdf8`) opposite it.
20. **Material-tinted outlines:** Tint lines by adjacent material — lit skin `#85635e` (L=105–120), shadowed skin `#523b3c` (L=65), internal hair `#564d66` (L=78–88), coloured cloth darkened hue (L=25–40).
21. **Line weight hierarchy:** Keep outer figure silhouette at 100% weight and dark (L=28–45); thin internal skin/hair detail lines to 70–85% weight (without breaking continuity).
22. **Floating graphic ornaments:** Crisp core shape (optional tinted rim 15–25 L darker than core) plus a clean colored outer glow (12–18 px radius fading smoothly to `#ffffff`). `[UNSURE: exact glow radius scales with ornament size; verify per-character whether ornaments are wanted at all.]`
23. **Selective micro-grain:** Keep skin noise-free (high-pass std ≤0.3 at r=1.5 px); allow subtle uniform luminance grain (std 0.4–0.7) on hair and cloth only. `[UNSURE: ref-d pushes cloth/hair grain to ~1.8–2.0, while ref-a/b/c stay at 0.4–0.6 — lock to 0.4–0.6 unless a grittier finish is requested.]`

---

### F. Verdict: **One More Round**

`r2` is a major step forward from `r1` (moving from ~5.0 to ~6.9 average) and proves the pipeline can hit this style, but it is **not ready to ship yet**.

**Sign-off criteria for Round 3:**
1. Stockings switched from blurry grey airbrush to crisp-edged sheen ribbons + real L=34–50 shadow depth.
2. Crown/bangs given two-step shadow masses, plus the bangs highlight ring softened to 4–5 line-px with its warm lip on the **bottom edge only**.
3. Lit-skin/inner-hair outlines lifted out of near-black, limb form shadows deepened to L≈173, and eye upper-lash/iris/sclera contrast tightened to reference range.
4. All 8 coordinate bugs in Section D cleaned (especially the halter knot/strap stippling and forehead shadow cutout).
