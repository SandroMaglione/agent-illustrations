# Twin-tails, round 1

Written by Gemini 4 Neon, unedited apart from removed machine paths. Not every claim held up when measured: see `../history.md`.

All coordinates in sections 2–3 are in `line.png` space (`1200×1655`; multiply by `1.5` for `r1-full.png`).

---

### 1. Scorecard (0–10 against references)

- **Outline — 4/10**: `ref-a.png` (left belly/arm) and `ref-c.png` (outer arms/waist) keep outer skin lines thin (`0.4–0.6%` of head height) and warm mid-dark (`#584950`–`#9c9799`), whereas `r1-full.png` wraps pale skin, toes, and pastel hair in a heavy near-black `#1d171f` silhouette (`0.77–0.92%` of head height) that reads like a coloring-book sticker.
- **Shadow shapes — 3/10**: `ref-d.png` (belly and raised thigh) uses confident, form-following curved shadow planes that obey one light direction, whereas `r1-head.png` puts an anatomically inverted jagged shadow hook on the lit lower-left chin and `r1-legs.png` pastes lumpy polygonal shadow strips onto the lit outer left thigh and straight-edged vertices onto the right thigh.
- **Skin and subsurface — 4/10**: `ref-a.png` (belly) and `ref-d.png` (right waist) drop skin shadow to lum `165–176` (`#bda39c`–`#c2a8a1`) with a muted coral-peach SSS shift (`sat 0.19–0.22`) sitting *inside* the `4–8px` terminator, whereas `r1-torso.png` and `r1-legs.png` keep skin shadow too pale (`#dbb5aa`, lum `191`) and outline its *lit* edge with an over-saturated orange-salmon stripe (`#eeb8a5`, `sat 0.31`).
- **Hair — 3/10**: `ref-d.png` (twintails) and `ref-a.png` (back hair) drop back/hanging hair `15–30%` darker than the crown and break highlights into strand-aligned feathered shards, whereas `r1-full.png` leaves both huge twintails nearly flat at crown brightness (`#bbb1c7` vs `#bdb2c8`) and stamps a solid, hard-edged scalloped highlight band across the bangs.
- **Eyes and face — 4/10**: `ref-b.png` and `ref-c.png` cast a clear cool-grey shadow across the upper sclera (`#a0a4a9`), give the iris deep dark-to-luminous-lower-crescent contrast, and softly warm the bang tips over the brow, whereas `r1-head.png` leaves the sclera dead flat `#fbf7f6`, uses low-contrast muddy tan irises (`#7d5445` to `#cbb299`) with weak pupils, and pastes a stark white teardrop on the nose.
- **Cloth and materials — 4/10**: `ref-c.png` (blue swimsuit ruffles) and `ref-b.png` (dark jacket) combine soft form gradients, crisp mid-shadows, deep third-step crease occlusion, and crisp specular highlights, whereas `r1-torso.png` and `r1-legs.png` flatten the blue swimsuit into two dead steps, leave the gold bow/trim non-metallic dull mustard (`#c29c68`), and paste clumsy grey polygon stickers onto flat `#413a48` stockings.
- **Colour palette and values — 5/10**: `ref-c.png` and `ref-d.png` separate foreground skin/face from mid-value cloth and deeper back hair with clear value steps, whereas `r1-full.png` compresses skin shadow (`lum 191`) too close to lit skin (`lum 243`) and leaves back twintails as bright as the crown, flattening figure-ground depth.
- **Finish — 4/10**: All four references sit crisp on pure `#ffffff` with zero silhouette halo and clean fills, whereas `r1-full.png` adds a muddy `#f5f5f7` outer halo, a fuzzy oval floor smudge, blurry airbrushed cyan petals/stars that clash with cel linework, and heavy noise on thighs (`std 11.4` vs `0.5–0.6` in `ref-b`/`ref-c`).

---

### 2. Top 12 Changes to Close the Gap (Ranked)

1. **Delete and rebuild the chin & neck shadow**
   - **Where**: Chin `(521,450)–(619,514)` and neck/collar `(525,500)–(665,575)`.
   - **What is wrong**: A hard-edged grey-brown hook blotch (`#dbb5aa`) sits directly on the lit lower-left chin facing the upper-left light, reading like dirt or a bruise.
   - **References do instead**: `ref-a`, `ref-b`, `ref-c`, and `ref-d` keep the entire lower face clean lit skin; the head casts a crisp shadow strictly *below* the jawline onto the neck, plus at most a faint `4–6px` bounce/turn shadow along the *right* (away-from-light) jaw rim.
   - **Exact fix**: Remove the polygon at `(521,450)–(619,514)` completely. Paint a crisp cast shadow (`blur 1.5px`) on the neck only: polygon `[(532,510), (575,525), (625,522), (656,506), (654,548), (538,546)]` in `#b99a95` with a deeper occlusion wedge `[(545,512), (642,510), (636,528), (552,526)]` in `#9f8180` (`opacity 0.85`). Add a slim soft form shadow along the right cheek edge `[(665,455), (710,432), (716,450), (674,480)]` in `#d4b3ab` (`opacity 0.35`, `blur 6px`).

