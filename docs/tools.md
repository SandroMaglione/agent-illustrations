# Tools

How shapes are placed and checked. Code in `src/tools` and `src/splash`. Why they exist: [`findings.md`](findings.md). Research with sources: [`research-precision-tools.md`](research-precision-tools.md).

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
| Facets | `?v=sheet&who=name&show=facets&part=legR` | every facet of a piece, numbered (`tools/facets.ts`) |
| Tones | `node scripts/tone.ts name` | facet numbers in `<name>-tones.txt` to points in `<name>-tones.ts`; `tones` in the drawing |
| Review | `node scripts/review.ts name dir piece:x,y,w,h …` | line art, colour, shadow design, grey of each piece |
| Value | `node scripts/value.ts out.png render.png:box:head` | greyscale and numbers beside the references |
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
| Seal | nothing | lit slivers under 4 px between shadow and line are closed and counted (`seal.ts`) |
| Lint | `pnpm check tape` | slivers, edges beside lines, worst places with coordinates (`lint.ts`) |

## Not built
- A layer stack in the engine: shapes have names and parents, not layers.
- Snapping typed polygons to lines, automatic side proposals, a model sheet by part kind.
- Mouth, nose mark, prints, gradients, washes and floating marks are still typed coordinates.
- Declared light, focus and value checks exist only for `rig`. `tape` uses named lines; `bell` and `twin` are still typed polygons.
