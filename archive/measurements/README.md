Pixel measurements behind the numbers in `docs/`. Kept as a record: they sample fixed coordinates on reference images that are not in this repository, and need `pngjs`.

`measure` splash reference, first pass. `m5` claims in review round 1. `m6` claims about the headphones character. `m7`, `m8` the head to head. `shade-check` the shade rule against the reference blue.

`placement` where typed shapes missed the lines, before the tools. `strokes`, `sheet` the first line map and the test of whether an agent can read numbered lines; now `src/tools/strokes.ts` and `sheet.ts`. `value` luma, three groups and local contrast of images, head box against the rest: `node archive/measurements/value.mjs out.png image.png:x,y,w,h …`. These four need `playwright`, not `pngjs`.
