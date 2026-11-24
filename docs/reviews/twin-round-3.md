# Twin-tails, round 3

Written by Gemini 4 Neon, unedited apart from removed machine paths. Not every claim held up when measured: see `../history.md`.

Reviewed all references (`ref-a.png`–`ref-d.png`), `line.png` (1200×1655), `r1-full.png`, `r2-full.png`, and `r3-full.png` plus crops (`r3-head.png`, `r3-torso.png`, `r3-legs.png`). All `L` values below are OpenCV Lab L (0–255, matching `#bb9f9b` ≈ L 173); all coordinates are in `line.png` space.

---

### A. Round 2 Sign-Off Criteria

1. **Stockings (crisp sheen ribbons & real shadow depth): Partly.**
   - *Sheen met*: `r2`'s broad soft haze (20.1% at L ≥ 85, 0.1% ≥ 105) is replaced by crisp two-tier ribbons (7.4% ≥ 105; outer L 112 `#6e6773`, core L 135 `#817d83`, matching `ref-b`/`ref-d` p98 L 133–134; ~3 line-px core edge at `(461, 1320)`).
   - *Shadow depth missed*: Shadow coverage rose slightly (33.2% → 35.6%) and climbed higher at the knee (`y=1451` vs `1463` at `x=520`), but shadow core actually *lightened* (L 37 `#292331` → L 42 `#2d2636`), and boundaries on `(420–680, 1435–1545)` remain slightly blobby rather than tight fold/cylinder depth.
2. **Crown & bangs (two-step shadows; ring softened 4–5 px, warm bottom lip only): Partly.**
   - *Ring & bangs met*: At `x=635`, `r2`'s top pink fringe (`y=208`, R−B = +3) is gone (`r3` R−B = −9); edges soften over ~4–5 line px (`y=204–212`, `252–260`); ring body sits at L 215 (+26 over crown base 189) with a warm lower lip only (`y=252`, L 226 `#e5dcdf`, R−B = +6). Lower bangs show two clear shadow clusters (L 140–155 and L 95–110 vs `r2` floor 124).
   - *Crown missed*: Upper crown `(500–740, 95–215)` remains mostly flat base (p10 L 187 vs median L 190) without true two-step shadow sculpting.
3. **Outlines lifted, limb form shadows ~L 173, eye contrast tightened: Partly.**
   - *Eyes met*: Lash core deepened from L 35 to L 17–18; upper iris darkened (p10: 89 → 77 left, 85 → 70 right) against brighter lower crescents and crisp top sclera shadow.
   - *Outlines partly*: Bangs (57 → 97 `#5d5769`), crown (65 → 113 `#6c6678`), right tail (56 → 94), and lit skin (+6–9 L: forearms 81 → 88 `#654b49`, cleavage 120 → 129 `#91716c`) lifted well; left twin-tail interior stayed flat (69 → 72) and right outer bare thigh darkened (63 → 45 `#2c2a3f`).
   - *Limb form shadows not met*: Core interiors stayed unchanged at **L 183–184 (`#c9aaa4`)** across forearms, right shoulder, left thigh underside, right thigh inner/outer, and heel (only the cast shadow under the left skirt dropped to L 163).
4. **Seven bugs cleaned: Met.**
   - Halter knot/strap stippling `(445–752, 535–674)`, forehead notch `(540–679, 299–353)`, navy sliver by right bow (`r2` `#435067` at `(788–824, 330–403)` → hair-shadow `#63627d`), hip shadow island `(256–381, 1130–1268)`, cleavage notch `(575–644, 759–834)`, top pink ring fringe `(520–728, 185–234)`, and heel seam clumping `(330–394, 1369–1444)` are all resolved.

---

### B. Style Scores (0–10)

| Dimension | r2 | r3 | Notes |
|---|---:|---:|---|
| Outline | 6.5 | 7.5 | Bangs/crown/lit-skin lifted; left tail & right thigh lag |
| Shadow shapes | 6.0 | 7.0 | Cleaner bangs/cleavage/stockings; weak crown & soft cup lights |
| Skin & subsurface | 7.0 | 7.2 | Clean `#fcf1ec` & 25% coverage; limb shadows stuck at L 184 |
| Hair | 6.5 | 7.8 | Crisp ring + bottom lip, good bang depth; tails too close to crown |
| Eyes & face | 7.0 | 8.3 | Strongest gain; dark lash core, rich iris, clean blush/nose dot |
| Cloth & materials | 5.5 | 7.3 | Stocking sheen & gold/white trim strong; blue cups/folds soft |
| Palette & values | 6.8 | 7.6 | Cohesive & clean white page; midtone depth slightly compressed |
| Finish | 6.2 | 7.8 | All 7 r2 bugs fixed; minor sheen stiffness & line leaks remain |

---

### C. Remaining Differences from References (Ranked)

1. **Shallow single-value limb form shadows** — **RULE problem**
   - *Coords*: Left forearm `(440–540, 880–1100)`, right forearm `(660–745, 920–1120)`, right shoulder `(740–795, 580–690)`, thighs `(280–410, 1210–1360)`, `(640–720, 1150–1280)`, `(810–885, 1180–1300)`.
   - *Fix*: Implement the inner shadow step so limb cores drop from `#c9aaa4` (L 184) at the terminator to `#bb9f9b` (L 173) inside (matching `ref-a`/`ref-d` L 172–177), with `#a38386` (L 147) in tight overlaps.
