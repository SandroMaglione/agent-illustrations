# The process

Colour clean line art so that the result could stand beside the target references: crisp, blocky, value first, rich shadows, real materials. The renderer is `src/bold`, the form tools `src/form`, everything else `src/tools` ([list](tools.md)). One drawing is a few data files in `src/splash`. Why each rule exists: [`findings.md`](findings.md). Every note ever given: [`lessons.md`](lessons.md).

**Two judges.** `node scripts/lineup.ts out.png render.png <head px> <cx,cy>` puts the drawing between the references, in colour and greyscale (they stay local). `node scripts/gate.ts name` measures value and second light: a FAIL means stop and fix before going on.

Lengths are line-art px; sizes that matter are shares of head height.

## Principles
1. **Value before everything.** If it does not read in greyscale, nothing later saves it. Look at grey after every stage.
2. **Form before shade.** Know the solid behind every piece before drawing a shadow on it. An arm is a cylinder first; folds, casts and facets come on top.
3. **The form says where, the drawn line says how.** Shade falls where the form turns; its edge runs along the artist's nearest line.
4. **Simple beats correct.** One clean shape per plane or lock. A right but uneven edge is worse than a simple one.
5. **The face is an exception**, and so are the shadows that tell a distance (next section).
6. **Reflected light is its own step.** It is the one most often lost.
7. **Change one thing, look at it beside the last version.** Check the file was really rewritten first.

## Where the form is followed, and where not
| What | Rule |
|---|---|
| Solids: arms, legs, fruit, boxes, bags | as the form says |
| Cloth | where the form says, along the drawn folds, one shape per plane |
| Hair | one simple shape per lock, root to tip. Never the form's own edge |
| **Face** | **never modelled.** Clean and almost flat: shadow of the hair, a small nose mark, perhaps the lower lid, a thin sliver at the chin towards the neck. No side plane. The neck carries the shade |
| Casts that show a distance (leaf on fruit, hat on hair, belt and bag on legs) | always kept, drawn clear of what casts them. Before removing a shadow, ask what distance it tells |
| Skin in shade | warm: overlay orange. Never grey, never cold |
| Second light | bold planes on far edges with open air behind, pointed at both ends, inside the shade, always darker than the light. No cold light where the surroundings are not cold: another surface gives its own colour. None on face, ear, peel, leaf |

## Brief for the line art
- Closed lines. Gaps under 3 px on straps and knots get closed before filling.
- Fine contours, tapered, thinner on skin and hair. Fine line art carries more form than heavy.
- Lower lids drawn. Same part names on every character.

## Order
1. **Regions.** `scripts/clean.ts` if there are grey fills (never change it after numbering), `scripts/new.ts`, patch sheet, names by number, `scripts/name.ts`, until `show=pools&named=1` has no red "?" and no leak. Each part gets a material (`kind`) and a height in the stack (`z`).
2. **Light and value plan.** Four to six thumbnails in `<name>-plans.ts` that differ in more than hue; someone with taste picks one. State light, focus and `values` (which parts are dark, mid, light). **Gate.**
3. **Blockout.** The figure as a mesh in the drawing's own view. No shade before it stands. [How](form-guide.md).
4. **Form guide and shadow design.** Draw every piece's shadow shapes over the guide, biggest planes first, then deep, half and lit. [How](form-guide.md). **Gate**, and `view=masks`: it must read as a drawing.
5. **Casts.** Near ones from the list (`casts`), far ones drawn. A cast must reach past the shade of anything closer.
6. **Second light.** Tone `B` on every far edge of the design. The gate lists the parts that have none. **Gate.**
7. **What the design does not cover:** facets and tones for small pieces, hair by lock, bevels, children that inherit.
8. **Face and eyes.** The most time, the strongest contrast, protected ink, brows under the hair.
9. **Materials and lights.** Automatic by `kind`. Orange peel has no round glint; metal darkest beside brightest.
10. **Piece by piece.** `scripts/review.ts name dir piece:box …`: line art, colour, shadow design and grey of one piece. Does every plane follow a line? Does it turn? Does it read in grey? Fix the worst, repeat, until every piece was looked at alone.
11. **End.** Gate, `scripts/value.ts`, lineup, `pnpm check`, crops at 200% of head, hands, accessories.

## What the renderer does
| # | Pass | Rule |
|---|---|---|
| 1 | Flats | three value groups apart. `kind`: skin hair cloth pale dark leather plastic glass peel leaf metal flat |
| 2 | Hue | slow gradients; hair bands turn the hue and hardly move the value |
| 4 | Planes | the shadow design, or the mesh, or planes from line to line, in that order. Cut into straight runs |
| 5 | Edges | hard. A band of richer colour where a soft form starts to turn (scattering); darkest just behind the edge, then lighter towards the far side |
| 6 | Deep shade | beside a caster, in folds. Black only under what stands well off |
| 7 | Materials, second light | by `kind`; reflected light as planes with a darker inner step, capped below the light |
| 8 | Face | drawn eyes, blush, brows |
| 9 | Line | black at silhouettes and between front and back; inside one form a darker step of its own colour |
| 10 | Air | tints by multiplying, never lifts a dark; depth softens what lies behind; orange overlay on shaded skin; grain |

Shade is a colour multiplied on the base: warm colours go through rose, cool ones through blue.

## Accessories
- Keep every drawn hole and tooth; check them at 200%.
- One spark per metal piece. Darkest metal tone next to the brightest.
- `keyline`: a thin pale line for small props that overlap the figure. Leave out buttons and straps.

## Critic, optional
A second model gets the references, the line art, the render, the value and mask views, the declared light, and the operations the maker can execute. Each finding must say where, what, evidence, the exact change, and how to see it is fixed. Measure every claim before acting.

## Known limits
- Proven end to end on one drawing. The rules above are trial until they help a second one.
- The blockout and the shadow shapes are typed by the agent; that is the main cost, and judgement.
- One pose, one angle. Cannot invent tapered lines the artist did not draw.
