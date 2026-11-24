# Style notes

## What David Hill's workflow looks like
No write-up found (checked 2026-11-24: both threads, replies, web). He has not answered the "how" replies. Sources below are his posts and the code visible in the video.

Said:
- "every scene is a script, not a drawing, so it can be recast into another body or style" (22 Nov)
- "i don't know why anyone would one shot when it's never been easier to iterate" (23 Nov)
- On another project: "started off with research, then storyboarding, flight paths, and ultimately final renders" (19 Nov)

Visible in the code:
- `engine/rig.js`: poses are layered mixes, `P.selling = { layer: 'all', mix: ['lean-in', ...] }`; feelings combine a body, eyes and a mouth.
- `rig.js` `DESIGN` table: one row per knob with key, group, label, help. "The studio builds its panel from this t(able)".
- `engine/character.js`: each cast member is a handful of proportions plus a one-line reason ("Width and depth; the heaviest brows").
- `engine/skins/*.js`: one file per style, same contract: `draw`, `ground`, `params`, `about` (a sentence describing the medium).
- Comments: "(round 33: a square eye in the family...", "(contract 4.7) ...", "THE OWNER'S TUNED VALUES GO HERE". So: numbered review rounds, a written contract, and a person tuning sliders whose values get pasted back.
- A sizes row (48, 96, 200 px) to check every drawing small.

Inference: an agent writes the engine against a contract; the designer judges in a studio, round after round, and the tuned numbers become presets.

## Measured from the splash reference (1258 px wide)
- Skin light #fcf0e7, shade about #c3a79c: lightness x0.79, warmer and more saturated.
- The skin light-to-shade edge is one hard step with a pink band (#e7c5b7) about 4 px wide between them.
- Cloth edge is softer: about 8 px. Blue #5d7aa0 to #33475f: lightness x0.66, less saturated, cooler.
- Hair runs a vertical gradient (#668a78 top to #465e53 bottom) under hard shadow shapes; highlight is a broken band of flat trapezoids.
- Lines: outline and inner about 1-3 px, pure black; corners fill with ink. No line on blush, nose highlight or decals.
- A pale halo of about 2 px separates the weapon and hands from the body, but not from the page.
- A cool blue rim sits inside the shadow side of hard things.
- Fine grain: std about 2 on cloth and hair, under 1 on skin.

## Principles: a style is eight decisions
1. **Shape**: what curves are allowed, where corners are sharp. Comes from the drawing, not the style.
2. **Value steps**: how many (1, 2, smooth), and how dark.
3. **Shadow hue**: which way colour moves when it darkens. Skin goes warm, everything else goes to the ambient. Add a tint vector; do not rotate hue, or cream turns green.
4. **Edge**: how wide the boundary is, per material.
5. **Line**: hierarchy (silhouette > overlap > crease), colour, what gets no line.
6. **Separation**: how overlaps stay readable (halo, rim, value, gap).
7. **Surface**: gradient, grain, dots, paper.
8. **Detail budget**: where small marks gather. Face, hands and gear get many; legs and big cloth get few.

`src/cel/style.ts` is these as numbers. Six presets differ only there.

## Workflow for a new style
1. Collect 1-3 references of the same look. Zoom to pixels; measure the eight, do not describe them.
2. Write one sentence about the medium (what tool, what paper, what it cannot do).
3. Fill the eight as numbers. Render a fixed test sheet: one person, one hard object, one scene.
4. Put it beside the reference at full size, 400% and 96 px. Fix the single worst difference. Repeat.
5. Turn every fix into a number or a rule, never a one-off patch.

## Limits found
- Rules cover rendering. They do not cover drawing: anatomy, hair clumps, hands and folds were authored by hand here, and are the weak part.
- Each figure is one pose and one angle. Turning it needs a rig or 3D.

## Colouring supplied line art (`src/lineart/`)
`?v=sketch` (final), `?v=regions` (check seeds). Reads `public/sketch.png`.
1. Rough seeds per region (`seeds.ts`), then a multi-source flood where crossing ink is expensive. Open gaps close themselves.
2. Derived shade: shifted-region crescents, offset cast shadows between region pairs, short wedges behind ink lines.
3. Authored forms (`paint.ts`): bangs, legs, table folds, highlights. The sketch does not state these.
4. Ink: the sketch smoothed along its own stroke direction (`flow`), so broken pencil joins up; region outlines and a heavier silhouette on top.
5. `FORCE` shapes fix what the flood cannot: strands thinner than the pencil, open edges, soft wide pencil contours.

Fails: hatching and hand construction lines become hard ink; pencil wobble is kept; small overlapping shapes (ribbons, frills) read flat; background pencil is dropped.

## Lit colouring of clean line art (`src/clean/`)
`?v=oni` (passes: `&pass=regions|flat|form|final`), `?v=ramps`.
- `engine.ts` is generic; `oni.ts` is one drawing's data; `ramp.ts` turns one base colour into six tones.
- **One light.** `LIGHT` in `engine.ts` drives form shading, cast shadows, crease wedges, lit edges, cold bounce and the page tint.
- **Form.** Each region is inflated (Poisson height, inner lines crease it), then lit. Smooth normals inside the region only, or shadow bands appear on the lit side.
- **Tones.** highlight and light lean warm (OKLCH 78°); shadow 1-3 lean cold (278°). Yellow and red reach cold through red and violet. Reduce chroma into sRGB; clipping turns shadows neon.
- **Shadow levels.** Cast: far part is shadow 1, the contact part shadow 2. Shadow 3 is authored, only in key areas.
- **Hair.** A noise threshold along the strand direction makes the streaks; highlights are slivers along the same direction, in two lights.
- **Line.** Near black at the silhouette, the local colour's own dark inside.
- **Closed shapes.** A component vote fixes stray seeds; `walls` close forms left open; `force` handles the rest.