2. **Insufficient crown-to-tail value separation & flat upper crown** — **RULE problem**
   - *Coords*: Crown right `(640–770, 85–210)`; twin-tails `(100–380, 350–1450)` and `(820–1120, 320–1450)`.
   - *Fix*: Lower hanging twin-tail base by −15 to −25 L (from ~172 to ~150–155, closer to `ref-a`/`ref-b`'s 45–55 L drop) and place a two-step shadow plane on the right crown/back-hair transition.
3. **Stiff stocking sheen polygons & under-modeled stocking shadows** — **SHAPE problem**
   - *Coords*: Left stocking `(420–680, 1275–1545)`, right stocking `(725–895, 1320–1560)`.
   - *Fix*: Taper sheen ribbons into sharper anatomical wedges (remove the boxy kink on the right shin), deepen shadow core to L 34–37, and tighten the knee-crease terminator (2–3 px).
4. **Soft, blobby highlight shapes on blue swimsuit cups & skirt folds** — **SHAPE problem**
   - *Coords*: Cups `(430–550, 710–820)`, `(680–785, 700–830)`; skirt `(220–465, 1025–1160)`, `(675–845, 1085–1195)`.
   - *Fix*: Replace the blurred curved cup sheen bands with crisp cel-shaded lit planes (2–3 px edge, like `ref-c`) and sharpen shade-1/shade-2 fold breaks in the ruffles.
5. **Asymmetric outline lifting & dark bleed onto bare skin** — **RULE problem**
   - *Coords*: Left tail interior `(160–340, 500–900)` (L 72); right outer thigh `(845–900, 1185–1280)` (L 45).
   - *Fix*: Apply the same interior-hair lift (L 90–110) to the left tail and clamp bare-skin silhouette lines to red-brown L 75–90 so dark cloth cannot bleed onto skin edges.
6. **Uniform stroke weight lacking tapered ink junctions** — **LINE ART limit**
   - *Coords*: Interior arm strokes `(430–490, 740–1060)`, stocking cuffs `(405–670, 1255–1340)`, tail silhouettes `(70–370, 400–1400)`.
   - *Fix*: Unfixable by colouring alone (`line.png` lacks `ref-a..d`'s tapered line weight); mitigate only by lifting interior lines further.
7. **Slightly soft iris value bands** — **SHAPE problem**
   - *Coords*: Left iris `(530–580, 335–395)`, right iris `(670–720, 355–415)`.
   - *Fix*: Crisp the boundary (1.5–2 px) between upper dark iris, pupil core, and lower golden crescent to match `ref-b`/`ref-d`.

---

### D. Remaining Bugs

1. **Right outer bare-thigh outline darkened to navy-grey**: `(845–900, 1185–1280)` (`#2c2a3f`, L 45 vs left thigh `#584141`, L 77).
2. **Left twin-tail interior lines missed by lift pass**: `(160–340, 500–900)` (stuck at `#444051` L 72 vs right tail `#5a5466` L 94).
3. **Abrupt dark-violet hair pockets behind both bows**: `(394–479, 150–323)` and `(773–824, 330–415)` — no longer wrong-hue navy, but hard striped wedges sit overly dark against the lifted side-locks.
4. **Small dark shadow pinch at lower cleavage/trim junction**: `(602–624, 815–835)` just above the gold bow apex.

---

### E. Review of Draft Rules List

1. **Agree.**
2. **Agree** (matches `ref-a/c/d`; enforce the `#bb9f9b` interior step in code).
3. **Change to**: Warm band `#e2b1a5`, **3–6 px on cast shadows and 6–10 px (softer) on broad form shadows**, along the lit-to-shade terminator only.
4. **Change to**: Cast shadow edges **1–2.5 px**; form shadow edges **4–10 px scaled to form radius** (4–6 px on wrists/arms, 7–10 px on thighs/bust).
5. **Agree.**
6. **Change to**: Keep +22 to 28 L and warm lower lip, but specify **softer upper crown fade (6–10 px) and firmer scalloped lower edge (3–5 px)** rather than equal blur on both sides.
7. **Change to**: Add numeric drop: **hanging/back hair base −20 to −35 L darker than crown**, cooler toward tips, shade 2 heading toward slate-violet.
8. **Agree.**
9. **Change to**: **Shade 1 at ~0.62–0.70 lightness, shade 2 at ~0.45–0.55** (`ref-c` blue measures 0.62 / 0.46; 0.72 / 0.57 is too shallow on darker fabrics).
10. **Change to**: Dark cloth: **tapered crisp sheen ribbons (peak L 125–140, never white) plus a clear deep-shadow fold tier (L 32–40, ~35–45% below base)**.
11. **Agree.**
12. **Agree.**
13. **Agree** (add: keep internal iris bands crisp at 1–2 px).
14. **Change to**: Add a **bare-skin line clamp (warm red-brown L 70–95)** and **explicit interior-line lift (+30–45 L over silhouette)** so dark cloth cannot tint skin edges.
15. **Change to**: Skin clean, hair/cloth slight grain; **pure `#ffffff` page (0% figure halo)**—all four references sit on clean white with no halo.
16. **Change to**: Blush soft plus strokes; crisp warm-white nose mark; **shoulder/hip/knee highlight dots semi-crisp (2–4 px edge)** so they read cleanly like `ref-d` instead of fading out.

---

### F. Verdict

**Do not sign off yet** — hold for one focused polish pass (`r4`) to fix limb form-shadow depth (L 184 → 173), crown/tail value separation, stocking shadow depth/sheen taper, blue cup shapes, and the two outline leaks.

*Client summary*: `r3` is a clean, appealing anime render sitting roughly 80% of the way to the references—strong eyes, clean finish, and solid skin warmth—needing one final pass on limb/hair value depth and dark-cloth shaping to match the target style.
