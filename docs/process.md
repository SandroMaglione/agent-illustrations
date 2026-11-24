# The process

Colour clean line art so it looks like game splash art: clear outline, solid shadows, subsurface scattering, solid shapes. Rules live in `src/splash/engine.ts` and `tones.ts`. One drawing is one data file plus its colour marks.

Lengths are line-art px on a head of about 430 px; scale them with `head`. Ratios are OKLCH lightness. Lab L is 0 to 255. [M] measured on references, [A] agreed by eye.

## Priorities
1. **Face and eyes first.** They carry the picture. Give them the most time, the most layers and the strongest contrast, and protect their ink.
2. **Large shapes and overall look.** Hair mass, coat, value groups.
3. **Small accessories.** Each needs its own clean silhouette, a key line and real contrast.

## Brief for the line art
- Closed lines. Gaps under 3 px on straps and knots get closed before filling.
- Contour weight about 0.7 to 1% of head height, tapered, thinner on skin and hair. Heavier works, but reads as another studio.
- Same part names on every character.

## Passes
| # | Pass | Rule | Check |
|---|---|---|---|
| 0 | Regions | colour marks flood to the ink; `walls` close open forms, `force` fixes the rest | `view=regions` has no leaks |
| 1 | Flats | skin `#fcf1ec` [M]; cloth greyed; stockings and satin never black. Three value groups apart | `pnpm check` |
| 2 | Gradients | one slow drift per part. Hanging and back hair 20 to 35 Lab L below the crown, cooler to the tips. Blush on cheeks, ears, shoulders, elbows, knees, hands | squint |
| 3 | Contact | soft dark beside an overlap | paper cut-outs |
| 4 | Shadow shapes | design each: one long clean side, one pointed side. Cast shadows are the caster moved along the light (upper left). Face 8 to 24% in shade, limbs 15 to 35% | `view=masks` |
| 5 | Edges and warm band | cast edges 1 to 2.5; form edges 4 to 10 by radius. Skin `#c9aaa4` at the edge, `#b89b97` inside [M]. Warm band `#e2b1a5` just **inside** the edge | never on the lit side |
| 6 | Deep shade | overlaps and folds only. Skin `#a38386`, cloth 0.55, hair toward slate | remove it: form stays |
| 7 | Ring and light | hair ring: one solid scalloped band, cut only where the hair parts, warm lip on the lower edge [M]. Cloth planes crisp. Dark cloth: tapered sheen. Metal: bronze, gold, cream, with the darkest beside the brightest | hide it: form survives |
| 8 | Face and eyes | order below | reads at 96 px |
| 9 | Line | a line takes its darkest neighbour's colour; skin lines red-brown; only ink the artist **filled** goes near black, judged against this drawing's own contour. Face ink is never slimmed | no black line inside skin |
| 10 | Finish | skin clean, hair and cloth slight grain. White page, halo optional, at most 9% [M] | blink against 9 |

## Eyes, in order
white (not pure), sclera shadow from the lash edge down, iris dark in the top third with crisp bands, ring, pupil, bright lower crescent, one main light and one small opposite, lash core as the darkest mark, red-brown lash tips, lid tint. Fill brows. One crisp warm-white nose mark. Blush plus three to five short strokes.

## Colour
- Shade 1 and 2 at 0.70 and 0.55 of the base for cloth. White cloth shades to lavender grey.
- **Shades barely gain saturation** [M]: at most +0.04, +0.09, +0.12 HSV S on cloth, less on hair and white, more on metal. The engine caps it.
- The figure should be at least 75% under HSV S 0.3 (references 82 to 99%) and at most 5% under luma 30 (references 0.1 to 3.8%). Keep saturation for eyes, metal and one accent.

## Accessories
- List small metal and props in `keyline`: they get a thin pale line where they overlap the figure. Leave buttons and long straps out, or they look like stickers.
- Keep every drawn hole and tooth; check them at 200%.
- Darkest metal tone next to the brightest chip. One spark per piece.
- Floating graphics: few, crisp edge with a glow, away from the face.

## Working loop
1. Regions until clean, flats, `pnpm check`.
2. Shadow shapes as a black and white design.
3. Edges, hair, then face and eyes.
4. Accessories and extras.
5. Crops at 200% of head, hands, accessories. Fix the worst thing, repeat.
6. Optional second model as critic. Give it references, line art and render but no opinion. Measure every claim before acting. Label gaps RULE, SHAPE or LINE ART.

## Known limits
- Shadow and light shapes are placed by hand: 218 to 267 per drawing. This is the main cost.
- One pose, one angle. No animation.
- Cannot invent tapered lines the artist did not draw.