2. **Deepen skin shadows, add 2nd occlusion step, and move/desaturate the SSS band**
   - **Where**: All skin regions—face `(480,270)–(750,515)`, chest/cleavage `(450,540)–(760,860)`, arms `(340,560)–(800,1260)`, thighs/foot `(205,1130)–(930,1470)`.
   - **What is wrong**: Primary skin shadow `#dbb5aa` (`lum 191`) is `15–22` lum points too bright; deep crevices (cleavage, under breasts, under skirt ruffles, behind arms) lack a darker occlusion pass; and the `#f0b7a2` (`sat 0.31`) band sits on the *lit* side like an orange outline.
   - **References do instead**: `ref-a` and `ref-d` drop primary skin shadow to `#c2a59d`–`#bc9f97` (`lum 166–176`), deepen tight crevices to `#a98c88`–`#b79990`, and place a subtle warm coral-peach SSS tint (`#e2b8ae`–`#e8bfb4`, `sat 0.20–0.22`) *straddling/just inside* the shadow terminator (`4–6px` wide).
   - **Exact fix**: Change primary skin shadow from `#dbb5aa` to `#c4a39c` (warm side) → `#b59796` (deeper interior). Replace the `#f0b7a2` lit-side band with a `4px` inner-edge gradient stroke *inside* the shadow mask in `#e3b5a8` (`opacity 0.70`, `blur 2.5px` on cast edges, `5px` on form edges). Add a 2nd ambient-occlusion pass (`#a38385`, `opacity 0.65`, `blur 3px`) at cleavage `(580,680)–(630,835)`, under-breast creases `(440,830)–(590,885)` & `(645,840)–(765,895)`, inner armpits `(420,680)–(460,760)` & `(745,690)–(780,780)`, and directly under skirt ruffles `(285,1140)–(450,1185)` & `(675,1165)–(810,1215)`.

3. **Add full-volume shadow masses and back-hair depth drop to the twintails and crown**
   - **Where**: Left twintail `(15,150)–(420,1485)`, right twintail `(795,180)–(1165,1490)`, back hair behind neck/shoulders `(430,270)–(790,540)`.
   - **What is wrong**: Both twintails stay at crown brightness (`#bbb1c7` vs `#bdb2c8`) with only thin sliver shadows, making them read as flat paper cutouts with zero cylindrical volume or foreground/background depth.
   - **References do instead**: `ref-a`, `ref-b`, and `ref-d` drop hanging/back hair by `15–35` lum points (`ref-a`: `#d8cdb8` → `#9a927e`; `ref-d`: `#577364` → `#4b6259` with `#35463f` core shadow) and wrap broad, curved form-shadow masses across `35–50%` of each twintail's width.
   - **Exact fix**: Apply a base darkening multiply/fill pass over both twintails behind the ears (`#9c94b3` at `opacity 0.45`, ramping from `0` at `(410,190)` / `(815,210)` to full depth by `y=550`) and deeper behind-neck hair (`#857ea0` at `opacity 0.65`). Add broad curved form-shadow polygons along the right/underside of every twintail S-curve (e.g., left lower curl `[(180,980),(280,1040),(265,1260),(115,1375),(45,1430),(140,1270),(190,1130)]`, right lower curl `[(930,830),(1075,920),(1080,1160),(1010,1360),(1115,1440),(955,1340),(960,1120)]`) in `#87809e` (upper) transitioning to `#647b96` (lower blue tips), `blur 2px`, plus a `2nd` deep crease shadow `#6c6586` (`opacity 0.55`) inside overlapping hair twists.

