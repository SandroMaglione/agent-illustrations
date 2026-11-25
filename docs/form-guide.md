# From line art to shadow shapes

The stage that made the largest difference. A 3D model of the figure is built **to understand it**, not to render it. Straight mesh shading looks soft and blobby and ruins hair; used as a guide under the line art it makes the agent see where planes turn.

## 1. Blockout: `src/splash/<name>-form.ts`
`scripts/new.ts` writes a starting file. Same view as the drawing: x right, y down, z towards the viewer, in line-art px. Every form is a mesh with a name and a group (the regions it stands for).

| Use | For |
|---|---|
| `loft(sections)` | limbs, torso, sleeves, shoes: each section is left outline, right outline, depth of its middle, half depth |
| `tube`, `ball`, `torus`, `box`, `panel` | fingers, fruit, rings, crates, plates |
| `strip(edgeA, edgeB)` | ribbons, straps, visors, leaves, hair |
| `drape(outline, on)` | cloth over the body: spans hollows instead of copying them |
| `solve(marks)` + `place` | the head: a standard head posed on the drawn eyes, nose, mouth, chin, ear |

The file exports `parts`, `groups` (group name to region names), `pivot` (turntable centre), `bones` (left and right lengths to compare), `light` and `head`. Order: read outlines off grid crops; head pose; torso; limbs by joints in 3D; props; cloth; hair last.

- **Depth is judged, outlines are not.** Typed outlines are off by 3 to 10 px. Do not retype them: `settle` pulls each visible edge onto the drawn border and never touches depth.
- **Limb lengths fix most of the depth.** Left and right must be equally long in space (within about 6%).
- **Foreshortening:** rings of a form that comes towards the viewer tip back; `loft` computes it. Set `tip: 0` for cuffs and bands that should not.
- **A wrong depth shows as the wrong form in front.** Read the fit table's "shows instead" column.

```sh
pnpm dev &                                                            # needed once, for the region map
node scripts/form.ts name output/form/a 4 head:385,0,330,330          # fit table, fit.png, clay.png, turn.png, view.html
```
Done when the right form shows on at least 95% of the figure, limbs agree, and it reads as a solid figure in `turn.png` and in the rotatable `view.html`.

## 2. Form guide
```sh
node scripts/form.ts name output/form/a --field                       # facing, ray casts, enclosure per pixel
node scripts/guide.ts name output/form/g 5 20 sleeve:295,395,190,190  # the guide under the line art, with a grid
```
The first command writes `public/wip/<name>-field.bin`; set `field: "/wip/<name>-field.bin"` in the drawing. Run it again whenever the mesh, the regions or the light change.

| Colour | Says |
|---|---|
| blue | turns away from the light |
| pale blue | half tone |
| violet, pale violet | cast shadow, near and far |
| teal | far side: the second light belongs here |
| pale yellow | faces the light |

## 3. Shadow design: `src/splash/<name>-shadows.ts`
A starting file comes from `scripts/new.ts`. One line per shape: `parts | tone | x,y x,y~ x,y …`, later lines on top. `~` makes a soft point. `+` in front adds to a part's own shading, otherwise the design replaces it.

| Tone | Means |
|---|---|
| `S` | turns away (gets the scattering band on skin, white, cloth) |
| `X` | cast shadow (hard, no band) |
| `H` `D` | half tone, deep shade |
| `L` `C` | lit plane, light cut back in |
| `R` | a lighter step inside a shade |
| `B` | second light along the far edge, with its own darker inner step |
| `W` | hair highlight: one clean block per lock, wavy below, flat in colour |

Per piece, in this order: the big turn (`S`), what is cast on it (`X`), half tone beside the turn, deep in folds and under overlaps, lit plane, **`B` on every teal edge with air behind it**. Run polygons past the outline: they are clipped to their part. Put each free edge on a drawn line, or cross a plane cleanly; never 2 to 6 px beside a line.

Taken from the mesh as it is (`formed`, `meshCasts` in the drawing): only simple solids and long casts. Never `face`, never hair, never metal. A patch that open lines gave to the wrong part (a strand of hair read as cheek) is moved with `clicks.move` first, or every shadow on it is wrong.

## What was tried and dropped
1. Mesh shading straight into the render: right, soft, blobby, hair ruined.
2. Fold ridges and facet tilts bending the mesh: noisy steps, edges no artist would draw.
3. Inflated surfaces from outlines (an earlier project): cloth turned to latex.
4. Tidy casts pulled tight under their caster: depth was gone.
