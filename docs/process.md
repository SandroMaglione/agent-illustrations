# The process

Colour clean line art so that the result could stand beside the target references: crisp, blocky, value first, black where it counts, rich shadows, real materials. The renderer is `src/bold`, the tools `src/tools` ([list](tools.md)), the notes behind it [`lessons.md`](lessons.md). One drawing is a few data files.

**The only judge that counts:** `node scripts/lineup.ts out.png render.png <head px> <cx,cy>`, in colour and in greyscale. The references stay local (`public/refs`, e f g).

Lengths are line-art px; sizes that matter are shares of head height.

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
1. **Regions.** `scripts/new.ts`, patch sheet, names by number, `scripts/name.ts`, until `show=pools&named=1` has no red "?" and no leak. A wall splits a patch that two parts share. Set `head` and, in `defs`, each part's material and height in the stack (`z`).
2. **Thumbnails: light and value.** Four to six plans in `<name>-plans.ts` that differ in more than hue: where the light comes from, which mass is lightest, which is darkest, where the accent sits. Look at `v=thumbs`: at the small size, in three values, where does the eye land? The numbers under it say the focus against the rest. Value is luma, not HSV V or HSL L. Someone with taste picks one; then its `light`, `focus` and colours go into the drawing.
3. **Lines and eyes.** Freeze the line numbers, print numbered sheets per area. Nothing after this uses a coordinate grid. Eyes from their named lines.
4. **Cast list.** Every overlap pair gets a cast: caster, receiver, distance, deep share. A cast must reach further than the shade of any closer part, or it cannot be seen.
5. **Turning planes** of each part, computed from the light (`turn`, `ball`). Then hair by lock, folds and seams from the kits, deep shade inside parents. Judge it in `view=masks`.
6. **Children.** Trim, buttons and piping inherit the shade they lie on. Bevels on hard parts, never where something lies on top.
7. **Lights.** A separate round: one lit plane per mass, one lit strand per lock, one glint per hard thing. A light stands on a line or crosses a whole plane.
8. **Fix** DEAD and LEAK warnings, `pnpm check`, crops at 200% of head, hands and accessories. Fix the worst thing, repeat.
9. **Critic**, optional (below).

## What the renderer does
| # | Pass | Rule |
|---|---|---|
| 1 | Flats | three value groups apart. `kind` is the material: skin hair cloth pale dark leather plastic glass peel leaf metal flat |
| 2 | Hue | slow gradients; hair gets bands along its strands that turn the hue and hardly move the value |
| 4 | Planes | `forms`: each patch, part or mass turns away from the light somewhere. Casts, kits and hand-made shapes on top. Everything is cut into straight runs |
| 5 | Edges | hard. Skin takes one pale step before its form shade; the colour is richest where shade begins; reflected light in the last stretch on the far side |
| 6 | Deep shade | beside a caster, in folds. Under anything that stands well off: black |
| 7 | Materials | metal: 6 bands, darkest beside brightest. Leather, plastic: one see-through plane. Fruit: broad and soft. Cloth: a lit plane. Skin, matte: none |
| 8 | Face | clean: short fringe shadow, black lash, crisp iris steps, one spark, a nose patch and a mark only where the line art leaves room |
| 9 | Line | black, at the references' weight, heavier away from the light; a dark colour only inside a lit plane. Filled blacks and face ink are the artist's |
| 10 | Air | lit side warmer, far side cooler, grain |

Shade is a colour multiplied on the base: warm colours go through rose to violet, cool ones to blue. Look at `view=grey` before judging a colour.

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