4. **Replace the solid scalloped hair ring with strand-broken, feathered highlight shards + bang skin-bleed**
   - **Where**: Crown highlight band `(477,170)–(768,289)` and bang tips `(495,295)–(735,365)`.
   - **What is wrong**: A continuous `40px`-tall solid `#d7cedf` band with a `2px` hard step and `#dfd5dd` lip cuts straight across strand lines like a plastic headband, and opaque cool bangs clash harshly against the forehead.
   - **References do instead**: `ref-a`, `ref-b`, `ref-c`, and `ref-d` break highlights into `5–8` slim, tapered, strand-following wedges that stop at every parting gap and feather smoothly vertically (`8–15px` soft fade), while `ref-a`, `ref-b`, and `ref-c` airbrush a warm skin-tone translucency (`opacity 0.25–0.35`) into the bottom `15–25px` of the bangs over the brow.
   - **Exact fix**: Delete the solid ring `(477,170)–(768,289)`. Paint `7` separate tapered highlight ribbons inside individual hair clumps along an arc from `(485,220)` through `(625,195)` to `(755,255)`—each `14–24px` tall, `30–65px` wide, separated by `8–14px` gaps aligned with interior strand lines—using a vertical linear gradient (`transparent` → `#ece6f4` `opacity 0.72` → `transparent`, `blur 2px`) plus `3` thin crisp specular ticks (`#f8f4ff`, `opacity 0.85`, `width 4px`, `blur 0.5px`) on the upper-left lit clumps (`(525,205)`, `(590,195)`, `(655,200)`). Mask a linear gradient inside the lower `25px` of the forehead bangs (`y=310..355`) from `#f7d8cc` at `opacity 0.38` (tips) to `0` (`y=310`).

5. **Overhaul outer and interior line weight & color**
   - **Where**: Full figure outline, especially skin contours—left shoulder/arm `(345,530)–(465,1120)`, right arm `(740,580)–(790,1150)`, thighs/foot `(205,1160)–(930,1470)`, and face jaw `(475,370)–(750,515)`.
   - **What is wrong**: Outer contour is uniformly near-black `#1d171f` and `5–6px` wide at `1.5×` (`0.77–0.92%` of head height), crushing skin delicacy and fighting the pastel palette.
   - **References do instead**: `ref-a`, `ref-b`, and `ref-c` tint outer lines per material (warm brown `#5a423e`–`#766a5e` on skin, `#4c4f4c`–`#5e635b` on pale hair, `#283044` on blue cloth) and thin skin/interior lines to `0.40–0.65%` of head height.
   - **Exact fix**: Recolor the outer lineart via material-proximity mask instead of global `#1e1921`: skin outer contour `#4f3536` (lit) / `#3d282b` (shadow); skin interior lines (cleavage, toes, fingers, collarbone) `#7d5654` (`opacity 0.80`); pale hair outer `#3e384f`, hair interior `#5c5470`; blue cloth outer `#202742`; stockings outer `#1f1a28`. Erode skin/hair line alpha by `0.7px` (in `line.png` space) on lit edges so effective width drops from `~4px` (`0.92%` head height) to `~2.2–2.8px` (`0.50–0.65%` head height).

6. **Rebuild the eyes (sclera shadow, iris depth, lower glow, crisp speculars) and fix the nose highlight**
   - **Where**: Left eye `(515,340)–(588,395)`, right eye `(665,370)–(735,425)`, nose `(610,394)–(621,414)`.
   - **What is wrong**: Sclera is dead flat `#fbf7f6` with zero lash shadow; irises are flat low-contrast tan (`#7d5445` → `#cbb299`) with a pale, washed-out pupil (`#dbb68c`!); and the nose highlight is an opaque `#ffffff` teardrop pasted directly above the nose dot.
   - **References do instead**: `ref-b` and `ref-d` cast a cool-grey shadow across the upper `35%` of the sclera (`#a0a4a9` / `#908177`), drop the upper `40%` of the iris into deep shadow, use a rich dark pupil with a glowing saturated lower crescent (`ref-c`), and place crisp bright specular dots straddling the upper-left iris edge.
   - **Exact fix**:
     - Sclera: paint an upper curved cast-shadow band (`height 11px` from upper lash) in `#b5aeb8` (`opacity 0.85`, `blur 1.2px`) across both scleras.
     - Irises: vertical gradient from deep umber `#4c3128` (top `35%`, hard edge `blur 1px` curving with upper lid) → rich amber `#b5804a` (mid) → glowing golden crescent `#f4d28c` (`height 9px` at bottom `25%`, `blur 1.5px`); dark crisp pupil ellipse (`9×11px` at `(550,368)` and `(687,395)`) in `#3b2420` (`opacity 0.92`); outer iris ring `2px` in `#5a3d33`; primary crisp specular `#ffffff` (`6×7px` oval at `(541,355)` & `(678,383)`), secondary pin dot `#fff8e8` (`2.5px` at `(561,379)` & `(698,405)`), and faint colored bounce arc `#ffe7b0` (`opacity 0.55`) at lower-right rim.
     - Nose: reduce teardrop `(610,394)–(621,414)` from `#ffffff` `opacity 1.0` to a `5×7px` soft diamond at `(616,407)` in `#fffaf6` `opacity 0.45`, `blur 2px`.

