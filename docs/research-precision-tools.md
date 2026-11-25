# Research: precision tools for placing shadow, light and highlight shapes

Tags: **[S]** from a source opened this session (list in F; I read search summaries of those pages, not always the full text). **[K]** standard knowledge I did not re-open this session, so check before relying on a detail. **[M]** measured by `archive/measurements/placement.mjs` on tape, twin and bell. **[I]** my inference.
Units: line-art px. `H` = head height (390 to 430). `w̄` = median stroke width of the drawing (about 0.7 to 1% of H, so 3 to 4 px). Nothing here was run or rendered; every default is a starting value to be tuned on tape.

## A. Principles

1. **Refer, do not measure.** A shape is stated against named strokes, facets and parts, never against grid coordinates. Drawing software works the same way: the bucket reads a reference layer, the vector eraser stops at an intersection, Live Paint paints faces of a planar map [S1, S3, S14]. Fixes: 1,340 to 1,480 typed points, 30 to 35% of edge length 2 to 6 px off a line, shapes with under half their area on target [M].
2. **A shadow boundary is a line; a shadow is a fill.** Cel animation never paints a shadow freehand. The animator draws a separation line, the painter buckets one side, and the line then takes the paint colour and vanishes [S5, K]. We already own the bucket. A shadow becomes a few virtual walls plus one click, and its ends sit on ink by construction. Fixes: 121 to 153 lit gaps [M].
3. **Every edge run declares its kind: ON a line, FREE, or TIP.** ON runs lie under the ink at the centreline. FREE runs keep a clear distance from every line (at least 6 px). TIP is where a free run meets a line at a sharp angle. The 2 to 6 px band is illegal. Fixes: the ambiguous 30 to 35% [M] and gives pass 5 the edge kind it needs for softness.
4. **Children live inside parents.** Deep shade is derived from the shadow it deepens, the warm band from the shadow edge, a highlight from the lit set. This is alpha lock and clipping-to-the-layer-below, one level finer than clipping to a part [S6, S15]. Fixes: deep shade placed separately; highlights that ignore strands.
5. **Rules propose, the agent disposes by ID.** The light side of a fold, the under side of an overlap and the terminator of a tube are computed for every candidate and printed as a numbered list. The agent accepts, flips or drops entries. Fixes: 37 to 43% fold coverage and 50 to 81% light-side consistency with "no system behind it" [M].
6. **Volume enters as coarse declared primitives (tube, ball, between two lines), and only to position one hard edge.** Never as a per-pixel normal field shaded smoothly. That is what produced the latex look: tone bands parallel to the contour [M, earlier study]. Fixes: flat 2D light, without the plastic risk.
7. **Every tool returns a number, and every view carries IDs.** A tool reports its own residual; a lint runs after every pass; the agent looks at crops with numbered strokes, facets and faults instead of a 25 px grid. Fixes: "no check sees a misplaced shape".
8. **Shading is a model sheet, not a drawing.** Statements keyed to part kinds and landmarks ("cast of fringe on face", "tube terminator on sleeve") carry to the next character; coordinates cannot. Studios do this with colour-model sheets that fix normal, shadow and highlight colours and where they sit [S5, S12, K]. Fixes: nothing carries over.

## B. Toolbox

Card fields: **Software** (what it is and who uses it), **States / returns**, **Algorithm**, **Measure**, **Fails / style risk**, **Effort / needs**.

### Foundation

**1. Stroke graph**
- **Software:** vector line-art layers (CSP, Harmony, OpenToonz, Grease Pencil): every line is an object with a centreline and a width profile, so tools can stop at intersections, correct width and snap [S3, S10, S11]. Papers: topology-driven vectorisation [S22].
- **States / returns:** nothing. Returns strokes `s1…sn` (polyline, width per sample, length, two end nodes), junctions `j1…` with degree and type (T, Y, X, L), blobs `b1…` (filled black), and which part each side of each stroke touches. Frozen to JSON once per drawing so IDs never change.
- **Algorithm:** (1) ink mask at `ink > 0.42`, fill pinholes under 4 px². (2) `Din` = exact distance inside ink (reuse `paperDistance` on the inverse). (3) Pixels with `Din > 2.5·w̄` are **blobs**: remove them from the mask before thinning and trace their outline as strokes instead. (4) Thin with Zhang-Suen [K] at render scale. (5) Count 8-neighbours with crossing number: 1 = end, 2 = path, 3 or more = junction; merge junction pixels closer than the local width into one node. (6) Walk paths node to node; width at a sample = `2·Din`. (7) Prune spurs shorter than 1.5 × width at their junction (thinning whiskers). (8) Good continuation: at a junction, pair the two branches whose tangents (taken 1 to 3 widths away from the node) are within 25° of opposite and join them into one stroke; the leftover branch is the T stem. (9) Simplify each polyline with Douglas-Peucker at 0.5 px [K].
- **Measure:** redraw every stroke with its width and compare with the ink: IoU at least 0.95, unexplained ink under 2%. Zero junctions of degree 5 or more. Same graph at k=2 and k=3 (stroke count within 2%).
- **Fails / risk:** taper ends lose their last 1 to 2 widths (thinning shortens them): store the true tip as the farthest ink pixel along the end tangent. Hatching and eyelashes become dozens of tiny strokes: tag any stroke shorter than 4·w̄ as "texture" and leave it out of rules. Filled wedges and hair tips are blobs, not strokes; a blob's outline is still addressable. No style risk: it draws nothing.
- **Effort:** M. Needs nothing new.

