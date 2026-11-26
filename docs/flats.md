# Flat colours: pixel-exact flatting for black-and-white line art

From a finished black-and-white line art PNG to a layered `.clip` (CLIP STUDIO PAINT) and `.psd` file ready for shading:

1. **`Base 50% Grey`** — an opaque `#808080` silhouette layer covering every pixel of the figure that receives colour, excluding the outer background and all enclosed white spaces (arm gaps, finger gaps, punched holes).
2. **`↳ [Flats]`** — a folder **clipped directly to `Base 50% Grey` below** (`LayerClip = 1` in `.clip`, `clip = 1` on the folder header in `.psd`, Normal blend mode), containing **one single raster layer per flat colour** covering its exact area with zero overlap and zero uncovered pixels.
3. **`Line art`** — the original line art preserved bit-for-bit on top in `multiply` mode (or omitted with `--no-lineart` when injecting into an existing `.clip` canvas that already has line art).

Everything runs in pure Node.js (`src/flatting/` + `scripts/flats.ts`) at **1:1 native line-art resolution** — no browser, no upscaling drift, no image generation.

---

## Why naive flatting fails (and what we researched)

We surveyed both industry tools and academic flatting literature to eliminate every failure mode:

| Problem | Naive tool / earlier approach | What breaks | Technique chosen here |
|---|---|---|---|
| Faint thin lines & variable-density ink | Global threshold (`ink > 0.40` in `bucket/segment.ts`) | On the reference (`1086×1448`), raising the cut from `0.25` to `0.35` leaked **+192,478 px** (+12.2% of the canvas) through the top hair outline. Lowering globally to `0.15` bloats anti-aliased edges and seals acute corners. | **Paper-white normalization + 1D directional ink-ridge hysteresis** (`src/flatting/ink.ts`): solid cores (`ink >= 0.36`) plus 1D local maxima perpendicular to the stroke (`ink >= 0.14`, prominence `>= 0.04`) connected to cores or length `>= 4 px`. Waterproof on faint 1px strokes with zero bloat on anti-aliased flanks. |
| Cropped figures touching canvas edges | Flood-fill from all 4 canvas borders = background | Any portrait or 3/4 figure cropped at the bottom (skirts, coats, limbs) immediately leaks into background. | **Implicit canvas-frame closure** (`src/flatting/segment.ts`): canvas borders close open contours so cropped bottom panels stay separate atomic facets from the exterior background. |
| Small open gaps in line art | Plain flood-fill, fixed-radius Trapped-Ball (Zhang et al. 2009), or full-pixel LazyBrush graph cuts (Krita Colorize Mask) | Plain flood-fill leaks; fixed-radius trapped-ball rounds sharp corners and stops short of hair tips; global graph-cut energy over 1.5M+ pixels is slow and blurs thin features. | **Two-stage hybrid**: (a) **Geometric endpoint gap proposals** (`src/flatting/gaps.ts`, inspired by Fourey–Tschumperlé–Revoy 2018 / GIMP Line Art Detection & Blender Grease Pencil Extend+Radius) via Zhang-Suen thinning + outward tangent ray-extend and facing-pair matching, producing numbered candidates `g1, g2, ...`; (b) **Bottleneck-capped persistence watershed** (`maxNeckRadius = 5.5 px`, `ratio = 0.68`) on an exact $O(N)$ Felzenszwalb–Huttenlocher Euclidean Distance Transform, which seals narrow gaps (`<= 11 px`) without over-splitting wide anatomical shapes (arms, torsos, frames). |
| Adding walls renumbering every patch | Re-indexing facets after drawing walls | Adding one wall shifts hundreds of facet IDs. | **Wall-invariant ID resolution** (`src/flatting/spec.ts`): numeric IDs always resolve via the wall-free base segmentation's pole of inaccessibility `(deepX, deepY)` projected onto the walled segmentation. |
| White halos inside lines & colour bleed outside silhouette | Fixed pixel dilation ("Expand 1–2 px" in CSP/Photoshop) or uniform Euclidean `underInk` | Expanding too little leaves white halos; expanding too much bleeds colour outside thin silhouette strokes onto white paper. | **Ink-weighted geodesic multi-source Dijkstra** (`assignAndGrow` in `src/flatting/segment.ts`): step cost `dist * (0.12 + ink² * 5.0)`. Anti-aliased flanks (`ink 0.1..0.35`) are absorbed cheaply by their own side while dark stroke cores (`ink 0.7..1.0`) have high cost, forcing adjacent regions — and figure vs. background — to collide dead-center on the darkest ink ridge. Faint 1px outer strokes break ties toward background (`-0.008` when `ink < 0.42`) so zero grey bleeds outside. |
| Acute hair tips & micro-crevices | Standard bucket leaves trapped 1–20 px white pinholes where AA flanks pinch shut | Visible white dots at pointed hair tips and mechanical corners. | **Automatic trapped-pocket absorption** (unassigned pockets `<= 28 px` inherit their enclosing colour cleanly) + **deterministic 1px pinhole/speck sweep**. |
| Clipped folder export | Earlier `stack.ts` / `clip.ts` / `psd.ts` only clipped individual layers, not folders | Cannot output a folder clipped to a silhouette layer below. | **Clipped folder support** (`Stack.clipped`) in `src/layers/stack.ts`, `src/layers/clip.ts` (`LayerClip = 1`, `LayerComposite = 0` Normal), `src/layers/psd.ts` (`clip = 1` on the folder header record with `norm` mode), and `src/layers/clipread.ts` + `scripts/clipcheck.ts` round-trip verifier. |