7. **Redraw the thigh, hip, and forearm shadow polygons to obey upper-left light and remove pimple dots**
   - **Where**: Left outer thigh `(250,1140)–(360,1380)`, right outer thigh `(780,1180)–(895,1320)`, left & right forearms `(415,820)–(575,1235)` & `(625,845)–(775,1245)`, white dots at `(376,567)`, `(790,600)`, `(322,1201)`.
   - **What is wrong**: A wavy shadow strip runs up the *lit* left outer thigh; the right thigh shadow has visibly straight polygonal corners; forearm shadows are stiff vertical stripes; and three tiny circular `#ffffff` dots on the shoulders and hip look like plastic pimples.
   - **References do instead**: `ref-d` (thighs/belly) and `ref-c` (arms) use smooth Bezier form shadows strictly on the away-from-light/underside planes, crisp cast shadows under clothing hems, and large, sleek, elongated specular bands (`ref-d` thigh) or soft broad peach/white sheen (`ref-c` shoulder).
   - **Exact fix**: Remove the wavy upper-left thigh shadow above `y=1240` (keep only a narrow bottom underside roll-off `[(275,1275),(305,1345),(370,1395),(415,1415),(395,1435),(315,1390),(262,1310)]` + crisp cast shadow directly under the left skirt ruffle `[(275,1145),(365,1140),(435,1165),(430,1188),(355,1162),(270,1170)]`). Smooth the right thigh shadow into a single clean Bezier curve wrapping the outer-right cylinder `[(790,1170),(848,1225),(882,1295),(895,1320),(855,1328),(820,1265),(772,1205)]`. Curve the forearm shadow edges gently to follow bicep/forearm taper instead of straight vertical rulers. Delete the `6px` circular white dots at `(376,567)`, `(790,600)`, `(322,1201)`; replace `(322,1201)` with a `ref-d`-style sleek curved sheen patch (`18×46px` tilted `-22°` at `(342,1230)`, `#fffbf8`, `opacity 0.55`, `blur 3px`) and soft `16×24px` shoulder blushes/sheens (`#fffaf7`, `opacity 0.35`, `blur 6px`).

8. **Re-render the dark stockings with cylindrical form, soft sheer knee sheen, and deep fold occlusion**
   - **Where**: Left stocking `(345,1245)–(735,1605)`, right stocking `(690,1290)–(940,1585)`.
   - **What is wrong**: Flat purple-grey `#413a48` fill with two sharp-cornered flat `#56515b` sticker polygons pasted at `(452,1280)–(650,1392)` and `(740,1340)–(806,1383)` that ignore leg curvature.
   - **References do instead**: `ref-b` (dark jacket) and `ref-d` (dark shorts/sleeves) combine a soft directional value gradient across cylindrical surfaces, crisp near-black occlusion shadows (`#222325`–`#2a2b32`) in creases/overlaps, and sleek rim/ridge highlights aligned to the 3D cylinder axis.
   - **Exact fix**: Delete the two flat `#56515b` highlight stickers. Fill stockings with a cylindrical cross-leg gradient: dark outer edges `#272233` → base `#393342` → soft warm-tinted peak sheen `#544752` (slight skin warmth showing through denier) centered along the upper-left ridge of each thigh (`(495,1335)–(625,1475)` and `(770,1360)–(855,1475)`, `blur 18px`). Add one crisp elongated highlight sliver (`width 10–14px`, `#6c6270`, `opacity 0.55`, `blur 3px`) curving down each shin ridge, and a deep 2nd shadow `#1d1828` (`blur 2px`) along the inner knee crease `(690,1410)–(735,1580)` and lower ankle fold `(360,1425)–(585,1565)`. Add a subtle `2px` darker skin-pinch cast shadow (`#a68582`, `blur 1.5px`) immediately above each stocking top cuff.

