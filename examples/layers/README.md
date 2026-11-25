# The goggles drawing as layers

Exported before Maren was merged in; the render has changed slightly since (cooler hair shade, no light at the picture's border).

Made with `node scripts/layers.ts rig out --clip --k 1`, at half the usual scale (1086x1448) to keep the repository small; `--k 2` gives 2172x2896.

- `rig.clip`: open in CLIP STUDIO PAINT. 78 layers and folders on CSP's own paper; it reads back with 0 rule problems (`node scripts/clipcheck.ts examples/layers/rig.clip --tree`). Not yet opened in CSP: what to look at is in [`docs/layers.md`](../../docs/layers.md#the-clip).
- `rig.psd`: the same stack as PSD. CSP, Photoshop, Krita and others open it with folders and blend modes; in CSP, save it as .clip from there.
- `render.png`: the render the layers come from. `stack.json`: every layer's name, folder, mode and box, and the check.
