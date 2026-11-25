# The process

Colour clean line art so that the result could stand beside the target references: crisp, blocky, value first, rich shadows, real materials. The renderer is `src/bold`, the form tools `src/form`, everything else `src/tools` ([list](tools.md)). One drawing is a few data files in `src/splash`. Why each rule exists: [`findings.md`](findings.md). Every note ever given: [`lessons.md`](lessons.md).

**Two judges.** `node scripts/gate.ts name` measures value and second light after every stage; `node scripts/finish.ts …` puts the result beside the references in colour, greyscale and three values, and fails when big neighbours are too close. A FAIL means stop and fix. A pass means **look**: both have passed on a wrong picture, because the plan they check was wrong. References stay local (`public/refs`); without them `finish.ts` shows the drawing alone.

## The steps at a glance
| | Step | Done when |
|---|---|---|
| 1 | Regions | every patch has a name, no leak |
| 2 | Light and value plan, `values`, `apart` | three values read at stamp size; **gate** on flats |
| 3 | Blockout | right form on 95% of the figure, limbs equal, solid from all sides |
| 4 | Form guide, shadow design | `view=masks` reads as a drawing; **gate** |
| 5 | Casts | every overlap casts, distances are told |
| 6 | Second light | a plane on every far edge with air behind; **gate** |
| 7 | Small pieces, hair, children | no plain facet left by accident |
| 8 | Face and eyes | clean, artist's lines untouched, brightest and sharpest place |
| 9 | Materials, lights, air, grain | each material answers in its own way |
| 10 | Review, piece by piece | every piece was looked at alone |
| 11 | **Finish: greyscale** | sheet looked at and shown; `finish.ts` and gate pass |
| 12 | Alarms | `pnpm check`, crops at 200% |

Lengths are line-art px; sizes that matter are shares of head height.

## Principles
1. **Value before everything.** If it does not read in greyscale, nothing later saves it. Look at grey after every stage.
2. **Form before shade.** Know the solid behind every piece before drawing a shadow on it. An arm is a cylinder first; folds, casts and facets come on top.
3. **The form says where, the drawn line says how.** Shade falls where the form turns; its edge runs along the artist's nearest line.
4. **Simple beats correct.** One clean shape per plane or lock. A right but uneven edge is worse than a simple one.
5. **The face is an exception**, and so are the shadows that tell a distance (next section).
6. **Reflected light is its own step.** It is the one most often lost.
7. **What was approved must not vanish.** Each new system here quietly dropped something the one before did. Compare with the last approved render piece by piece, and give every approved thing a check that fails without it.
8. **Change one thing, look at it beside the last version.** Check the file was really rewritten first.
9. **Colour follows value.** Moving a mass in value drags its hue (blonde went orange): take the hue back separately, keep the value.

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
2. **Light and value plan.** Four to six thumbnails in `<name>-plans.ts` that differ in more than hue; someone with taste picks one. State light, focus, `values` (which parts are dark, mid, light) and `apart` (which big neighbours must differ, and by how much). The hair is a mass of its own: well under the face, over the dark clothes. **Gate.**
3. **Blockout.** The figure as a mesh in the drawing's own view. No shade before it stands. [How](form-guide.md).
4. **Form guide and shadow design.** Draw every piece's shadow shapes over the guide, biggest planes first, then deep, half and lit. [How](form-guide.md). **Gate**, and `view=masks`: it must read as a drawing.
5. **Casts.** Near ones from the list (`casts`), far ones drawn. A cast must reach past the shade of anything closer.
6. **Second light.** The guide's teal says where. Tone `B` on every far edge of the design. The gate lists the parts that have none. **Gate.**
7. **What the design does not cover:** facets and tones for small pieces, hair by lock, bevels, children that inherit.
8. **Face and eyes.** In a file of its own (`<name>-face.ts`: what goes under the line in `face`, lights in `over`). The most time. **The artist's eye, nose and mouth lines stay: never redraw their shape.** Paint only between them: white with the lid's shadow, an iris in clear steps (dark top, spokes, two bright crescents, one large and a few tiny lights), teeth. Lips: a touch of red below and one highlight, no shape. Brows: one solid tapered shape, the hair's dark, faint where hair covers it. Crease and pencil marks inside an iris may be cleared.
9. **Materials, lights, air, grain.** Automatic by `kind`. Hair highlights are drawn, one block per lock, wavy below (tone `W`). Orange peel has no round glint; metal darkest beside brightest.
10. **Piece by piece.** `scripts/review.ts name dir piece:box …`: line art, colour, shadow design and grey of one piece. Does every plane follow a line? Does it turn? Does it read in grey? Fix the worst, repeat, until every piece was looked at alone.
11. **End, mandatory, every time a picture is shown to anyone.** `node scripts/finish.ts name render.png scale head cx,cy`, then **look at** `output/bold/finish-<name>.png`: colour, greyscale and three values beside the references. Is the head a mass of its own, framing a light face? Does the figure hold in three values without lines? Do big neighbours stand apart (`apart`, the script fails otherwise)? Then `gate.ts`. Show the greyscale together with the result. A change of any colour or shade means doing this step again.
12. `pnpm check`, crops at 200% of head, hands, accessories.

## What the renderer does
| # | Pass | Rule |
|---|---|---|
| 1 | Flats | three value groups apart. `kind`: skin hair cloth pale dark leather plastic glass peel leaf metal flat |
| 2 | Hue | slow gradients; hair bands turn the hue and hardly move the value |
| 4 | Planes | the shadow design, or the mesh, or planes from line to line, in that order. Cut into straight runs |
| 5 | Edges | hard. A band of richer colour where a soft form starts to turn (scattering); darkest just behind the edge, then lighter towards the far side |
| 6 | Deep shade | beside a caster, in folds. Black only under what stands well off |
| 7 | Materials, second light | by `kind`; reflected light as planes with a darker inner step, capped below the light |
| 8 | Face | irises and whites under the artist's line, blush, brows |
| 9 | Line | black at silhouettes and between front and back; inside one form a darker step of its own colour |
| 10 | Air | tints by multiplying, never lifts a dark; depth softens what lies behind; orange overlay on shaded skin; grain as measured on the references: fine, coloured, strongest in darks and mid tones and towards the far side of hair and dark cloth, nearly none on lit skin and white, loose specks in the turned parts |

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