9. **Upgrade the blue swimsuit & skirt ruffles from 2 flat steps to 3-step cel + subtle curvature gradient**
   - **Where**: Bodysuit cups/torso `(435,680)–(800,1190)` and skirt ruffles `(215,1035)–(805,1235)`.
   - **What is wrong**: Zero gradient on lit blue (`#4a5e8e`), a single `1px`-hard shadow step (`#2d3c6a`), and no deep occlusion inside ruffle troughs—making the fabric look like flat paper.
   - **References do instead**: `ref-c` (blue swimsuit ruffles) uses a gentle lit-side value gradient (`#6b7ca1` → `#576e98`), a crisp mid-shadow (`#3b4a69`, `blur 2–3px`), and a deep indigo-navy 3rd occlusion step (`#27354e`) tucked inside every ruffle fold and under the bust.
   - **Exact fix**: Add a soft top-left-to-bottom-right linear gradient across lit blue cloth (`#5c74a8` → `#445887`). Keep primary shadow `#2e3e6b` (`blur 1.5px`), and add a 3rd deep occlusion pass `#1d284b` (`opacity 0.90`, `blur 1px`) inside every skirt ruffle underside fold `(225,1080)–(465,1170)` & `(675,1115)–(785,1180)`, along the lower cup curves `(450,835)–(585,880)` & `(655,840)–(780,885)`, and along the torso V-edges behind the forearms `(525,950)–(635,1180)`. Add a faint cool bounce light (`#475d8c`, `opacity 0.45`, `blur 4px`) along the bottom-most rim of each shadowed cup so the spheres turn cleanly.

10. **Give the gold bow, gold V-trim, white lace trim, and teal ribbons proper material contrast**
    - **Where**: Gold bow `(586,830)–(654,872)`, gold V-trim `(540,865)–(695,1035)`, white cup lace & collar `(450,670)–(745,860)` & `(530,490)–(660,570)`, teal hair ribbons `(390,115)–(475,330)` & `(765,135)–(860,390)`.
    - **What is wrong**: Gold bow/trim is flat dull mustard `#c29c68` with no specular highlight or dark metallic bounce; white lace/collar has flat cool grey shadow with no warm ambient bounce; teal ribbons have weak value separation between back and front leaves.
    - **References do instead**: `ref-a` (gold cords/bell), `ref-c` (gold brooch & white wrist ruffles), and `ref-d` (gold fasteners) give metal sharp high-contrast dark brown-gold shadows (`#6e5028`) next to bright cream-gold specular wedges (`#fff2bd`), and give white fabric a luminous warm-grey/lavender shadow (`#cfd0de` with `#a8abc2` crease occlusion).
    - **Exact fix**: For gold bow & V-trim: base `#cfa660`, sharp shadow `#7c592f` (`blur 0.8px`), crisp metallic highlight slashes `#fff2c4` (`width 3–5px`, `opacity 0.95`, `blur 0.5px` at `(598,846)`, `(636,850)`, and left edge of V-trim `(558,895)–(590,995)`). For white lace/collar: lit `#faf9fc`, primary shadow `#ccd0df`, deep fold occlusion `#a4aac2` inside collar under-chin `(565,525)–(635,555)`. For teal ribbons: push back/under leaves down to `#2a6778` (vs `#4fa5b8` front lit) and add a crisp `#9be0ea` specular edge (`width 3px`, `opacity 0.70`) along upper-left leaf ridges.

11. **Remove the outer silhouette halo, floor smudge, blurry background petals/stars, and thigh grain**
    - **Where**: Outer silhouette margin (`1–12px` outside figure), floor oval `(448,1567)–(752,1604)`, floaty background cyan petals/yellow stars `(73,235)–(288,434)` & `(951,149)–(1152,636)`, and global noise pass (especially thighs `std 11.4`).
    - **What is wrong**: The `#f5f5f7` outer halo and muddy `#e0e0e8` floor oval dirty the page; blurry airbrushed cyan petals look cheap and break the crisp cel language; heavy grain creates noisy speckle on skin shadows.
    - **References do instead**: `ref-a`, `ref-b`, `ref-c`, and `ref-d` all sit directly on pure `#ffffff` with `0px` silhouette halo, zero floor oval, clean digital fills (`ref-b` noise `std 0.49`, `ref-c` `std 0.62`), and any floating graphics (`ref-c` butterflies, `ref-a` box marks) have crisp, deliberate edges/outlines.
    - **Exact fix**: Set silhouette outer halo opacity to `0` (pure `#ffffff` right up to the `1–2px` AA line edge). Remove the floor shadow oval `(448,1567)–(752,1604)` and all blurry cyan petals/stars (or, if client insists on decorative motifs, redraw them with crisp `1.5px` `#56b8d4` outlines and `0px` blur matching `ref-c`). Reduce global grain amplitude to `0` (or at most `std <= 0.8` on `0–255` scale).

12. **Clean up forehead cast shadow and align it cleanly to the bangs**
    - **Where**: Forehead `(495,280)–(755,360)`.
    - **What is wrong**: The cast shadow under the bangs (`#f2dcd5` / `#d8c5c8`) has an awkward vertical notch/cutout around `(565,320)–(615,345)` that doesn't match the bang tips above it, and mixes cool lavender with rosy skin shadow inconsistently.
    - **References do instead**: `ref-a`, `ref-b`, and `ref-c` offset the bang silhouette cleanly downward-right (`6–14px`) to form a crisp, unified cast shadow (`blur 1.5–2px`) with uniform color and soft taper near the eyes.
    - **Exact fix**: Generate the forehead cast shadow by translating the exact bangs mask by `(+7px, +11px)` (in `line.png` coords), clipping to the face skin mask, filling with `#c8a8a3` (`opacity 0.72`, `blur 1.5px`), and adding a `3px` warm `#e2b6aa` inner terminator edge (`opacity 0.50`).

