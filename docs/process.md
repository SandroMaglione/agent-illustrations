# The process

Colour clean line art so it looks like game splash art: clear outline, solid shadows, subsurface scattering, solid shapes. Rules live in `src/splash/engine.ts` and `tones.ts`, tools in `src/tools` ([list](tools.md)). One drawing is a few data files.

Lengths are line-art px on a head of about 430 px; scale them with `head`. Ratios are OKLCH lightness. Lab L is 0 to 255. [M] measured on references, [A] agreed by eye.

## Priorities
1. **Light and value before detail.** One light, one focus, three values. If it does not read in black and white, no shading saves it.
2. **Face and eyes.** They carry the picture. Give them the most time, the most layers and the strongest contrast, and protect their ink.
3. **Form through shadows.** Thickness, undersides and what casts on what. Every overlap casts.
4. **Large shapes.** Hair mass, coat, value groups.
5. **Small accessories.** Each needs its own clean silhouette and real contrast.

## Brief for the line art
- Closed lines. Gaps under 3 px on straps and knots get closed before filling.
- Contour weight about 0.7 to 1% of head height, tapered, thinner on skin and hair. Heavier works, but reads as another studio.
- Lower lids drawn. Without them the eye rig guesses.
- Same part names on every character.

## Order
0. **Light and value.** Write `light` (one direction, one height) and `focus` in the drawing. Give the big parts three values so the key area is the lightest, or holds the only strong contrast. Look at `view=value`. Value is luma, not HSV V or HSL L.
1. **Regions.** Print the numbered patches, name them by number, add a wall where two names share a patch.
2. **Lines.** Freeze the line numbers (`scripts/freeze.ts`), print numbered sheets per area. Nothing after this uses a coordinate grid.
3. **Eyes** from their named lines, then flats.
4. **Cast list.** Every overlap pair gets a cast: caster, receiver, distance, deep share. A cast must reach further than the shade of any closer part, or it cannot be seen.
5. **Turning planes** of each part, computed from the light (`turn`, `ball`). Then hair by lock, folds and seams from the kits, deep shade inside parents. Judge it in `view=masks`.
6. **Children.** Trim, buttons and piping inherit the shade they lie on. Bevels on hard parts, never where something lies on top.
7. **Lights.** A separate round: one lit plane per mass, one lit strand per lock, one glint per hard thing. A light stands on a line or crosses a whole plane.
8. **Fix** DEAD and LEAK warnings, `pnpm check`, crops at 200% of head, hands and accessories. Fix the worst thing, repeat.
9. **Critic**, optional (below).

## Passes of the engine
| # | Pass | Rule | Check |
|---|---|---|---|
| 0 | Regions | bucket clicks, or colour marks on the older drawings; walls close what the artist left open | `view=regions` has no leaks |
| 1 | Flats | skin `#fcf1ec` [M]; cloth greyed; stockings and satin never black. Three value groups apart | `view=value`, `pnpm check` |
| 2 | Gradients | one slow drift per part. Hanging and back hair 20 to 35 Lab L below the crown, cooler to the tips. Blush on cheeks, ears, shoulders, elbows, knees, hands | squint |
| 3 | Contact | soft dark beside an overlap | paper cut-outs |
| 4 | Shadow shapes | one long clean side, one pointed side; casts along the one light. Face 8 to 24% in shade | `view=masks` |
| 5 | Edges and warm band | cast edges 1 to 2.5; form edges 4 to 10 by radius. Skin `#c9aaa4` at the edge, `#b89b97` inside [M]. Warm band `#e2b1a5` just **inside** the edge | never on the lit side |
| 6 | Deep shade | overlaps, folds and beside a caster. Skin `#a38386`, cloth 0.55, hair toward slate. Shadow centres lean to the sky | remove it: form stays |
| 7 | Ring and light | hair ring: one solid band, small scallops below, calm edge above, cut only where the hair parts, out of the headwear's shadow, warm lip on the lower edge [M]. Metal: the darkest beside the brightest | hide it: form survives |
| 8 | Face and eyes | order below | reads at 96 px |
| 9 | Line | a line takes its darkest neighbour's colour; skin lines red-brown; only ink the artist **filled** goes near black, judged against this drawing's own contour. Face ink is never slimmed | no black line inside skin |
| 10 | Finish | values close up away from the focus; skin clean, hair and cloth slight grain. White page, halo optional, at most 9% [M] | blink against 9 |

## Eyes, in order
white (not pure), sclera shadow from the lash edge down, iris dark in the top third with crisp bands, ring, pupil, bright lower crescent, one main light and one small opposite, lash core as the darkest mark, red-brown lash tips, lid tint. Fill brows. Nose: one crisp shadow on the side away from the light, one warm-white mark. Blush plus three to five short strokes.

## Colour
- Shade 1 and 2 at 0.70 and 0.55 of the base for cloth. White cloth shades to lavender grey.
- **Shades barely gain saturation** [M]: at most +0.04, +0.09, +0.12 HSV S on cloth, less on hair and white, more on metal. The engine caps it.
- The figure should be at least 75% under HSV S 0.3 (references 82 to 99%) and at most 5% under luma 30 (references 0.1 to 3.8%). Keep saturation for eyes, metal and one accent.
- Local contrast at the head at least 1.17 times the rest (references 1.17 to 1.24), and the head lighter than the rest.

## Accessories
- List small metal and props in `keyline`: they get a thin pale line where they overlap the figure, never inside a shadow. Leave buttons and long straps out, or they look like stickers.
- Keep every drawn hole and tooth; check them at 200%.
- Darkest metal tone next to the brightest chip. One spark per piece.
- Floating graphics: few, crisp edge with a glow, away from the face.

## Critic
A second model gets the references, the line art, the render, the value and mask views, the declared light, and the list of operations the maker can execute. No opinion. Each finding must say where, what, evidence, the exact change, and how to see it is fixed. Then measure every claim before acting, and measure again after. Label gaps RULE, SHAPE or LINE ART.

## Known limits
- Choosing the shapes is still the main cost, and still judgement: which folds get a shadow, ridge or valley, how a boundary bulges, how many lights, the face as a whole.
- One pose, one angle. No animation.
- Cannot invent tapered lines the artist did not draw.
