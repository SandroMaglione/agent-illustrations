# Template

`emptyimage.clip` is a new, empty 1600x1200 canvas saved by CLIP STUDIO PAINT: paper, one raster layer, nothing else.
`src/layers/clip.ts` copies its rows to make every layer and resizes the canvas, so only columns whose meaning is known
are ever written. It comes from [wamsoft/clipparse](https://github.com/wamsoft/clipparse) (`samples/emptyimage.clip`),
MIT licence, see `LICENSE-clipparse`.

Any other new canvas saved by CSP works the same: `node scripts/layers.ts <drawing> <dir> --clip --template mine.clip`.
