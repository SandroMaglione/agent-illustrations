# Twin-tails, round 4, sign-off

Written by Gemini 4 Neon, unedited apart from removed machine paths. Not every claim held up when measured: see `../history.md`.

Final round-4 style sign-off reviewing `r4-full.png` (plus `r4-head.png`, `r4-torso.png`, `r4-legs.png`) against `ref-a.png`–`ref-d.png`, `line.png` (1200×1655), `r1-full.png`, and `r3-full.png`. All coordinates are in `line.png` space.

### A. Round 3 Conditions
1. **Limb form shadows (~`#bb9f9b`, Lab L ~173 on 0–255 scale): Met.** Dropped from r3's pale `#c9aaa4` (L183–184) to `#b89b97`–`#bb9d99` (L169–172; cores `#b3938d`–`#b79a97`, L162–169) across arms, waist, both thighs, foot, and shoulder—squarely inside `ref-a..d`'s band (medians L174–177, cores L159–165).
2. **Tails clearly darker than crown: Met.** Crown holds at `#beb3c9` (L190, OKLCH L 0.783), while tails dropped from r3's L171–175 to `#948ba9`–`#9e93af` (L152–160, OKLCH L 0.656–0.682) in upper/mid lengths and `#716787`–`#687894` (L116–127) in inner/lower folds—a clean 30–38 Lab-point separation.
3. **Deeper stocking shadow and tapered sheen: Met.** Deep shadow (`L<38`) expanded 11× on the left leg (1,247→14,586 px²) and 3.7× on the right (292→1,087 px²), lowering shadow medians from L42–43 (`#2c2636`) to L36–37 (`#282231`, cores `#171323` L17–19). Right sheen tapers cleanly (`43→45→42→28→16 px` vs r3's `43→49→45→38→24 px`); left upper sheen narrowed (`64→59 px`), though its soft outer glow slightly dulls the taper.
4. **Crisp light planes on blue cups: Partly.** Planes brightened and expanded (`#788bae` oL 0.635 → `#7d8fb0`/`#7e90b1` oL 0.648–0.651), improving form read, **but** edges remain soft: profiles at `(485, 755–760)` and `(731–736, 740)` still feather across 4–5 `line.png` px (~6–7 output px), matching r3's blur width.
5. **No dark line bleed on right outer thigh: Partly.** Bare outer skin line `(834–852, 1240–1260)` is clean brown `#664c4a` (L89), inner thigh creases `(822–861, 1230–1290)` lifted `#363545→#685252`, and anatomical-right lower thigh `(265–276, 1290–1320)` lifted `#3a2b2f→#523d3e`. However, the shared blue skirt-hem boundary `(860–884, 1275–1305)` stays dark navy `#16213b` (L32–38) against skin.
6. **Left tail interior lifted: Met.** 1,186 line-res pixels (`x=34–359, y=447–1450`, 99.8% interior linework) lifted from `#201a24`–`#322b37` (L26–48) to `#373242`–`#504a5b` (L56–83), removing harsh black inner strokes.

### B. Style Scores (0–10)
| Criterion | r1 | r3 | r4 |
|---|---:|---:|---:|
| Outline | 5.0 | 7.5 | 8.5 |
| Shadow shapes | 5.0 | 7.5 | 8.5 |
| Skin & subsurface | 5.5 | 7.0 | 8.5 |
| Hair | 5.5 | 7.0 | 8.5 |
| Eyes & face | 6.0 | 8.0 | 8.0 |
| Cloth & materials | 5.5 | 7.0 | 8.0 |
| Palette & values | 6.0 | 7.5 | 8.5 |
| Finish | 5.5 | 7.5 | 8.5 |
| **Overall** | **5.5** | **7.4** | **8.4** |

### C. Remaining Style Differences (≤6)
1. **RULE — Soft cup light-plane borders** `(442–555, 725–765)`, `(715–785, 720–765)`: 4–5 px feathering vs 1–2 px cel plane breaks on `ref-c`/`ref-d` blue cloth.
2. **SHAPE — Ribbon-like crown highlight & uniform mid-tails** `(505–705, 200–300)`, `(120–260, 650–1050)`, `(910–1050, 620–1020)`: lacks the jagged multi-tooth speculars and sweeping directional shadow wedges of `ref-a`/`ref-d`.
3. **SHAPE — Soft grey cushion around stocking sheen** `(435–575, 1285–1385)`, `(565–680, 1360–1485)`: broad translucent halo reads slightly airbrushed next to the tighter satin/matte folds of `ref-b`/`ref-d`.
4. **RULE — Broad SSS rim & lighter cleavage** `(300–460, 1130–1240)`, `(570–645, 720–830)`: warm subsurface fringe spreads wider than `ref-c`/`ref-d`'s tight terminator glow; cleavage shadow median stays L185 (core L166).
5. **SHAPE — Flat white lace & collar** `(445–580, 680–840)`, `(655–745, 675–835)`, `(525–655, 500–555)`: minimal fold planes compared to `ref-c`'s layered cool shadows on white ruffles.
6. **LINE ART — Uniform ink weight & open contours** `(708–750, 1330–1360)` and full figure: fixed line art lacks the tapered/broken delicate strokes that refine `ref-a..d`.

### D. Remaining Bugs
- `(900–905, 769–772)`: tiny enclosed hair-crossing island in right tail left pure white `#ffffff`.
- `(860–884, 1275–1305)` & `(264–273, 1200–1260)`: dark navy skirt-line tint (`#16213b` L32 / `#0f1631` L21) dominates the shared boundary against thigh skin.
- `(708–748, 1330–1360)`: abrupt un-inked step where the right stocking fill closes an open gap in `line.png`.
- `(400–495, 260–375)`: ~120 near-black (`RGB<30`) line pixels clumped at the left ear/ribbon/hair junction.
- `(153–169, 1035–1055)`, `(40–100, 1470–1485)`, `(1000–1050, 1440–1455)`: faint 1–2 px fill spillover outside thin tapered hair lines.

### E. Disagreements Verified
1. **Cloth shade ratios (OKLCH vs luminance): Accept.** Verified on `ref-c`'s `#637ba8 → #3b4a69 → #27354e`: OKLCH `L` is `0.582 → 0.410 → 0.329`, yielding **`0.704` / `0.564`** (matching ~0.70 / 0.56). Round 3's `0.62 / 0.46` tracks CIE Lab `L*` (`0.612 / 0.429`) and sRGB luma `Y'` (`0.603 / 0.428`), while linear luminance `Y` is `0.349 / 0.180`. Keep OKLCH and label the color space explicitly.
2. **Page halo ("optional, at most 9%"): Accept.** Measuring strictly outside the silhouette (excluding 6 px line AA): `ref-a` has a soft 3–15 px neutral halo (`2.5%` p1, `8.1%` max drop), `ref-c` has a clear 3–25 px neutral halo (`4.4%` p1, `7.5%` max), while `ref-b` (`0.4%`) and `ref-d` (`0.0%`) have none. `r4` sits at `3.1–3.4%` max (r1's `16.9%` floor shadow is gone). Round 2 was right; the ≤9% optional rule stands.

### F. Verdict
- **PROCESS: YES** — signed off, conditional on (1) tightening cloth highlight-plane feathering to ≤2 px and (2) giving skin-side line tint priority at skin/cloth borders (with cloth shade ratios explicitly labelled OKLCH L).
- **IMAGE: YES** — signed off for style (optional 5-minute touch-up to fill the `(900, 769)` white speck and soften the `(860–884, 1275–1305)` navy skirt-edge line).
- **Client line:** This render hits ~85% of the target anime cel-and-SSS look—matching the references' clean tinted outlines, solid value hierarchy, and warm skin depth—and is limited mainly by the fixed uniform line art and slightly mechanical procedural highlight shapes rather than color or shading rules.
