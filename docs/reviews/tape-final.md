# Headphones, final judgement

Written by Gemini 4 Neon, unedited apart from removed machine paths. Not every claim held up when measured: see `../history.md`.

Final art-direction review of `tape-full.png` against `ref-a.png`–`ref-d.png`, `previous-character.png`, and `splash-process.md`. All coordinates are in `line.png` space (`1024×1536`).

---

### A. Scores (0–10)

| Category | Tape | Prev | Evidence |
|---|---:|---:|---|
| **Outline** | **5.5** | **7.5** | Tape's heavy near-black ink (`#1d161d` shoulder `(300,500)`, `#2a2829` pants `(553,1180)`) overpowers the image; Prev stays thinner and color-tinted (`#6d504e` shoulder, `#1b2645` cloth), limited mainly by uniform weight. |
| **Shadow shapes** | **7.5** | **7.5** | Tape designs bold, graphic jacket/pant planes (`(140–320,680–980)`, `(450–800,1100–1450)`) marred by a floating shoulder blotch `(370–415,420–430)`; Prev has clean cast shadows under fringe and frills but plainer torso shapes. |
| **Skin & subsurface** | **7.5** | **8.0** | Tape nails `#fcf1ec` base, `#b89b97` shade, and `#d7ada3` warm edge inside the jaw `(568,335)` and shoulder `(360,597)` but overshades face/hand (~44%); Prev balances lit/shaded skin more cleanly with softer joint blush. |
| **Hair** | **6.0** | **8.0** | Tape fragments the crown ring into angular shards `(360–570,80–210)` and drops back hair ~79 Lab L too dark; Prev holds one scalloped ring with a warm lip and controlled crown-to-tail value drop. |
| **Eyes & face** | **6.0** | **7.5** | Tape's narrow eyes (`(400,280)`, `(533,238)`) lose iris bands and sclera shade, with a soft nose dot `(455,288)` and stamped `////` blush; Prev's amber irises clearly read dark upper third, lower crescent, and twin lights. |
| **Cloth & materials** | **8.0** | **7.5** | Tape hits crisp 0.68× OKLCH cloth steps and sharp prop/decal work on the deck (`(50–350,1100–1410)`), hurt by a muddy tank sheen `(540–620,600–640)`; Prev sells blue satin and dark stockings well with simpler props. |
| **Palette & values** | **7.5** | **8.0** | Tape's muted teal/khaki/ochre palette groups well (`ref-d` mood) but feels heavier than the refs due to dark back hair and black wedges; Prev preserves the airy, light-key value balance of `ref-a`–`ref-c`. |
| **Finish** | **6.5** | **8.0** | Tape keeps clean skin grain (std 0.08–0.22) and subtle cloth grain (0.47–0.48), but fill leaks (`(274,1394)`, `(410,855)`) and hand-side haloing `(708,370)` hurt polish; Prev is cleaner edge-to-edge. |

---

### B. Process Compliance (Passes 1–10)

1. **Flats — Followed:** Skin `#fcf1ec`, greyed teal jacket `#708888`, mid-light crown `#d0a8a0`, non-black dark tank `#484850`.
2. **Gradients — Partly:** Cheek/shoulder blush present, but crown-to-back hair drops **79 Lab L** (`184` at `(475,130)` to `105` at `(230,345)`), far past the 20–35 rule.
3. **Contact — Followed:** Soft occlusion sits cleanly at cuffs `(245,980)`, collar `(520,425)`, and strap overlaps `(535,765)`.
4. **Shadow shapes — Partly:** Cast/fold cloth shapes read well, but shaded skin hits **~44%** on face and right hand (rule: 15–30%; shoulder passes at 24.7%).
5. **Edges & warm band — Followed:** Warm `#d7ada3`–`#dcb0a5` band sits inside the shadow edge, 3–6 px on cast (shoulder `(360,597)`) and 6–8 px on form (jaw `(564–572,335)`).
6. **Deep shade — Partly:** Skin hits `#95787c` at neck `(575,410)` and jacket/pants hit ~0.68× OKLCH, but tank folds drop only 31% (`0.405` to `0.280`, shy of 35–45%) and white trim stays warm `#e8e4df`/`#d8d3cb` instead of lavender grey.
7. **Ring & light shapes — Broken:** Hair highlight (`+25 Lab L`) breaks into disconnected streaks `(360–570,80–210)` with warm lips on both sides (`(440,132)` and `(440,198)`); dark tank sheen `(540–620,600–640)` is fuzzy/blobby rather than crisp and tapered.
8. **Face & eyes — Broken:** Upper sclera shadow is barely visible (`#fbf7f6` at `(508,240)`), iris lacks crisp top bands, and nose highlight `(455,288)` is soft, not crisp warm-white.
9. **Colour line — Broken:** Near-black neutral ink persists inside skin (`#2c2127` armpit `(409,591)`, `#1d161d` shoulder `(300,500)`) and pants (`#2a2829` `(553,1180)`).
10. **Finish — Partly:** Grain matches (skin 0.08–0.22, jacket/tank 0.47–0.48), but background halo reaches **9.8%** near `(139,96)` (cap: 9%) and ghosts near the raised hand `(708,370)`.

