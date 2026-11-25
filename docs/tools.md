# Tools

How shapes are placed and checked. Code in `src/form`, `src/bold`, `src/tools` and `src/splash`. In use now: the form stage ([how](form-guide.md)), then regions, facets, hair, checks. `say` sentences (`band`, `warp`, kits) still work and draw the older drawings. Why they exist: [`findings.md`](findings.md). Research with sources: [`research-precision-tools.md`](research-precision-tools.md).

## Principles
1. **Name things, do not measure them.** Point at line 41, right side. Never at 474,150.
2. **Big planes first, accents second, lights last.** References use a few large shadow masses, not a wedge per fold. Count the lights before calling a part done: the first pass always has too few.
3. **A shadow is a line plus a fill.** Draw the missing boundary between two named points, fill one side. Its ends sit on ink by construction.
4. **An edge is ON a line, FREE, or a TIP.** Running beside a line at 2 to 6 px is a fault.
5. **Children live inside parents** (`in`). Deep shade cannot leave its shadow.
6. **Every tool returns a number**, and says so when it did nothing (DEAD), filled everything (LEAK) or could not find its place.
7. **One scale.** Lines, shapes and eyes are worked out at k=2 and enlarged, so no size of render can change a shape.

## Tools
| Tool | Say | Gives |
|---|---|---|
| Line map | nothing | every drawn line numbered, frozen per drawing (`strokes.ts`) |
| Sheet | `?v=sheet&box=x,y,w,h&z=4` | crop with numbers and tenths; `show=shapes` colours every named shape |
| `band` | `band s388[0..1] d 0 14 0` | shadow on one side of a line, with a width profile |
| `line` | `line A ~.1 B > C` | the missing boundary, filled on C's side |
| `run` | `run s1[0..1] s2[1..0] ~.2` | closed outline of line stretches and free curves |
| `fill`, `all` | `fill s1@.5:s2@.5:.5` | one bucket patch (it does not run through open lines), a whole part |
| `flow` | `flow s29[0..1] s35[.2..1] .4 0 .3 0` | tapered strand running between two lines: hair, sheen, folds |
| `warp` | `warp A B \| 0,.2! .5,.3 1,.6! …` | a free shape drawn in the space between two lines, with corners |
| Lock kit | `lock("bang", "s29", "s35", { side: ["b", .4], ring: [.3, .09], lit: .4 })` | what every lock of hair carries: toothed side plane, root, tip, piece of the ring, lit strand, hairs, deep shade (`shapes.ts`) |
| Patch sheet | `?v=sheet&show=pools&list=1` | every closed patch numbered before it has a name; `named=1` shows the result |
| Freeze | `node scripts/freeze.ts name` | writes the line numbers of a new drawing, once |
| Name | `node scripts/name.ts name` | patch numbers in `<name>-names.txt` to region clicks |
| Thumbnails | `v=thumbs&who=name` | every plan in colour, three values and postage-stamp size, with the focus against the rest |
| Look, side, pixel | `scripts/look.ts`, `side.ts`, `pixel.ts` | crops of one render, comparisons, luma at points |
| Faults | `v=faults&who=name` | the lint as a picture |
| Forms | `forms: [{ on: ["vest"], by: "patch", turn: 0.35 }]` | turned and lit planes by themselves; `turn` 0 late to 0.5 early, 1 none (`bold/planes.ts`); `to` sets the direction across a limb |
| Hair | `hair: [{ on, root, tip, ring, shade }]` | every lock in its own axes (`bold/locks.ts`); `shade: 0` keeps only the hue bands |
| Depth | `depth: { tail: 0.45 }` | softer, paler, bluer at the back |
| Clean | `node scripts/clean.ts in.png out.png` | grey fills to paper, before numbering |
| Wedge | `wedge s12 away 14 .25` | a fold with straight runs and pointed ends |
| Solids | `solids: [{ on: ["armL"], tube: "484,360,44 466,390,32" }, { on: ["fruitA"], ball: "512,648,74" }]` | the base shade without a blockout; with one, it names the parts that turn round |
| Gate | `node scripts/gate.ts name` | values per stage and group against the plan, and second light on far edges; exit 1 on a miss |
| Facets | `?v=sheet&who=name&show=facets&part=legR` | every facet of a piece, numbered (`tools/facets.ts`) |
| Tones | `node scripts/tone.ts name` | facet numbers in `<name>-tones.txt` to points in `<name>-tones.ts`; `tones` in the drawing |
| Layers | `node scripts/layers.ts name dir --clip` | the render as a layer stack: PSD, `.clip` (new canvas, or added to one of the same size with `--template`), PNGs, and how closely the stack gives the render back ([how](layers.md)) |
| Clip check | `node scripts/clipcheck.ts file.clip --tree` | a `.clip` read back: the rules CSP enforces, the layer tree, its layers composited against its preview |
| Review | `node scripts/review.ts name dir piece:x,y,w,h …` | line art, colour, shadow design, grey of each piece |
| Value | `node scripts/value.ts out.png render.png:box:head` | greyscale and numbers beside the references |
| Second light | tone `B` (design or facets); automatic on undesigned edges with air behind | cold plane on the far side, peach on skin; a surface behind gives its own colour instead |
| Scatter | `scatter: ["bust"]` | round parts whose own shade starts with a band of richer colour |
| Brows, print | `brows: [{ d, color }]`, `print: ["flap"]` | eyebrows; parts whose inner lines are printed |
| Lineup | `node scripts/lineup.ts out.png render.png head cx,cy` | the drawing between the references, colour and grey |
| Light | `light: { fall: [.64, .77], up: .58 }` in the drawing | one light; cast shadows, rims, `turn`, `ball`, `away`, `warp!` all ask it (`light.ts`) |
| `away` / `near` | `band s495 away 0 18 0` | the side away from the light, thinner where the line runs along it |
| `turn`, `ball`, `crest` | `turn A B`, `ball l r t b` | shaded side of a tube or a ball, lit cap of a ball, computed |
| `warp!` | same as `warp` | 0 across is always the lit side |
| Cast, deep | `c("frame", "hairF", 120, .5)` | fall distance, and the share next to the caster that is deep |
| Bevel | `bevels: [{ on, w, lit, deep }]` | lit and shaded rim: thickness. Not where something lies on top (`bevel.ts`) |
| Inherit | `inherits: [[["btn"], ["collar"]]]` | trim, buttons and piping take the shade of what they lie on (`inherit.ts`) |
| Cloth kit | `fold(id, part, line, w)`, `seam(...)` | shade, deep, lit ridge, sides chosen by the light |
| Focus | `focus: { x, y, rx, ry, dim }` | values close up away from it; turns on the value checks |
| Value sheet | `view=value` | three groups, squinted |
| `ring` | `ring A B C ^ P .3 .5 .3 ~.2` | hair highlight: scallops below, calm edge above |
| Eye rig | lash, lid, iris, crease lines | iris fitted to the drawn arcs; every layer placed in shares of the eye (`eyes.ts`) |
| Cast v2 | caster, receiver, distance | moved along the light, edge calmed in proportion to the distance (`cast.ts`) |
| Blockout | `loft`, `tube`, `ball`, `strip`, `drape`, `box`, `solve` (`src/form/mesh.ts`) | the figure in 3D in the drawing's view, settled onto the drawn outlines (`settle.ts`), with a fit table, turntable and a viewer (`scripts/form.ts`) |
| Form guide | `node scripts/guide.ts name dir zoom step piece:x,y,w,h` | what the blockout says, in colours under the line art; `--plain` without the line art |
| Shadow design | `sleeveL \| S \| x,y x,y~ …` | S turns away, X cast, H half, D deep, L lit, R lighter inside a shade, B second light, C cut back; `~` soft point, `+` adds (`bold/shadows.ts`) |
| Finish | `node scripts/finish.ts name render.png scale head cx,cy` | the mandatory last check: colour, greyscale, three values beside the references; fails when `apart` pairs are too close |
| Apart | `apart: [["hairF", "face", 65]]` | big neighbours and how far their medians must differ in grey |
| Noise | `node scripts/noise.ts file:x,y,w,h:scale …` | grain per brightness: strength, coarseness, colour, specks |
| Force | `force: [{ label, d, over }]` | a patch the open lines gave to the wrong part, also in bucket mode |
| Highlight | tone `W` in the shadow design | hair highlight, one block per lock |
| Seal | nothing | lit slivers under 4 px between shadow and line are closed and counted (`seal.ts`) |
| Lint | `pnpm check tape` | slivers, edges beside lines, worst places with coordinates (`lint.ts`) |

## Not built
- Automatic first proposals for shadow shapes from the guide; snapping of typed shapes to lines.
- Checks that fail when casts, scattering or a material reflection disappear.
- A model sheet by part kind (hand, shoe, buckle), and a blockout kit for common figures.
- Mouth, nose mark, prints, gradients, washes, brows and eyes of `visor` are typed coordinates.
- `tape`, `bell` and `twin` have no declared light or focus; only `visor` (not published) has a blockout, a value plan and a shadow design; `scripts/new.ts` writes starting files for all three.
