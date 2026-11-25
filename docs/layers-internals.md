# Layers, inside

How paint steps become the file described in [`layers.md`](layers.md), what was checked, and the `.clip` format.

**Status.** The first layout, one layer per paint step, was opened by the owner of this repository in CLIP STUDIO PAINT 5.0.1 with the right modes, folders and names ([details](#the-clip)). The layout since is by part, with clipping, nested folders and color dodge; the owner went through three rounds of it and approved it ("This works").

```sh
node scripts/layers.ts maren out --clip --template mine.clip  # into your own canvas (same size: added on top)
node scripts/layers.ts maren out --steps                      # the first layout: one layer per paint step
node scripts/clipcheck.ts out/maren.clip --tree --render out/render.png
```

## How a step becomes a layer

First every paint step is recorded as a layer over the whole figure (`--steps` stops here). Then `arrange.ts` cuts the steps along the parts, which never share a pixel, and merges them as operations (x becomes a·x + b), not as pictures, so a multiply keeps a colour of its own and does not carry what lies under it.

The renderer paints into one float RGB buffer with two operations: `to` (mix towards a colour) and `times` (multiply by a factor). Each call now carries the name of its step (`on("shade")`). Recording, a loop that does several steps per pixel runs once per step, each time doing only that step, and the buffer is kept before and after. Nothing else changes: without `layers=1` every call runs as before, and the render is **pixel-identical** to the one before this work (checked on the goggles at k=2: difference bounding box none).

From before, after, and how strongly the step touched each pixel, a layer is fitted in the mode that says what the step does. Every fit is exact, it only chooses how to say it:

| Step does | Layer | Pixel |
|---|---|---|
| darkens (`times` below 1) | multiply | colour = the factor, alpha = how strongly; one shade over many parts has one colour per part |
| lifts and darkens at once (a warm tint) | multiply, then color dodge (`…, lift`) | the darkening channels multiply, the lifting ones divide: both are factors |
| mixes towards a colour | normal | colour = the colour it mixed towards, alpha = how much |
| grain | linear light | 127.5 is no change; lower the opacity to calm it |
| orange on shaded skin | overlay | the renderer's own overlay colour, alpha = strength |
| drawn on the canvas (face, lines, eye lights) | normal | drawn alone on a clear layer; if that layer over the picture does not give the same picture (a drawing that uses `lighten`/`darken`), fitted from before and after instead |

What a mode cannot say stays exact in a normal layer next to it, named `… (rest)`; on these three drawings there are none. Steps are fitted between values clamped to 0..255, because a stack of 8-bit layers clamps at every layer while the renderer clamps only at the end: so where a step goes past white and a later one comes back, the stack still lands where the render does.

## Checked

On renders at k=2, 26 November 2026, the new layout:

| Check | Maren | Goggles (`rig`) | Headphones (`tape`) | Bell (`bell`) |
|---|---|---|---|---|
| Render without layers vs before | identical (also `visor`) | identical | | |
| Folders with layers, layers with paper | 17, 128 | 13, 84 | 17, 91 | 16, 77 |
| Clean | yes | yes | yes | yes |
| Stack vs render, whole image: pixels off by more than 2, 8 | 1.93%, 0.49% | 1.11%, 0.53% | 0.64%, 0.49% | 0.82%, 0.66% |
| More than 3 px inside the figure: off by more than 2 | 2.13% | 0.78% | 0.12% | 0.24% |
| .clip read back: rule problems | 0 | 0 | 0 | 0 |

Maren's PSD composited by **psd-tools** (an independent reader) vs our own composite: max 3.

**What the order costs.** Warmth of the light side moved from every part into one Tint and Glow over everything, so lit planes and highlights get it too: up to 7 levels there on Maren. Swept crumbs of up to 17 px differ more (up to 116 on a few pixels next to lines). One 104 px piece of a hair light is 11 off, not explained. The bell's eyes are drawn with `lighten`, fitted as normal.

**The one difference by design:** the renderer paints the background over the anti-aliased outer edge of the line art; in the stack the line art lies on top of the background, as an artist keeps it. So the outer contour's edge pixels are a little darker in the stack (up to 58 levels on single edge pixels, up to 148 on loose hair strands that stand alone on the background in `tape` and `bell`, nowhere else). Everything more than 3 px inside the figure is within 4 levels, and 99.9% of it within 2 (the rest is rounding: each of about forty layers is 8 bit).

## The .clip

There is no public spec. The format was put together from two places and then confirmed in CSP; the three are kept apart here.

**Checked by this repository on 22 files saved by CSP** (the samples of `al3ks1s/clip-tools`, `dobrokot/clip_to_psd`, `wamsoft/clipparse`, `nodamushi/clip_layer_rename`; fetch them to re-run `node scripts/clipcheck.ts *.clip`):
- The container: `CSFCHUNK`, then `CHNKHead` (whose second u64 is the position of `CHNKSQLi`), one `CHNKExta` per pixel store (40-byte id `extrnlid` + 32 hex digits), `CHNKSQLi` (a whole SQLite database), empty `CHNKFoot`; all big-endian. `ExternalChunk(ExternalID, Offset)` gives every store's position. 0 problems on all 22 files.
- **Clipping**: a base and the layers clipped to it are one group that keeps the base's alpha. Measured on `Illustration-Referece.clip` against the preview CSP stored in it: 0 error on 19,569 soft pixels; the usual formula (clipped layer times base alpha, over the canvas) is off by up to 64. `LayerClip` is 1. Folders with a normal mode have `LayerComposite` 0.
- A tile is 256x256, zlib: first the alpha plane row by row (65,536 bytes), then B, G, R, alpha per pixel. Straight alpha. On the files without text, vector or adjustment layers (`Illustration-Pixel`, 24% of its canvas drawn on, and `Illustration-Locks`) the layers composited from the tiles equal the preview CSP stored, **max difference 0**.
- **The tile checksum**: Adler-32 of the 4-byte little-endian zlib length and the zlib bytes. It matches all 2,448 non-zero checksums in these files (51 are 0). The writer writes it, so it writes what CSP writes.
- Storage classes: `Offscreen.BlockData` is a BLOB, `ExternalChunk.ExternalID` TEXT, in every file.
- Folder rows: `LayerFolder` 17 (folder, closed) or 1, `LayerType` 0, pass-through is `LayerComposite` 30 (found closed and pass-through as written here). In all 14 files with both, CSP writes folders with `LayerMasking` 32 and the three colour-type columns NULL; a folder's pixel store has the same attribute as a raster layer's.
- The validator finds the faults that broke files for others: on `Illustration-copy.clip`, a copy written by another tool, it reports 6 problems, among them `MipmapCount` 2 for a chain of 4 (the fault that made CSP crash).

**Learned by others by opening their files in CSP** (wamsoft/clipparse `docs/WRITE_TEST*.md` and `CLIP_FORMAT.md`, CSP 5.0.4; dreaifekks/csp-ai-enhancer `README.md`, CSP PRO 5.0.4; Aodaruma/clipfile-rs `docs/`):
- A layer copied from a raster row, with new ids and its own pixel store, opens and draws; so do folders made the same way, 19 blend modes, a resized canvas, and empty smaller mip levels (CSP redraws them).
- `ExternalID` as BLOB or `BlockData` as TEXT: layers open transparent. A wrong non-zero checksum: "layer image or mask is damaged". `MipmapCount` not equal to the chain: CSP crashes while loading. An empty folder without a mipmap: crash. A stale `CanvasPreview`: the old picture shows until the first redraw. Thumbnails: CSP redraws them when the store is missing and `Thumbnail*NeedRefresh` is 50.
- CSP opens a layered PSD with names, folders, blend modes, opacity and visibility.

**Opened in CSP by the owner of this repository:** Maren's file in the first layout (2048x3072, 90 layers and folders), in CLIP STUDIO PAINT 5.0.1 on macOS, 26 November 2026. It opens as expected: layer modes, folders and names are right. So the writer's rules hold in the program itself, not only in our checker. Not reported separately: painting on a layer and saving it again, a canvas injected with `--template`, other CSP versions, Windows and iPad.

When a drawing or the writer changes, look at four things:
1. It opens; the layer panel shows the folders as in the table above, closed; the canvas has the render's size.
2. The picture equals `render.png` (apart from the contour's edge) right after opening, at 100% and zoomed out.
3. `Shadow 1` is multiply, `Shadow lift` color dodge, `Grain` linear light, `Warm shade` overlay; Colour and Effects pass-through, the rest normal.
4. Paint on a `Shadow 1` outside the part: nothing shows, it is clipped. Change a colour in a `Base`: the shadows follow. Save, open again.

If a .clip fails, open the PSD in CSP and save it as .clip from there. The message CSP gives and which of the four points failed say what to fix.

## Into a canvas you work on

With `--template` pointing at a .clip of the same size as the render, nothing in that file changes: its layers keep their pixels bit for bit, and the stack goes on top in a folder `Agent layers`. Checked on a CSP file (`Illustration-Pixel`, 7 layers, with a layer mask): the 7 layers read back unchanged, 0 rule problems, every storage class as in the original, and the new preview equals the composite. A file of another size can only be used when it is an empty new canvas, which is resized; otherwise the script stops and says so.

## Code

| File | What |
|---|---|
| `src/layers/steps.ts` | every step: name, folder, mode |
| `src/layers/record.ts` | the recorder in the browser, and the fit |
| `src/layers/arrange.ts` | from paint steps to the illustrator's file, and what clean means |
| `src/layers/linegroups.ts` | whose line a pixel of ink is |
| `src/bold/eye.ts` | the painted eye, in pieces |
| `src/layers/stack.ts` | the stack, its tree and its composite, with CSP's formulas |
| `src/layers/psd.ts` | the PSD writer |
| `src/layers/clip.ts` | the .clip writer: new canvas or injected |
| `src/layers/clipread.ts` | the .clip reader, composite and rule checks |
| `src/layers/template/` | the empty CSP canvas the writer copies from (wamsoft/clipparse, MIT) |
| `scripts/layers.ts`, `scripts/clipcheck.ts`, `scripts/layerview.ts` | the commands: export, read back, look |

Sources, read for this work: [wamsoft/clipparse](https://github.com/wamsoft/clipparse) 322a273 (format notes and CSP test log), [Aodaruma/clipfile-rs](https://github.com/Aodaruma/clipfile-rs) bd88467 (`docs/format-analysis.md`, `docs/writing.md`), [dreaifekks/csp-ai-enhancer](https://github.com/dreaifekks/csp-ai-enhancer) 7a80c19 (what opened in CSP), [dobrokot/clip_to_psd](https://github.com/dobrokot/clip_to_psd) e8db68c, [al3ks1s/clip-tools](https://github.com/al3ks1s/clip-tools) e1d3d7e, [nodamushi/clip_layer_rename](https://github.com/nodamushi/clip_layer_rename) 83b01db (sample files). No code was copied; the writer and reader here are new.