---

### C. Consistency

**No—they look like two artists using the same shader, not one studio.** Both share identical skin lighting, warm shadow lips, stamped `////` cheek hatches, and floating sparkles, proving the shader math transfers. However, `previous-character.png` reads as airy, fine-lined gacha splash art (`ref-a`/`ref-c`), while `tape-full.png` reads as heavier, ink-wedged comic/street-anime cel shading. The split comes from two things: `line.png`'s thick inked shadow wedges, and `tape-full.png`'s broken hair ring, darker back hair, and near-black lines.

---

### D. Strongest 3 & Weakest 5

**Strongest 3:**
1. **Hard-surface prop & decal integration:** Cassette deck, metallic buckle/carabiner, and `LOW TIDE` / `SIDE A` typography (`(50–350,1100–1410)`, `(220–310,630–680)`) match `ref-d` polish.
2. **Cloth value architecture:** Teal jacket and khaki pants lock cleanly onto the ~0.68–0.70 OKLCH shadow step with confident, readable fold planes.
3. **Subsurface warm band placement:** Consistently tucked *inside* skin shadow edges across jaw, neck, shoulder, and wrist.

**Weakest 5:**
1. **Heavy black ink & baked shadow wedges — `LINE ART` + `RULE`:** `(495–545,395–415)` chin/neck, `(300,500)` shoulder silhouette, `(553,1180)` pant crease; raw ink is too thick and Pass 9 fails to tint it red-brown/coloured.
2. **Fragmented hair highlight & over-dark back mass — `SHAPE` + `RULE`:** `(360–570,80–210)` broken ring streaks and `(160–330,300–410)` Lab 105 back hair kill the `ref-b` halo read.
3. **Muddy tank-top chest sheen — `SHAPE`:** `(535–625,595–645)` reads as a smudged grey oval instead of a tapered dark-cloth highlight.
4. **Under-rendered eyes, soft nose dot, stamped blush — `RULE` + `LINE ART`:** `(380–430,265–295)` / `(495–565,225–255)` tiny slits drop eye layering; `(455,288)` nose highlight lacks crispness; `(415,325)` / `(535,285)` `////` hatches look pasted on.
5. **Warm-shaded white trim — `RULE`:** `(200–400,620–980)` jacket trim and `(100–240,1200–1360)` cassette panel shade beige/grey instead of lavender grey.

---

### E. Remaining Bugs (`line.png` coords)

- **`(272–278, 1390–1398)`:** Khaki pant grey (`#928c82`–`#a89f92`) smears across the ochre bottom rim of the cassette deck beneath the `VOL` screw.
- **`(405–420, 840–875)`:** Jagged pale/white speckling bleeds along the right edge of the white jacket lapel against the brown lining.
- **`(365–418, 418–432)`:** Detached, blobby shadow mark floats on the lit upper-left shoulder crest with no clean caster alignment.
- **`(704–718, 368–394)`:** Faint pinkish-grey halo ghosting (`#f6f3f4`) floats in open white space beside the raised fingers/wrist.
- **`(351, 472)`:** Isolated circular soft white airbrush dot on the shoulder clashes with the crisp plane language.

---

### F. Verdict

- **Style match:** **FAIL** (drifts into heavier comic cel-shading due to thick near-black ink, broken hair ring, and weak eye/white-cloth rules).
- **Repeatability:** **PARTIAL PASS (FAIL as a strict zero-edit pipeline)** — core skin/cloth math repeated cleanly on a complex new design, but line-art style variance and hand-placed shape/rule slippage broke cast consistency.
- **Distance to references:** **~72%** of the way to `ref-a`–`ref-d` (vs **~82%** on `previous-character.png`).
- **For the client:** This pipeline can color a full game cast consistently **only** if you first enforce a strict line-art weight spec across artists and fix the line-tint and hair-ring rules—right now, different line weights make two characters from the same engine look like different studios.
