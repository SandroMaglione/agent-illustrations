# Concierge, Neon judging the Opus image

Written by Gemini 4 Neon, unedited apart from removed machine paths. Not every claim held up when measured: see `../history.md`.

### A. Scores (0–10)

| Criterion | opus.png | neon.png | Located Evidence (`line.png` coords) |
|---|---|---|---|
| **Outline** | **7.5** | **6.8** | Both tint skin (`(489,277)` `#654b49`, L 88.1) and hair lines (`(548,60)` `#635d5c`, L 102) well while sharing near-black torso ink (`(776,639)` `#2a1823` L 28.2 / `#141727` L 20.9), but `neon.png` erases lower-lid ink at `(529,164)` and `(460,204)`. |
| **Shadow shapes** | **8.0** | **7.3** | `opus.png` builds cleaner cel cloth folds (`(758,580)`) and key cast shadows (`(740,1320)`), whereas `neon.png` has better face shading (~24% vs ~15%) including bang cast shadow (`(465,115)` `#bf9f9a` vs `#f6e3dc`) but busier sleeve shapes (`(742,580)`). |
| **Skin & subsurface** | **7.8** | **7.9** | Both hit `#fcf1ec` lit skin (`(530,220)`) and place warm SSS inside neck shade (`opus` `(585,267)` `#e8b5a8`; `neon` `(585,261)` `#dfafa3`), with `neon.png` showing more form modelling on jaw (`(540,275)` `#e7cbc3`) despite harsh wrist shading (`(235,600)` `#b89792`). |
| **Hair** | **8.3** | **7.1** | `opus.png` nails a unified scalloped crown ring (`(575,56)` `#f3e8de`, +23.4 L over `(585,42)` `#d9cec5`) with warm lower lip (`(575,86)` `#d6c0b0`), whereas `neon.png` fractures the ring and plunges the nape too abruptly (`(650,255)` `#4b485f`, L 80.9) despite better bang-tip darkening (`(385,250)` L 133.1 vs `opus` L 194.0). |
| **Eyes & face** | **8.6** | **6.6** | `opus.png` delivers crisp emerald crescents (`(528,166)` `#ccdfc5`), `#fffcf7` nose mark (`(470,226)`), and filled brows (`(486,150)` `#af9a96`), while `neon.png` matches the nose mark (`(465,220)`) but bleeds iris green past the lower lid (`(528,168)` `#c6eed1`) and leaves the inner right brow unfilled (`(486,150)` `#fcf1ec`). |
| **Cloth & materials** | **8.8** | **6.5** | `opus.png` hits 0.67/0.53 OKLCH coat ratios (`(718,580)` `0.504` to `(758,580)` `0.338` / `(766,580)` `0.267`), tapered trouser sheen (`(436,1250)` `#8a8794`), and three-step bell brass (`(138,296)` to `(205,315)`), while `neon.png` has broad un-tapered trouser light (`(440,1242)`), a solid-gold vest panel (`(405,710)` `#caa462`), and trim spill (`(338,977)`). |
| **Palette & values** | **8.7** | **7.2** | `opus.png` groups ash hair, pale skin, burgundy coat, slate vest, and warm brass cleanly; `neon.png`'s navy-crimson-gold scheme reads well at distance, but stark white lapels (`(366,496)`), gold vest block (`(405,710)`), and white bottom gap (`(275,1480)`) break value hierarchy. |
| **Finish** | **8.5** | **6.9** | Both keep skin clean (`(515,215)` std 0.054), cloth lightly grained (`(445,1310)` std 0.635 / 0.489), and pure white margins, but `neon.png`'s fill leaks (`(338,977)`, `(486,150)`, `(528,168)`) undermine polish. |

**Averages:** `opus.png` **8.28** | `neon.png` **7.04**

---

### B. Faithfulness to `line.png`

