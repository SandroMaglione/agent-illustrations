# Layers to open

## Maren (`maren/`)

`maren.clip`: 2048x3072, 128 layers, 27 MB, organised as [`docs/layers.md`](../../docs/layers.md) says. Made with `node scripts/layers.ts maren out --clip`, which also writes the PSD (not kept here). `stack.json`: every layer's name, folder, mode and box, and the check.

## The goggles drawing: the first layout

One layer per paint step over the whole figure, as `--steps` still writes it. Kept to compare; the layout in use is Maren's.

Exported before Maren was merged in; the render has changed slightly since (cooler hair shade, no light at the picture's border).

Made with `node scripts/layers.ts rig out --clip --k 1`, at half the usual scale (1086x1448) to keep the repository small; `--k 2` gives 2172x2896.

- `rig.clip`: open in CLIP STUDIO PAINT. 78 layers and folders on CSP's own paper; it reads back with 0 rule problems (`node scripts/clipcheck.ts examples/layers/rig.clip --tree`). This file itself was not opened in CSP; it is written by the same code as Maren's.
- `rig.psd`: the same stack as PSD. CSP, Photoshop, Krita and others open it with folders and blend modes; in CSP, save it as .clip from there.
- `render.png`: the render the layers come from. `stack.json`: every layer's name, folder, mode and box, and the check.