---

### 3. Bugs (Leaks, Stray Shapes, Unpainted Bits — in `line.png` 1200×1655 coords)

1. **Teal ribbon color leak onto right hair strand**: `(789,344)–(802,354)` — teal ribbon paint `#579cb6` crosses the lineart boundary leftward into the lavender right side-lock directly beneath the right ribbon knot.
2. **Floating disconnected purple-grey sliver at right temple**: `(722,295)–(748,342)` — an orphaned jagged lavender-grey shape (`#b8acc4`) sits floating inside the right forehead/temple skin region next to the right inner hair lock.
3. **Unpainted near-white pocket inside left skirt ruffle**: `(217,1171)–(224,1187)` (center `(221,1180)`, `#ecebef`) — an enclosed pocket inside the far-left blue skirt ruffle fold was missed by the blue cloth fill.
4. **Exterior hair color leak on left twintail**: `(152,1031)–(176,1088)` (center `(166,1065)`, `#adaeb2` / `#adb0c2`) — lavender hair fill leaked *outside* the left twintail outer lineart into the white background (`201px²` in `line.png` space).
5. **Exterior hair color leak on bottom-right twintail curl**: `(1038,1436)–(1058,1455)` (center `(1048,1445)`, `#8eb2c5`) — blue-tip hair fill leaked *outside* the bottom-right curl lineart into the white background (`289px²` in `line.png` space).
6. **Stray / misaligned blue cloth tip on inner right thigh**: `(645,1190)–(674,1244)` — an isolated dark-blue `#324475` triangle pokes down onto the right inner thigh below the skirt ruffle with an awkward white/skin sliver pinching at the bodysuit V-tip `(580,1190)–(600,1215)` where the forearms meet.
7. **Inconsistent dark navy/charcoal fills behind left vs right ribbons/ears**: `(450,255)–(469,320)` (`#44435f`) behind the left elf ear and `(778,340)–(806,408)` (`#3a3d53`) behind the right ribbon look like stray dark mis-fills (the right side mixes teal bleed + dark charcoal blotches instead of consistent under-hair shadow).
8. **White unpainted sliver / harsh line break at upper-right white breast ruffle tip**: `(705,675)–(732,715)` — the scalloped white lace corner pinches awkwardly under the black halter strap with a jagged corner and missing shadow transition.
9. **Stray micro-white highlight dots ("pimples")**: `(373,562)–(379,571)` on left shoulder, `(783,590)–(799,608)` on right shoulder, `(319,1197)–(325,1206)` on left hip — pure `#ffffff` circular dots that read as render artifacts/specks rather than intentional speculars.
10. **Inverted / stray chin shadow polygon**: `(521,450)–(619,514)` — stray shadow polygon placed on the lit front-left chin instead of the neck.
11. **Unpainted interior hair-crossing gaps on left twintail**: `(227,457)–(259,503)`, `(164,468)–(258,608)`, `(216,655)–(260,731)`, `(231,748)–(255,779)`, `(258,715)–(275,742)` — while larger loops are genuine see-through background gaps, tiny pinched slivers like `(276,707)–(279,714)` and `(899,768)–(908,782)` (right twintail) and `(69,1469)–(101,1477)` (bottom-left tip) are left `#fcfcfc` white inside tight strand overlaps where a subtle under-hair shadow fill (`#7c7a96`) reads far cleaner.
12. **Right foot behind right stocking missing cast shadow / muddy contour**: `(915,1335)–(965,1395)` — skin peeks behind the right stocking with no cast shadow from the stocking onto the foot, making it look detached/pasted on.

---

### 4. Measured Reference Facts (Script-Sampled)

Head height (top of cranium outline to chin outline):
- `ref-a` (`2000×1500`): `516px`
- `ref-b` (`2000×1500`): `531px`
- `ref-c` (`2000×1500`): `491px`
- `ref-d` (`1258×1482`): `411px`
- `line.png` (`1200×1655`): `433px` (`r1-full.png` at `1.5×`: `652px`)

#### Colour Palette (Measured Medians / Representative Samples)