- **`opus.png`:** Highly faithful (only 38 dark ink pixels lightened >155, all tiny metal sparkles). Colours the narrow vertical neck ribbon white (`(482,587)` `#e4e2e9`), blending it into the shirt; fills the ambiguous bottom-left coat/leg triangle dark (`(275,1480)` `#2f1f2f`, structurally sound as back coat-tail); adds painted lapel/cuff piping (`(375,510)`) over single-line edges.
- **`neon.png`:** Eight clear breaks: (1) iris green covers lower-lid ink at `(529,164)` (25 px) and `(460,204)` (36 px); (2) inner right brow left bare skin at `(486,150)` (`#fcf1ec`); (3) white trim spills inward across coat cloth at `(338,977)` (`#e3dee0`); (4) invented jagged white lapel trim without line boundaries at `(366,496)` and `(656,463)`; (5) vest left panel flooded solid gold at `(405,710)` (`#caa462`); (6) forearm inside cuff rendered as bare skin at `(225,580)` (`#f9e2da`) instead of shirt sleeve; (7) skin sliver beside ear misfilled dark grey at `(603,204)` (`#6e6875`); (8) bottom-left wedge left pure white at `(275,1480)`.

---

### C. Extras

- **`opus.png`:** **Help:** window-pane bell reflection, diamond vest brocade, subtle gold hem hatch/art-deco coat-tail lines, bell ring arcs, and teal cuff lining (`(185,620)` `#314d58`) echoing the eyes. **Hurt:** four glowing cyan room-key tags feel heavier and busier than `ref-a`/`ref-c` graphics; micro-text (`HOTEL LACUNA`, `ROOM 307`) disappears at game scale.
- **`neon.png`:** **Help:** crimson neck-ribbon accent (`(482,587)` `#48142b`), subtle vest pinstripes, small jewel clasp on neck bell, and restrained bell-ring graphics/cyan diamond that match `ref-a`/`ref-c` restraint. **Hurt:** unanchored white lapel/cuff stripes and gold vest-strip clutter the silhouette.

---

### D. `opus.png`: 5 Best and 5 Worst

**5 Best:**
1. Cohesive, ref-accurate scalloped hair ring (`(575,56)`) with warm lower lip (`(575,86)`).
2. Best-in-class cloth rendering: accurate OKLCH shade steps, crisp trouser sheen (`(436,1250)`), and tailored vest brocade.
3. Clean, expressive eyes and brows with zero ink bleed.
4. Tactile brass rendering on desk bell (window reflection) and key (crisp cast shadow).
5. Disciplined burgundy/slate/gold/teal palette that unifies the whole figure.

**5 Worst:**
1. **RULE:** 73% of torso ink drops below L 35 (`(776,639)` L 28.2) because the frozen engine fails to scale line tint to thick outlines.
2. **SHAPE:** Face is under-shaded (~15%), missing a clear bang cast shadow on the forehead (`(465,115)` `#f6e3dc`) and fuller jaw shadow (`(540,275)`).
3. **SHAPE:** Hanging bangs (`(385,250)` L 194) and mid-back hair (`(675,205)` L 184) lack the 20–35 L depth drop from the crown.
4. **LINE ART:** Uniform heavy line weight on sleeves and hems lacks the tapered, broken delicacy of `ref-a`–`ref-c`.
5. **SHAPE:** Four glowing floating room tags crowd the white margin more heavily than the references.

---

### E. Cross-Pollination

- **`opus.png` should take from `neon.png`:** (1) Forehead bang cast shadow and broader jaw form shadow; (2) stronger hanging-bang/back-hair value darkening (without `neon`'s abrupt nape cliff); (3) crimson accent on the neck ribbon (`(482,587)`) and sparser floating graphics.
- **`neon.png` should take from `opus.png`:** (1) Unified scalloped crown hair ring with lower warm lip; (2) clean region discipline and architectural cloth shading (tapered trouser sheen, symmetric vest, white shirt cuff); (3) un-bleeding eye fills and cohesive burgundy/slate value grouping.

---

### F. Verdict

- **Closer to references:** `opus.png` (~84% match vs `neon.png` ~71% — roughly **13 percentage points closer**).
- **Better execution:** `opus.png`, decisively—cleaner masks, far better cloth/metal/eye craft, and zero fill leaks.
- **Better design choices:** `opus.png` overall (superior colour harmony, vest pattern, teal cuff lining, bell reflection), though `neon.png` chose better floating-graphic restraint and neck-tie separation.
- **One honest line for the client:** Ship `opus.png` after adding a forehead bang shadow, darkening the hanging bangs/back hair by ~15–20 L, and trimming two of the floating room tags—it is already close to studio-ready, whereas `neon.png` needs a cleanup pass on fill leaks, eyes, and cloth shapes before sign-off.