**2. Facet map and adjacency**
- **Software:** Live Paint faces, Shape Builder regions, the planar map behind every smart bucket [S14, S23]. Colourists use a random-colour multifill to see every closed cell before choosing colours [S16].
- **States / returns:** nothing. Returns facets `f1…` = every closed patch of paper before pools are merged into parts: part, area, deepest point (label anchor, already computed as `deep`), bounding strokes with side, and neighbours across each stroke (a region adjacency graph).
- **Algorithm:** the pools in `segment.ts` already are facets; today `spreadNames` merges them and discards the IDs. Keep them. (1) Connected components of paper that is neither ink nor wall. (2) Grow under the ink with `underInk` so two facets meet on the centreline. (3) For each stroke sample, read the facet 1 width to its left and right: that fills `stroke.left`, `stroke.right` and the adjacency list. (4) A facet whose deepest distance is under 1.2 px is a crumb: merge it into the neighbour of the same part with the longest shared border.
- **Measure:** every figure pixel has a facet. Share of facet area whose pixels disagree with the facet's part under 2%. Report facets per part: a part with one facet has no interior closure and must be shaded with tools 8 to 10.
- **Fails / risk:** fold lines that trail off do not close a facet (that is correct: see tool 8). Hair drawn with open strands gives a few huge facets. No style risk.
- **Effort:** S. Needs the bucket (exists).

**3. Gap candidates**
- **Software:** Close gap (CSP), gap-close hint (Krita), Paint Stops At small/medium/large (Illustrator), invisible close-gap strokes (Harmony), and Grease Pencil's two modes: Radius joins nearby stroke ends, Extend lengthens an end until it hits a stroke [S1, S7, S10, S11, S14].
- **States / returns:** the agent states `close g7 g12` or `close all under 8`. Returns a numbered list `g1…`: end-to-end and end-to-stroke gaps with length and angle, each drawn as a dashed line on the ID sheet.
- **Algorithm:** for every end node of a stroke longer than 3 widths: tangent from the 8 to 12 px before the last width. (a) Extend: march the ray up to `0.08·H` (about 32 px); a hit on ink is a candidate. (b) Radius: another end within `3·w̄` is a candidate. (c) Pair: two ends within `0.08·H` whose tangents both lie within 35° of the joining chord; join with a cubic Hermite curve using the two tangents (a cheap stand-in for an Euler spiral [K]). Cost = gap / width + angle / 30°. Accepted candidates are drawn as walls, exactly like today's `walls`.
- **Measure:** number of typed walls should fall to zero (tape has 3 [M]). Every accepted gap changes the facet count by exactly one; otherwise report it.
- **Fails / risk:** dense hair gives many false pairs, hence a list to accept and not an automatic close. Extending a fold line across a coat to make a facet is wrong: an open end means the fold fades, and the shadow should taper there (tool 8). Viewer-perceived connectivity is a learned judgement in the literature [S23]; we keep the judgement with the agent.
- **Effort:** S. Needs 1.

**4. Reference grammar**
- **Software:** CAD sketches constrain to named edges, not to numbers; TikZ names paths and asks for `intersections of A and B`; Asymptote has `intersectionpoint` and `relpoint(path, t)`; Grease Pencil points carry their own thickness [K]. SVG path data has no references at all, which is our present situation.
- **States / returns:** a small set of terms that resolve to geometry: `s41` stroke, `s41@0.3` point at 30% of its length, `s41.a` / `s41.b` ends, `s41.L` / `s41.R` side, `s41[0.2..0.9]` sub-run, `j12` junction, `f212` facet, `jackL` part, `x(s41,s57)` crossing, `tip(f212)` sharpest corner of a facet, `mid(s12,s30,0.35)` point between two strokes. Lengths as px, `×w` (stroke widths), `%H`, or `%gap` (share of the distance to the next stroke on that side).
- **Algorithm:** a resolver over the frozen graph. Unknown or ambiguous references are errors, never guesses. If the line art is ever re-exported, re-match each old stroke to the new one by midpoint and length and report any that moved more than 3 px (CAD calls the failure to do this the topological naming problem [K]).
- **Measure:** share of numbers in a drawing's data that are IDs or relative lengths, not absolute coordinates: target above 80% outside the face.
- **Fails / risk:** none for style. It is the hinge of the whole plan: if the agent cannot read IDs from tool 5's sheets, nothing above works. Test that first.
- **Effort:** S. Needs 1, 2.

**5. ID sheets, fault sheets and blink**
- **Software:** selection overlays, the green preview of "paint unfilled area", gap preview colour in Live Paint, and the colourist's habit of putting a garish layer under the flats to see holes [S2, S14, S16]. Painters flip the canvas and squint to judge shape and value [K].
- **States / returns:** `sheet strokes|facets|faults <part or box>`. Returns a crop at 3× with at most about 40 labels.
- **Algorithm:** facets tinted by ID with the number at the deepest point; strokes drawn in alternating colours with the number at the midpoint, pushed off along the normal, and a small arrow for direction so "left" and "right" are readable; junctions as dots. If a crop holds more than 40 labels, split it. Fault sheet: the red and blue of `placement-misses.png` with every fault numbered and listed (`fault 17: lit gap, 62 px², beside s203.R, shape #88`). Blink: before and after of the masks view as two frames plus a difference image (added = green, removed = magenta). Posterised and mirrored masks view for the silhouette of shadow masses.
- **Measure:** round trip: the agent is shown a sheet and asked which stroke bounds two given facets; it must be right 19 times out of 20 before the grammar is trusted.
- **Fails / risk:** label crowding in hair and hands; small facets get a leader line. An agent reading 3-digit labels on thin strokes will misread some: the resolver should echo each reference back as a highlighted crop on request.
- **Effort:** S. Needs 1, 2 and the lint (18).