| Role | `ref-a` | `ref-b` | `ref-c` | `ref-d` | Current `r1-full` |
|---|---|---|---|---|---|
| **Skin light** | `#fdf5ec` / `#fcf2ea` | `#f0e5de` / `#eee4de` | `#fcf3ef` | `#fcf0e8` / `#faece2` | `#fcf1ec` |
| **Skin shadow near edge** | `#cbb2ad` / `#c9b1a9` | `#bba7a1` | `#c1aaaa` / `#bea7a4` | `#bda199` / `#bfa49c` | `#dbb5aa` *(too light)* |
| **Skin shadow deep** | `#b99b96` | `#b7a39d` / `#a8948f` | `#b89d97` / `#a69688` | `#b79990` / `#ba978e` | `#cba79f` *(too light)* |
| **SSS band between** | `#e5bcb8`–`#e0b8b3` *(sat 0.20, shadow side)* | Minimal (`#d8d2cf`–`#bfa7a0`) | `#e6cac5`–`#d4b6b2` *(sat 0.16–0.19)* | `#ecc5b9`–`#e0bcb1` *(sat 0.21–0.22, straddling edge)* | `#eeb8a5` *(sat 0.31, lit side)* |
| **Hair light (crown base)** | `#d8cdb8` | `#c0c7b7` | `#acd0ab` | `#577364` | `#bdb2c8` |
| **Hair ring / highlight** | `#e2dbc2` | `#dce0d6` | `#d3e8d7`–`#d9ebde` | `#678a78`–`#7f9b8f` | `#d7cedf` *(lip `#dfd5dd`)* |
| **Hair shadow (1st / back)** | `#c0a8a0` / `#9a927e` (`#7d7069` deep) | `#9ea595` / `#787b7a` (`#56585c` deep) | `#8fa88f` / `#7a8db0` *(cool tips/back)* | `#3d4d46` / `#4b6259` (`#323d38` deep) | `#9a90ab` / `#bbb1c7` *(no back drop)* |
| **Dark cloth light** | `#5b4433`–`#695c55` *(brown)* | `#4e4f56`–`#5b5c65` *(jacket)* | — | `#454645`–`#52514f` *(shorts)* | `#443d49` *(sticker `#56515b`)* |
| **Dark cloth shadow** | `#31241f`–`#382e28` | `#2a2b32`–`#2f3037` | — | `#222325`–`#2c2d2f` | `#262132` |
| **Blue cloth (light / shd / deep)** | `#6e8a9f` / `#536581` / `#2e3644` | — | `#637ba8` / `#3b4a69` / `#27354e` | `#5d7ca4` / `#364963` / `#2c3a50` | `#4a5e8e` / `#2d3c6a` *(no deep step)* |

#### Line Colours & Line Widths (FWHM as Fraction of Head Height)

| Image | Outer Skin Line | Outer Hair / Cloth Line | Inner Line | Outer Width (px & % head H) | Inner Width (px & % head H) |
|---|---|---|---|---|---|
| **`ref-a`** (`H=516`) | `#766a5e` / `#584950` | `#74706a` / `#29211a` | `#806d66` / `#423730` | `2–3px` (**`0.39%–0.58%`**) | `2–3px` (**`0.39%–0.58%`**) |
| **`ref-b`** (`H=531`) | `#5f5b63` / `#1a1b20` | `#4c4f4c` / `#5e5e5e` | `#4c4747` / `#5f5b63` | `3–4px` (**`0.56%–0.75%`**) | `3–4px` (**`0.56%–0.75%`**) |
| **`ref-c`** (`H=491`) | `#9c9799` / `#a7a4a5` | `#4e614f` / `#283044` | `#907776` / `#3a4340` | `2–4px` (**`0.41%–0.81%`**) | `2px` (**`0.41%`**) |
| **`ref-d`** (`H=411`) | `#363331` / `#121111` | `#0f0f0f` / `#0e1311` | `#4f675a` / `#060607` | `2–3px` (**`0.49%–0.73%`**) | `1–2px` (**`0.24%–0.49%`**) |
| **`r1-full`** (`H=652`) | `#1e1921` / `#1d171f` | `#1e1921` | `#673f40` / `#50484f` / `#353042` | `5–6px` (**`0.77%–0.92%`**) | `3–5px` (**`0.46%–0.77%`**) |

#### Shadow Edge Blur Width (10%–90% Luminance Transition, px and % Head Height)