---

## The 8-metric Quality Gate

Every build runs `auditFlats()` (`src/flatting/audit.ts`) plus a full `.clip` read-back check (`readClip` + `compositeClip`) and exits non-zero if any gate fails:

1. **Unnamed pixels** — must be `0`.
2. **Inner white-halo pixels** — clean paper pixels (`ink < 0.14`) trapped inside the figure on `>= 3` sides — must be `0`.
3. **Outer colour-bleed pixels** — figure pixels on clean white paper (`ink < 0.08`) touching clean background without a declared wall — must be `0`.
4. **Base silhouette coverage** — union of all layers inside `↳ [Flats]` vs. `Base 50% Grey` — `uncovered = 0`, `outside = 0` (100.000% exact match).
5. **Colour layer overlaps** — pixels painted in more than one flat layer — must be `0` (clean exact partition).
6. **Unwalled bare-paper edges** — boundaries between two different labels crossing clean white paper (`ink < 0.12`) without a declared wall/gap closure — target `0` (catches every accidental leak or missing wall with exact `(x, y)` coordinates).
7. **Tiny colour islands (`< 12 px`)** — reported with coordinates to catch stray misassigned specks (intentional tiny elements such as hair tips peeking behind a prop are verified visually).
8. **`.clip` round-trip validation** — `readClip` reports `0` CSP rule problems, exact layer tree (`Line art`, `↳ [Flats]`, `Base 50% Grey`, `Paper`), and `compositeClip` matches the reference composite (`max diff = 0`).

Every build also generates four full-canvas diagnostic PNGs **plus four automatic 3× side-by-side review contact sheets** (no manual crop coordinates needed):