### Placing shapes

**6. Facet fill and enclose**
- **Software:** the bucket with a reference layer, and Enclose-and-fill / Lasso fill: circle an area roughly and every closed cell inside is filled [S1, S2, S7].
- **States / returns:** `dark f212 f215` or `enclose <rough polygon> on jackL`. Returns a mask that is a union of whole facets, run under the ink.
- **Algorithm:** union of facet pixels. Enclose takes every facet with at least 90% of its area inside the rough polygon, so the polygon needs no accuracy.
- **Measure:** snap residual is zero by construction. Report facets taken at 50 to 90% so the agent can widen the lasso.
- **Fails / risk:** only shades what the artist closed. Filling whole facets everywhere gives a stained-glass look; in the references most shadows cut through a facet [I]. Expect this to cover the small closed things (under collars, between fingers, inside loops).
- **Effort:** S. Needs 2.

**7. Shadow line** (the cel separation line)
- **Software:** 影指定 in animation layout: the shadow boundary is drawn as a coloured line, closed against the ink, and bucket-filled; in digital ink-and-paint it is a colour-trace line that is later painted with the fill colour [S5, K]. Harmony's Stroke tool draws the same invisible boundary by hand [S11].
- **States / returns:** `line s41@0.2 -> s57@0.8 bulge 0.25; dark f212 toward s12`. Returns the sub-facet on the stated side.
- **Algorithm:** (1) resolve both ends to points on centrelines. (2) Curve between them: straight, or one quadratic with `bulge` as a share of the chord (sign = which way), or through extra reference points with `!` for corners as today. (3) Draw it as a wall into a copy of the facet, re-run components, take the piece that touches the `toward` reference. (4) The wall itself is never rendered; the fill runs under the ink at both ends.
- **Measure:** both ends within 0.5 px of a centreline (always true). The new piece must be 5 to 95% of the facet, otherwise the line missed. Tip angle at each end reported; under 12° over more than 20 px is a near-tangent and should be an ON run instead.
- **Fails / risk:** the free edge is still a designed curve, so quality depends on the agent's choice of ends and bulge; but two references and one number replace 6 to 10 typed points. Low style risk: it reproduces the studio method exactly.
- **Effort:** S. Needs 2, 4.