- **Skin cast shadow** (`ref-a` belly `4px` / `0.78% H`; `ref-c` waist/arm `2–6px` / `0.41–1.2% H`; `ref-d` belly `7px` / `1.7% H` including SSS ramp) → **target `0.5%–1.5%` of head height** (`2–6px` in `line.png`). *Form* skin turns soften to `13–20px` (`2.5–3.8% H`, e.g. `ref-a` upper arm `20px`, `ref-d` thigh underside `17px`).
- **Hair shadow**: crisp `2–6px` (`0.4%–1.2% H`, e.g. `ref-a` `2px`, `ref-c` `6px`, `ref-d` `6–12px`).
- **Hair highlight ring/shards**: soft feathered `4–17px` (`0.8%–4.1% H`, e.g. `ref-b` `4px`, `ref-c` `12px`, `ref-a` `15px`, `ref-d` `17px`) — whereas `r1-full` is razor-hard `2px` (`0.3% H`).
- **Cloth / dark cloth**: crisp folds `1–7px` (`0.2%–1.3% H`, e.g. `ref-d` blue `1px` / shorts `3px`, `ref-c` blue `3px`, `ref-a` blue `6px`, `ref-b` jacket `7px`), paired with wider form-roll gradients `24–47px` (`ref-b` jacket highlights) — whereas `r1-full` blue cloth is `1px` hard everywhere with zero form gradient.

#### Percentage of Shadow on Skin

- **`ref-a`**: `57.7%` overall (`39.1%` face including blush/bang shadow, `72.1%` body/belly)
- **`ref-b`**: `21.4%` face + neck
- **`ref-c`**: `31.2%` overall (`42.3%` face incl. blush/glasses shadow, `29.4%` body/arms)
- **`ref-d`**: `14.1%` overall (`20.6%` face, `11.9%` body + thighs)
- **Target range for this pose**: **`18%–32%`** on body/limbs and **`12%–22%`** on face (clean open face with cast shadow only under bangs and neck). Current `r1-full` is at `29.5%` overall (`22.3%` face, `30.4%` body) — the *area* percentage is already in range, so the problem is **wrong placement, wrong contrast, and wrong shape**, not lack of coverage.

---

### 5. Disagreements with the Current Rules

1. **"Salmon band `#f0b7a2` on the lit side of the shadow edge"** — Wrong side and wrong saturation. Measured profiles in `ref-a` and `ref-d` prove the warm coral-peach SSS peak (`sat 0.19–0.22`, `#e0b8b3`–`#ecc5b9`) lives *across/inside the shadow side* of the terminator (`lum 195–208`), never as a `sat 0.31` orange highlighter stroke painted onto the lit skin. Putting it on the lit side next to an overly pale `#dbb5aa` shadow (`lum 191`) creates a glowing sunburn outline.
2. **"One shadow tone on skin (`#dbb5aa` → `#c3a09c`)"** — Too light and missing occlusion. All four references drop primary skin shadow to `#bda39c`–`#c2a8a1` (`lum 166–176`, not `191`) and add a distinct 2nd ambient-occlusion step (`#a38385`–`#b79990`) inside tight crevices (neck under chin, cleavage, under ruffles). One pale tone makes the body read flat.
3. **"Hair nearly flat with slim separations, a solid scalloped highlight ring with a warm lip"** — Directly contradicts every reference. `ref-a`, `ref-b`, `ref-c`, and `ref-d` all depend on (a) a large `15–30%` luminance drop for back hair and hanging twintails behind the body, (b) broad cylindrical form shadows across hanging hair masses, (c) broken, strand-aligned, vertically feathered highlight ribbons (never a continuous scalloped headband with a warm lip), and (d) subtle warm skin-bleed on bang tips over the forehead.
4. **"Cloth in two hard steps"** — Too primitive for this splash-art target. `ref-a`, `ref-c`, and `ref-d` combine a soft form gradient across lit cloth planes + crisp mid-shadow + a 3rd deeper occlusion shadow in tight folds and overlaps. Two flat hard steps look like budget TV animation, not game splash art.
5. **"Line near black outside and tinted inside"** — Wrong for pale skin and pastel hair. Three of four references (`ref-a`, `ref-b`, `ref-c`) use warm dark brown or muted grey-brown (`#4c4f4c`–`#9c9799`) on outer skin and light hair contours; only `ref-d` uses near-black outer lines, and it pairs them with dark tactical gear and thinner stroke weights (`0.49–0.73%` of head height vs `r1`'s `0.77–0.92%`). Outer line color should be **material-tinted** (`#4f3536` on skin, `#3e384f` on lilac hair, `#202742` on navy cloth), not uniform near-black.
6. **"Grain; white page with a faint halo"** — Actively hurts the match. None of the four references has a grey outer silhouette halo or floor oval, and `ref-b`/`ref-c` are nearly noise-free (`std 0.49–0.62` vs `r1`'s `std 11.4` on thighs). Drop the halo, drop the floor smudge, drop the blurry background petals, and cut the grain to near-zero.