- `preview.png` — final composite (`Paper` + `Base 50% Grey` + clipped `Flats` + `Line art` Multiply).
- `silhouette.png` — `Base 50% Grey` over screaming magenta (`#ff00ff`) with 55% ink overlay (classic comic-flatter's check: any single missing pixel, halo, or bleed pops immediately).
- `neon-check.png` — all colour layers in high-contrast neon on dark charcoal **with no line art** (exposes any pinhole, jagged seam, or misassigned facet).
- `audit-overlay.png` — declared walls in cyan, any unwalled bare-paper edges circled in red, tiny islands in yellow.
- `review-leaks.png` — 3× zoom of every unwalled bare-paper boundary (`sealNecks` is strictly capped at `<= 1.5 px` so wide trapped-ball watershed staircases across open lines can never slip through unreviewed).
- `review-bg-holes.png` — 3× zoom of every enclosed non-exterior white space (`bg` facet), catching hair curls, props, or clothing accidentally excluded as background.
- `review-suspect-holes.png` — 3× zoom of small/medium interior figure pockets bordering `>= 2` distinct materials (prioritized by neighbor count & size), catching trapped air pockets under elbows or between fingers that were accidentally coloured.
- `review-same-color-loops.png` — 3× zoom of closed compact ink loops sharing their parent's colour (buttons, rivets, nails, bolts, gems), catching missed small details or inconsistent twin hardware.

---

## Workflow (for any illustration)

### 1. Analyze the line art (takes ~1–2 seconds)
```sh
node scripts/flats.ts analyze path/to/lineart.png output/my-piece/analyze \
  --crop head:360,30,630,520:2 \
  --crop hands:120,60,320,420:2
```
Produces:
- `facets.png` (whole canvas with numbered facets at poles of inaccessibility)
- `crop-*.png` (zoomed numbered facet sheets for dense areas like eyes, hands, accessories)
- `gaps.png` (detected geometric gap candidates `g1, g2, ...`)
- `facets.json` (machine-readable table of all facets, areas, poles, bounding boxes, border masks, bottlenecks, and gap candidates)

### 2. Write a `.flats.txt` spec
```txt
coreCut 0.36
ridgeCut 0.14
maxNeckRadius 5.5
autoAbsorbMaxArea 28

# Seal 1px micro-pinches (strictly capped at <= 1.5 px!), accept detected gaps, or draw explicit tangent walls
sealNecks 1.5
close g79 g80
wall 624,282 645,274

# Background & enclosed white spaces (excluded from Base 50% Grey)
bg: 1070 550 611 1077

# One line (or multiple lines) per colour layer inside clipped [Flats]
# Supports exact facet IDs, @x,y pixel picks, and box:x0,y0,x1,y1[:<=maxArea] bulk rules
color Hair #4a4458: box:415,45,985,535
color Skin #fae0cf: 368 770 1012 1078
color Eye White #f6f7fa: 274 283 331
```

### 3. Build, verify, and inspect at 300–400% zoom
```sh
node scripts/flats.ts build path/to/lineart.png my-piece.flats.txt output/my-piece/final \
  --name my-piece \
  --crop eyes:460,220,240,140:4
node scripts/clipcheck.ts output/my-piece/final/my-piece.clip --tree
```

### Injecting directly into your own `.clip` file
If you already have a `.clip` canvas of the exact same pixel dimensions containing your line art layer:
```sh
node scripts/flats.ts build lineart.png my-piece.flats.txt output/my-piece/final \
  --template my-drawing.clip --no-lineart
```
Your existing layers stay untouched bit-for-bit, and `Base 50% Grey` + clipped `↳ [Flats]` are added in one folder ready to drag underneath your line art.

---

## Reference illustration results (`1086 × 1448`)

Applied to the reference character holding a 35mm film strip (`output/flats-ref/reference.flats.txt` -> `output/flats-ref/final/`):

| Metric | Result |
|---|---|
| Canvas | `1086 × 1448` (native 1:1, `1,572,528 px`) |
| Figure silhouette (`Base 50% Grey`) | `876,117 px` (`55.71%` of canvas), excluding exterior background, 3 torso/arm gaps, 3 finger gaps, and all 52 floating film sprocket holes |
| Clipped colour layers (`↳ [Flats]`) | 16 exact layers (`Hair`, `Skin`, `Eye White`, `Eye Iris`, `Mouth`, `Film Border`, `Film Frames`, `Shirt`, `Scarf`, `Jacket`, `Jacket Trim`, `Buttons`, `Waist Sash`, `Skirt`, `Strap`, `Metal Clip`) |
| Unnamed pixels | **0** |
| Inner white-halo pixels | **0** |
| Outer colour-bleed pixels | **0** |
| Base coverage mismatch | **uncovered = 0, outside = 0** (100.000% exact) |
| Colour layer overlaps | **0** |
| Unwalled bare-paper boundaries | **0** (0 spots) |
| `.clip` round-trip check (`clipcheck.ts`) | **0 problems**, composite vs `CanvasPreview` **max diff = 0** |
| Total build runtime | ~6 s (pure Node.js) |

---

## Code map

| File | Responsibility |
|---|---|
| `src/flatting/ink.ts` | Paper-white normalization, 1D ink-ridge hysteresis barrier, optional grey-fill cleaner, alpha-ink extractor |
| `src/flatting/gaps.ts` | Zhang-Suen skeletonization, endpoint tangents, pair & ray-extend gap candidates, Bresenham wall rasterizer |
| `src/flatting/segment.ts` | Bottleneck-capped persistence watershed facets, poles of inaccessibility, ink-weighted geodesic centerline growth, 1px pinhole sweep |
| `src/flatting/spec.ts` | `.flats.txt` parser, wall-invariant ID resolver, `Base 50% Grey` + clipped `Flats` stack builder |
| `src/flatting/audit.ts` | 8-metric Quality Gate + `silhouette.png`, `neon-check.png`, `audit-overlay.png` generators |
| `src/flatting/sheet.ts` | Pure-Node bitmap font labeler, numbered facet sheets, gap sheets, integer zoom crops |
| `src/layers/stack.ts`, `clip.ts`, `psd.ts`, `clipread.ts` | Clipped folder (`Stack.clipped`) export and round-trip composite verification |
| `scripts/flats.ts` | Standalone `analyze` and `build` CLI |