**8. Side band** (a shadow that hangs off one side of a stroke)
- **Software:** stroke along a path with pressure taper; width tool and offset path in Illustrator; Grease Pencil per-point thickness [K]. In cel shading it is the fold shadow: one long clean side on the line, one pointed side.
- **States / returns:** `band s41.R [0.1..1] taper 14 -> 0` or `wedge 0 -> 18 -> 0 peak 0.4` or `belly`. Width in px, `×w` or `%gap`. Returns the mask and its free edge.
- **Algorithm:** (1) feature transform: for every pixel within the largest width, the nearest stroke sample `q`, its parameter `t` and distance `d` (carry the sample index through the distance transform, or brute force in the stroke's bounding box). (2) Side = sign of `cross(tangent(q), p − q)`. (3) Inside when the side matches, `t` is in range and `d ≤ width(t) + half stroke width`. (4) Keep only pixels connected to the stroke inside the same facet, so the band cannot jump a neighbouring line. (5) Ease the width with a smoothstep so the point is long (the last 30% of the run). (6) On the inside of a bend cap the width at 0.8 × radius of curvature. (7) Absorb rule: where the free edge would pass within 6 px of another stroke for more than 10 px, extend the band to that stroke.
- **Measure:** ON run residual zero. Free edge at least 6 px from any other line or snapped to it. Width never above 45% of the gap to the next stroke unless stated.
- **Fails / risk:** a constant-width band beside every line is exactly the "mauve band beside every ink line" the earlier study blamed for latex [M]. Forbid constant profiles on cloth: a band must reach zero at one end at least. Fails at strokes that are textures (hatching) and at blobs.
- **Effort:** M. Needs 1, 2, 4.

**9. Between-lines edge**
- **Software:** Blend between two paths (Illustrator), in-betweening two curves, and CSP's contour line paint, which fills a gradient between two drawn lines by diffusion [S4]. Diffusion curves are the research form [S26].
- **States / returns:** `edge between s12 and s30 at 0.35 -> 0.6 in f88; dark toward s12`. Returns the mask on one side of a curve that runs between two strokes.
- **Algorithm:** (1) `dA`, `dB` = distances to the two strokes inside the facet. (2) `φ = dA / (dA + dB)`: 0 on A, 1 on B. For bent or concave facets replace it with a Laplace solve (φ fixed on A and B, no flow through other borders; 4-level pyramid with about 40 relaxation sweeps per level). (3) The level may change along the run: `v(t)` interpolates the stated values using A's parameter. (4) Shadow = `φ < v`. Ending at 0 or 1 makes a tip on a line.
- **Measure:** parallel share: the part of the free edge whose distance to the nearest line changes by less than 0.1 px per px over 40 px or more. Keep under 30% per part.
- **Fails / risk:** a constant level gives an edge parallel to the contour, the inflation look. Always state two different levels or end on a line. Low risk when used that way; it is the cleanest way to put a form shadow "a third of the way across this panel".
- **Effort:** S (distance form), M (solve). Needs 1, 2.

**10. Tube and ball coordinates**
- **Software:** how illustrators are taught to shade limbs, fingers, sleeves and strands: find the cylinder, put the terminator along its length. 3D toon shading gets it from the normal; stylised-shading papers then let the artist push that edge locally [S20].
- **States / returns:** `tube armR from j7 to s88; terminator 0.3 [0.1..0.9] ease 0.15` and `ball head at f3 radius auto; terminator 0.35`. Returns coordinates `s` (along, 0 to 1) and `t` (across, −1 to 1) for every pixel, and the mask.
- **Algorithm:** (1) `D` = distance inside the part (or facet set). (2) Axis = cheapest path between the two stated ends with cost `1 / (D + 1)²`: it runs along the ridge without the branches a skeleton would add. (3) Each pixel takes its nearest axis sample: `s` = arc length share, `t` = signed distance / local radius `R(s)`, with `R` smoothed over 10% of the length. (4) Dark side = sign of `cross(axis tangent, light)`. (5) Shadow = `t > v`, with `v` eased to 1 at both ends of the range so the shape is pointed. (6) Named bumps: `bulge +0.2 at 0.4 width 0.15`. (7) Ball: centre and radius from the largest inscribed circle of the named facets; `t` = signed distance along the light direction / radius; shadow = `t > v`, a crescent.
- **Measure:** axis inside the part everywhere. Shadow share inside the process bands (limbs 15 to 35%, face 8 to 24%). Free edge at least `0.15·R` from the outline, or run it to the outline. `R(s)` also supplies pass 5's "form edge softness by radius".
- **Fails / risk:** medium. The same stripe down every limb reads as a rendered sausage. Limit the range, break it at every fold stroke it crosses (the fold wins), vary `v` along the length. Elbows and knees fan; split the tube at the joint. Outlines widened by cuffs and folds make `R` jump.
- **Effort:** M. Needs 2, 4.

**11. Strand map and ring**
- **Software:** hair in anime colouring: shadow per lock on the side under its neighbour, and a highlight ring (天使の輪) that steps from lock to lock [S6, K]. Flow fields along lines are the research form (edge tangent flow [K]).
- **States / returns:** `crown at f3; ring hairF at 0.32 height 0.05 scallop 0.5 cut s120 s131`. Returns one coordinate set per strand facet and the ring mask.
- **Algorithm:** (1) each hair facet is a strand; run tool 10 on it from the end nearest the crown to its tip. (2) `u` = distance from the crown point / H gives one common height across strands. (3) Per strand the ring is `|u − u0 − δ| < h/2`, where `δ` alternates sign from strand to strand by a fixed share of `h` and `h` scales with strand width. (4) Scallop: move each ring edge by `c·R·(1 − t²)` so it bows toward the tip. (5) The ring breaks at every stroke on its own because strands are separate facets; `cut` names the partings. (6) Strand shadows are side bands (8) on the stroke where a strand goes under its neighbour (rule 12), and a child (13) at the tips.
- **Measure:** orphans: every shadow component in hair must touch a stroke or be a whole facet; target zero (today loose blobs exist [M]). Ring coverage: share of crossed strands that carry a ring segment at least 80%.
- **Fails / risk:** hair drawn with open strokes has few facets; then use bands only. Tips are blobs. The process asks for "one solid scalloped band cut only where the hair parts": too much per-strand stepping breaks that, so `δ` defaults small (0.2 × h).
- **Effort:** M to L. Needs 1, 2, 10.

**12. Side rule** (which side of a line is dark)
- **Software:** the animator's convention that light comes from one stated side, and Lumo's "over-under" marking of which region lies in front at each line [S17, K].
- **States / returns:** `folds jackL: all, drop s41 s77, flip s52, width 0.8`. Returns a table for every interior stroke: ID, length, proposed side, reason, confidence, proposed profile.
- **Algorithm:** for each stroke with the same part on both sides: (1) occlusion first: where the stroke is the bar of a T-junction, the stem's side is underneath, so shadow goes there; the outline of a part with higher `z` shades the lower part. (2) Otherwise light: left normal `n`; dark side is where `n·L < 0`, only when `|n·L| > 0.35`; else "undecided". (3) Profile: taper toward the open end; width `min(35% of gap, 0.5·√length·w̄)`. (4) Emit as tool 8 statements.
- **Measure:** light-side consistency at least 90%, with every exception a named line in the data (today 57 to 76% cloth, 50 to 81% hair [M]). Fold coverage: there is no reference figure yet; measure the references before fixing a target, and do not push toward 100%.
- **Fails / risk:** one line does not say whether it is a ridge or a valley. CrossShade and BendFields recover that only from cross-section curves drawn on purpose, which character art lacks [S21]. So the rule is a default, not a truth. Risk: shading every fold reads mechanical; expect the agent to drop a third to a half.
- **Effort:** S. Needs 1, 2, 8.

**13. Child shapes**
- **Software:** alpha lock, lock transparent pixels, clipping a layer to the one below, and contract selection by n px [S6, S15, S29].
- **States / returns:** `deep of #88 from line, depth 0.45` or `inset #88 by 4` or `warm of #88 width 3` or `hi in lit(hairF) …`. Returns a mask that is a subset of the parent.
- **Algorithm:** (1) parent mask `S`; its free edge = boundary pixels next to lit paper. (2) `dFree` = distance inside `S` to the free edge. (3) Deep shade = pixels with `dFree ≥ max(4, depth × local thickness)`, where local thickness is the largest `dFree` within a short walk along the ON side. It hugs the line and ends before the parent's tip. (4) Optional limit to a distance from a named stroke or junction. (5) Warm band = `0 < dFree ≤ width`. (6) Light shapes are intersected with the lit set shrunk by 2 px.
- **Measure:** child area outside parent = 0. Deep shade 20 to 45% of its parent's area [I]; report outliers.
- **Fails / risk:** thin parents give no child (correct). A uniform inset on a large blob makes a contour-parallel inner band, the same latex warning: anchor to the ON side, never inset from all sides.
- **Effort:** S. Needs the mask stack only.

**14. Cast offset, second version**
- **Software:** duplicate the caster, shift along the light, clip to the receiver. Research: inflate the drawn figure and cast from it [S18]; then stylise the matte with inflation, brightness, softness and abstraction [S19].
- **States / returns:** as today (`caster, receivers, distance`) plus `ramp d0 -> d1 along <ref>` and `simplify r`.
- **Algorithm:** (1) shift the caster mask by `d·L`, intersect with receivers, subtract the caster. (2) Ramp: let `d` vary along a named stroke so the shadow widens as the caster lifts off. (3) Abstraction: open by 2 px (drops whiskers), close by 3 px (fills notches), drop pieces under 40 px² that do not touch the caster's edge. (4) Mark the caster-side run ON and the far run FREE for pass 5.
- **Measure:** cast share of shadow area (today 7 to 8% [M]) and how many hand shapes it makes redundant (`redundantShapes` already measured).
- **Fails / risk:** a uniform offset is a drop shadow, which reads as a sticker; the ramp is the cure. Low risk.
- **Effort:** S.

### Repair and refinement

**15. Seal**
- **Software:** "paint unfilled area", expand selection by 1 to 2 px under the line art, "fill narrow areas", area scaling [S1, S2, S29].
- **States / returns:** `seal 5` per drawing or per part, with `keep` on shapes whose thin lit strip is deliberate. Returns the changed mask and the list of sealed gaps.
- **Algorithm:** (1) lit = part paper not in shadow. (2) Thin lit = lit minus its opening by 2.5 px. (3) Keep components that touch both a shadow and a line, whose mean width is under 5 px, and that the line art alone does not make thin (same test as the script: the region's own opening). (4) Add them to the touching shadow. (5) Mirror for dark crumbs: shadow pieces under 30 px² that vanish under a 1.5 px opening and are not the tip of a declared taper are removed.
- **Measure:** lit gaps from 121 to 153 down to under 10, all declared [M baseline]. Shadow area change under 3%; above that it is redesigning, not repairing.
- **Fails / risk:** it eats deliberate rim-light slivers (hence `keep`) and can blunt a point where a tip runs beside a line. It hides bad placement instead of fixing the statement, so use it as a safety net and report what it sealed.
- **Effort:** S. The measurement script already computes the sliver set.

**16. Snap** (for the hand polygons that remain)
- **Software:** snap to vector line, magnetic lasso; research: intelligent scissors, a cheapest path that follows an edge between two clicks [S24].
- **States / returns:** `snap #88` or all. Returns the polygon with runs relabelled ON / FREE / TIP and its residual before and after.
- **Algorithm:** sample the boundary every 2 px with distance `d` to the nearest centreline and the angle between tangents. (1) A run with `d ≤ 6` and angle under 30° is "meant ON": replace it by the cheapest path through the ink between the projections of its two ends, cost `1 / (ε + Din)`, which follows the centreline. (2) A run crossing a line at more than 30° stays. (3) A vertex within 8 px of an end node or junction moves to it. (4) A FREE run that still lies 2 to 6 px from a line is pushed out to 6 px.
- **Measure:** share of edge length in the 2 to 6 px band under 5% (today 30 to 35% [M]).
- **Fails / risk:** among dense parallel hair lines the nearest line is not always the intended one; report every snap longer than 40 px for a look. Active contours were considered for this and rejected (E).
- **Effort:** M. Needs 1.

**17. Edge designer and nudge**
- **Software:** simplify path, smooth, and the transforms used to adjust a shadow edge after the fact: mesh transform, liquify, puppet warp [K]. Curve fitting with corners is Schneider's algorithm and Potrace's corner test [S25, K].
- **States / returns:** `clean #88` and `nudge #88 free +3` or `bulge #88 at 0.4 by 5`. Returns the edge as few curves, in grammar form, so later edits are statements.
- **Algorithm:** (1) trace the mask boundary; split at every contact with a line. (2) Each FREE run: Douglas-Peucker at 1 px; corners where the turn exceeds 50° within 6 px; fit cubics between corners to 1.5 px. (3) More than two inflections per 100 px: refit at 3 px. (4) Where a free run meets a line at under 20°, lengthen it into a proper tip. (5) Nudge: offset the fitted run along its normal, ends pinned.
- **Measure:** inflections per free run at most 2. Each shadow has at least one tip under 35° and one run (ON, or FREE with one curvature sign) of at least 40% of its perimeter: the "one long clean side, one pointed side" rule as a number [I].
- **Fails / risk:** smoothing removes intended notches and zigzags (hair shadow teeth); corners must be kept. Low risk otherwise.
- **Effort:** M.

**18. Placement lint**
- **Software:** leak and unfilled-pixel checks, gap preview; none of the paint programs checks shading, so this is ours.
- **States / returns:** runs after every pass. Returns numbers and a fault list with IDs.
- **Algorithm and thresholds:** all on the masks view. (a) Lit gaps: under 10, all declared. (b) Edge kinds by length: 2 to 6 px band under 5%. (c) Dead shapes (under 6 px² visible): 0. (d) Orphans: shadow pieces touching no line and produced by no tube, ball or between-lines statement: 0. (e) Children outside parents: 0 px. (f) Light-side consistency at least 90%, exceptions named. (g) Parallel share under 30% per part. (h) Near-tangents: free runs within 12° of a line and 6 to 12 px from it for over 20 px: 0. (i) Shadow share per part inside the process bands. (j) Value grouping: three groups still separate after shading (exists in `pnpm check`). (k) Repeatability: masks at k=2 and k=3 agree, IoU at least 0.98. (l) Statement count and share of absolute coordinates.
- **Why these numbers:** (a) to (e) are zero-by-construction when tools 6 to 13 are used, so any non-zero value marks a hand shape; (f), (g), (i) are style guards and should be re-set from measured references.
- **Fails / risk:** a lint cannot see a well-attached shadow in the wrong place. It removes mechanical faults so that looking is spent on design.
- **Effort:** S (extends the existing script).

**19. Shade model sheet**
- **Software:** the colour model in ink-and-paint software and the studio model sheet that shows where each character's shadows and highlights fall [S12, K].
- **States / returns:** a file of statements keyed by part kind and landmark, e.g. `face: cast from fringe 11; ball terminator 0.35; nose mark`, `sleeve: tube 0.3; folds by rule; cuff casts 9`. Returns, for a new drawing, the statements that resolved and those that need IDs.
- **Algorithm:** statements use part names (already shared across characters) and roles (`outline`, `folds`, `tips`, `crown`) that the resolver expands to this drawing's strokes. Distances are stored as `%H`.
- **Measure:** share of a new drawing's shadow area produced by sheet statements with no edits; first target 40%.
- **Fails / risk:** poses differ; the sheet gives defaults, not placements. Risk of a house sameness, which is in fact what a studio look is.
- **Effort:** M. Needs 4, 10, 12.

## C. Revised process

| # | Pass | Tools | Look at | Measure |
|---|---|---|---|---|
| 0 | Regions | 1 stroke graph, 2 facets, 3 gap candidates, freeze IDs | stroke sheet and facet sheet per part | reconstruction IoU ≥ 0.95; no leaks; typed walls 0 |
| 1 | Flats | unchanged; the region map is the base layer every later shape is locked to | flats | `pnpm check` |
| 2 | Gradients | tube `s` (10) or between-lines `φ` (9) give the direction, instead of two typed points | squint | one drift per part |
| 3 | Contact | side rule (12), occlusion half only, as soft bands (8) | cut-outs | contact only on under sides |
| 4 | Shadow shapes | in this order: casts (14); side rule proposals (12) accepted into bands (8); facet fills (6); shadow lines (7); tubes, balls, between-lines (9, 10); hair strands (11); then seal (15) and clean (17). Hand polygons last, through snap (16) | masks view with shape IDs; fault sheet; mirrored | lint a to i |
| 5 | Edges, warm band | edge kind comes from the tools (ON none, cast 1 to 2.5, form by `R`); warm band is a child (13) | 200% crops | band never on the lit side = child test |
| 6 | Deep shade | child shapes only (13) | remove it: form stays | children outside parents 0 |
| 7 | Ring and light | ring (11); sheen as a tube band on dark cloth (10); lights are children of the lit set | hide it | ring coverage; orphans 0 |
| 8 | Face and eyes | stays hand-placed, but relative to eye and mouth strokes through the grammar (4); sheet (19) for the standard marks | 96 px read | none new |
| 9 | Line | each stroke takes its darkest neighbouring facet from the adjacency (2), per stroke not per pixel | no black line in skin | per-stroke colour table |
| 10 | Finish | blink against pass 9; repeatability | blink | lint k, l |

Callable at any pass: ID sheet or echo of one reference (5), nudge and bulge (17), seal on one part (15), snap one shape (16), lint on one part (18).

## D. Build order

| # | Build | Expected effect | Cheapest experiment, and what kills it |
|---|---|---|---|
| 1 | Lint and fault sheet (18, 5) | no change to pictures; every later step becomes measurable | add orphans, parallel share and near-tangents to the script, run on the three drawings. Nothing kills it |
| 2 | Seal (15) | lit gaps 121 to 153 → under 20; 2 to 6 px band 30 to 35% → perhaps 15 to 20% | apply it to the existing masks inside the script, no engine change, and blink. Kill if area changes over 3% or tips blunt visibly |
| 3 | Stroke graph, facets, ID sheets, grammar (1, 2, 4, 5) | enables 6 to 13; alone changes nothing | run on tape; do the round-trip reading test. Also count how much present shadow area is whole facets (≥ 90% dark): if under 15%, tool 6 is minor and 7, 8 carry the load. Kill or simplify if IoU < 0.9 or the agent misreads more than 1 label in 20 |
| 4 | Shadow line and facet fill (7, 6) | hand shapes 219 to 266 → roughly 100 statements; typed points 1,340+ → a few hundred numbers, mostly IDs; dead shapes 0 | redo tape's jacket with lines and fills only; compare statement count, lint and a blind look. Kill if the agent needs as many numbers as before |
| 5 | Side band and side rule (8, 12) | fold consistency 57 to 76% → 90%+; fold coverage becomes a chosen number | propose bands for every fold on tape's jacket and trousers; show the critic hand version and rule version unlabelled. Kill the automatic part if it reads mechanical; keep bands as a manual tool |
| 6 | Child shapes (13) | deep shade and warm band always inside their parent | regenerate all `s2` on tape from parents, blink against the hand ones |
| 7 | Between-lines, tube and ball (9, 10) | the 41 to 49% of edge length that is free form shadow gets a system; pass 5 gets real radii | arms and legs of twin; watch parallel share; blind test for "plastic". Kill per part kind, not as a whole |
| 8 | Strand map and ring (11) | orphans in hair → 0; highlights follow strands | tape's front hair ring only, against the hand ring |
| 9 | Snap, edge designer, cast v2 (16, 17, 14) | cleans what is still typed; 2 to 6 px band under 5% | snap the legacy shapes of bell and read the report of long snaps |
| 10 | Model sheet (19) | first real carry-over between characters | write the sheet from tape, apply to bell, count statements that resolve untouched |

Biggest unknown, to settle in step 3: whether the agent reads numbered strokes reliably in hair and hands. If not, fall back to "nearest stroke to this click", which keeps the click-names-a-patch model that already worked.

## E. Looked at and rejected

- **Inflated normals as shading (Lumo, bas-relief, Ink-and-Ray, cel-shadow inflation)** [S17, S18, S26]: smooth or banded tone parallel to every contour is the measured latex cause. Kept only as the ball in tool 10: one hard edge on parts that really are round.
- **CrossShade, BendFields, BendSketch** [S21]: need cross-section or curvature strokes drawn for the purpose and a global solve; character line art has neither.
- **Learned shading and flatting (ShadeSketch, deep normal estimation, FlatMagic)** [S16, S17, S28]: networks, excluded by the brief. The usable idea in ShadeSketch, a small set of discrete light directions, is already our one declared light.
- **LazyBrush and other graph-cut colourisers, Smart Scribbles** [S8, S27]: they solve leaky flatting with a global energy over all pixels. Pools plus clicks already does that job in the same spirit; a cut over 6 to 14 million pixels is not "seconds".
- **Trapped-ball filling** [S9]: a ball that cannot pass a gap is the same idea as the pools' opening ratio, but with one fixed radius, so it rounds corners and stops short of tips [K, I].
- **Frame-field / PolyVector vectorisation, tensor voting, Euler-spiral completion** [S22, K]: built for rough sketches. On clean line art, thinning plus tangent pairing is enough; gaps of at most 30 px do not need spirals.
- **Active contours** [K]: several weights to tune and they settle on the wrong line among parallel hair strokes. A cheapest path through ink is deterministic.
- **Liquify, mesh transform, puppet warp as tools of their own**: they are how a hand corrects a misplaced shape. With references a shape is restated; only nudge and bulge survive (17).
- **Stabilisers, perspective and symmetry rulers**: they steady a hand or build scenery. No hand here; one figure, never symmetric in three-quarter view.
- **A general constraint solver (CAD style)**: references resolved in one pass are enough; a solver adds failure modes that are hard to read from an image.
- **Auto-closing every gap, auto-shading every fold, sealing silently**: each hides a design decision. All three stay as proposals or as reported repairs.

**What stays judgement:** which folds get a shadow at all; ridge or valley; where a shadow line ends and how much it bulges; how far the ring steps; the whole face. The tools make each of these one small statement and make the mechanical part exact; they do not choose.

## F. Sources

Opened this session (through search summaries):
- S1 Clip Studio Paint manual, Fill tool and Advanced Fill (refer layers, close gap, area scaling): https://help.clip-studio.com/en-us/manual_en/420_fill/Fill_Tool.htm , https://help.clip-studio.com/en-us/manual_en/420_fill/Advanced_Fill.htm , https://tips.clip-studio.com/en-us/articles/590
- S2 Clip Studio tips, closed area fill, enclose and fill, paint unfilled area: https://tips.clip-studio.com/en-us/articles/591
- S3 Clip Studio manual, eraser tools (vector erase up to intersection) and vector layer tips: https://help.clip-studio.com/en-us/manual_en/240_brushes/Eraser_tools.htm , https://tips.clip-studio.com/en-us/articles/7570
- S4 Clip Studio manual, freeform gradient / contour line paint: https://help.clip-studio.com/en-us/manual_en/420_fill/Freeform_gradient.htm , https://tips.clip-studio.com/en-us/articles/2437
- S5 影指定 layer folder and animation colour set (separate colours for solid lines, colour-trace lines and shadow fills; no anti-aliasing): https://assets.clip-studio.com/en-us/detail?id=1691983 , https://assets.clip-studio.com/en-us/detail?id=1691252
- S6 Clip Studio tutorials on anime shading with clipped layers and selection fills: https://tips.clip-studio.com/en-us/articles/2964 , https://tips.clip-studio.com/en-us/articles/2974 , https://www.clipstudio.net/oekaki/archives/163804
- S7 Krita manual, colorize mask and enclose and fill: https://docs.krita.org/en/reference_manual/tools/colorize_mask.html , https://docs.krita.org/en/reference_manual/tools/enclose_and_fill.html
- S8 Sýkora, Dingliana, Collins, LazyBrush (2009): https://dcgi.fel.cvut.cz/~sykorad/lazybrush.html
- S9 Zhang et al., Vectorizing Cartoon Animations (trapped-ball, 2009): https://cg.cs.tsinghua.edu.cn/papers/TVCG_2009_cartoon.pdf
- S10 Blender manual, Grease Pencil fill tool (gap closure: Radius, Extend) and 3.4 notes: https://docs.blender.org/manual/en/dev/grease_pencil/modes/draw/tools/fill.html , https://developer.blender.org/docs/release_notes/3.4/grease_pencil/
- S11 Toon Boom Harmony, closing gaps, paint unpainted: https://docs.toonboom.com/help/harmony-20/paint/colour/close-gaps.html , https://docs.toonboom.com/help/harmony-22/paint/reference/tool-properties/paint-tool-properties.html
- S12 OpenToonz, painting animation levels: https://opentoonz.readthedocs.io/en/latest/painting_animation_levels.html
- S13 TVPaint CTG layers: https://doc.tvpaint.com/docs/colorize-texturize/colorize-with-ctg-layers/quick-overview
- S14 Illustrator, gaps in Live Paint groups: https://helpx.adobe.com/illustrator/desktop/paint-and-fill/learn-painting-basics/find-and-close-gaps-in-live-paint-groups.html
- S15 Procreate handbook, ColorDrop threshold and reference layers: https://help.procreate.com/procreate/handbook/colors/colors-interface
- S16 BPelt Multifill / Flatten and FlatMagic: https://makingcomics.com/?p=5345 , https://cragl.cs.gmu.edu/flatmagic/
- S17 Johnston, Lumo (2002), an implementation, and later 2D shading work: https://isgwww.cs.uni-magdeburg.de/~stefans/npr/entry-Johnston-2002-LIC.html , https://github.com/mrmagnifico/lumo-implementation , https://v-sense.scss.tcd.ie/?p=2202
- S18 Petrović et al., Shadows for Cel Animation (2000): https://gfx.cs.princeton.edu/proj/cel_shadows/petrovic2000.pdf
- S19 DeCoro et al., Stylized Shadows (2007): https://pixl.cs.princeton.edu/pubs/DeCoro_2007_SS/index.php
- S20 Todo et al., Locally Controllable Stylized Shading (2007); Petikam et al., Shading Rig (2021): https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/todo_siggraph2007_shading.pdf , https://history.siggraph.org/?p=69668
- S21 CrossShade (2012) and BendFields (2015): https://history.siggraph.org/?p=110524 , https://hal.archives-ouvertes.fr/hal-01261456
- S22 Noris et al., Topology-Driven Vectorization of Clean Line Drawings; Bessmeltsev and Solomon, PolyVector fields: https://la.disneyresearch.com/wp-content/uploads/Topology-Driven-Vectorization-of-Line-Drawings-Paper.pdf , https://arxiv.org/abs/1801.01922
- S23 Viewer-perceived sketch connectivity (2022) and Gangnet's automatic gap closing patent: https://www.cs.ubc.ca/labs/imager/tr/2022/SketchConnectivity/SketchConnectivity.pdf , https://patents.google.com/patent/US5574839
- S24 Mortensen and Barrett, Intelligent Scissors (1995): https://courses.cs.washington.edu/courses/cse576/03sp/readings/mort-sigg95.pdf
- S25 Schneider's curve fitting, a port: https://github.com/volkerp/fitCurves
- S26 Orzan et al., Diffusion Curves (2008); Sýkora et al., Ink-and-Ray (2014): https://hal.archives-ouvertes.fr/hal-00840848 , https://users.cs.utah.edu/~ladislav/sykora14ink/sykora14ink.pdf
- S27 Noris et al., Smart Scribbles (2012): https://studios.disneyresearch.com/2012/07/05/smart-scribbles-for-sketch-segmentation/
- S28 Zheng et al., Learning to Shadow Hand-drawn Sketches (2020): https://arxiv.org/abs/2002.11812
- S29 Photoshop, adjusting pixel selections (expand, contract): https://helpx.adobe.com/photoshop/using/adjusting-pixel-selections.html

Not opened, cited from memory [K]: Felzenszwalb and Huttenlocher's distance transform (already in `segment.ts`); Zhang and Suen thinning (1984); Douglas-Peucker; Potrace's corner test; Kang et al., edge tangent flow; Medioni's tensor voting; Kimia's Euler-spiral completion; TikZ `intersections` and Asymptote path functions; the CAD topological naming problem; the coloured-pencil conventions of Japanese layout shadow marking. The searches for Japanese and Chinese artist write-ups returned mostly Clip Studio tutorials and assets, so the cel-practice claims rest on S5 plus memory and deserve a second look by someone who can read studio manuals.
