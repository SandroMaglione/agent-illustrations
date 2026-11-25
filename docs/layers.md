# Layers, PSD and CLIP STUDIO PAINT

The renderer paints one picture in about forty steps. With `layers=1` every step also comes out as a layer of a drawing program, so the result can be opened, picked apart and refined instead of being a flat image. The stack is written as a layered **PSD** and as a **.clip** for CLIP STUDIO PAINT (CSP), either as a new canvas or added to a canvas someone is working on.

```sh
node scripts/layers.ts rig output/layers/rig --clip                           # PSD, .clip, layer PNGs, stack.json, the check
node scripts/layers.ts rig output/layers/rig --clip --template mine.clip      # into your own canvas (same size: added on top)
node scripts/layerview.ts output/layers/rig                                   # view.html (switch layers, see one alone, play the stack) and sheet.png
node scripts/clipcheck.ts output/layers/rig/rig.clip --tree --render output/layers/rig/render.png
```

![Maren's layers: the stack growing folder by folder, then every step alone](../gallery/layers-maren.jpg)

The same for the goggles drawing: [layers-sheet.jpg](../gallery/layers-sheet.jpg).

## What comes out

Bottom to top, as in CSP's layer panel read upwards. Folders are pass-through, so a multiply inside still multiplies what is under the folder.

| Layer or folder | Mode | What it is |
|---|---|---|
| Paper | normal | white; in the .clip it is CSP's own paper layer |
| Background | normal | what `back` draws around the figure |
| **Flats** | normal | one layer per part (`hairF`, `face`, `jack`, …), opaque, no gaps: recolour a part, lock its transparency, select by it |
| **Colour** | normal | gradients, hair hue bands, washes |
| **Shading** | multiply, add | scatter at the turn, shade, darkest behind the edge, shade lifts, light side warmth, bounce, deep shade, darkest accents |
| **Materials and light** | normal, multiply | metal, sheen and pores, lit planes, rims, hair lights, gloss, highlights |
| **Second light** | normal | colour bleed, second light and its inner step |
| **Finish** | multiply, add, overlay, linear light | blush, air (warm and cool side), focus falloff, depth haze, warm shaded skin (orange overlay), brows, grain on neutral grey |
| Face and eyes | normal | irises, whites, lid shadows: under the line art |
| Line art | normal | the artist's lines, coloured as the renderer colours them |
| Eye lights | normal | what is drawn over the lines |
| Front | normal | what `front` draws |

A step that does nothing in a drawing gives no layer (`stack.json` lists the notes). With paper: Maren (`maren`, the same line art as `tape`, with the form guide) 84 layers, headphones (`tape`) 74, goggles 72, bell 62.

## How a step becomes a layer

The renderer paints into one float RGB buffer with two operations: `to` (mix towards a colour) and `times` (multiply by a factor). Each call now carries the name of its step (`on("shade")`). Recording, a loop that does several steps per pixel runs once per step, each time doing only that step, and the buffer is kept before and after. Nothing else changes: without `layers=1` every call runs as before, and the render is **pixel-identical** to the one before this work (checked on the goggles at k=2: difference bounding box none).

From before, after, and how strongly the step touched each pixel, a layer is fitted in the mode that says what the step does. Every fit is exact, it only chooses how to say it:

| Step does | Layer | Pixel |
|---|---|---|
| darkens (`times` below 1) | multiply | colour = the factor, alpha = how strongly; one shade over many parts has one colour per part |
| lifts and darkens at once (a warm tint) | multiply, then add (`…, lift`) | the darkening channels multiply, the lifting ones are added on top |
| mixes towards a colour | normal | colour = the colour it mixed towards, alpha = how much |
| grain | linear light | 127.5 is no change; lower the opacity to calm it |
| orange on shaded skin | overlay | the renderer's own overlay colour, alpha = strength |
| drawn on the canvas (face, lines, eye lights) | normal | drawn alone on a clear layer; if that layer over the picture does not give the same picture (a drawing that uses `lighten`/`darken`), fitted from before and after instead |

What a mode cannot say stays exact in a normal layer next to it, named `… (rest)`; on these three drawings there are none. Steps are fitted between values clamped to 0..255, because a stack of 8-bit layers clamps at every layer while the renderer clamps only at the end: so where a step goes past white and a later one comes back, the stack still lands where the render does.

## Checked

Every number here is from this repository's scripts, on renders at k=2. Run again on 2026-11-26, after `main` with Maren was merged in.

| Check | Maren (`maren`) | Goggles (`rig`) | Headphones (`tape`) | Bell (`bell`) |
|---|---|---|---|---|
| Render without layers vs `main` | identical (k=3, also `visor`) | identical (k=2) | | |
| Layers, with paper | 84 | 72 | 74 | 62 |
| Stack composited (CSP formulas, 8 bit) vs render: pixels off by more than 8 | 0.460% | 0.513% | 0.470% | 0.582% |
| … more than 3 px inside the figure: largest difference, share off by more than 2 | 4, 0.060% | 3, 0.029% | 3, 0.008% | 3, 0.009% |
| .clip read back by `clipread.ts`: rule problems | 0 | 0 | 0 | 0 |
| .clip layers composited from its own tiles vs the preview written into it | max 3 | max 2 | max 2 | max 2 |

From the first round, not run again: the PSD composited by **psd-tools** (an independent reader) was off by more than 8 on 0.518% (goggles) and 0.475% (headphones) of pixels; the storage class of all 166 .clip columns was the same as in CSP's template.

The bell, whose face is drawn with `lighten` and `darken`, takes the fallback for its face and eye lights.

**The one difference by design:** the renderer paints the background over the anti-aliased outer edge of the line art; in the stack the line art lies on top of the background, as an artist keeps it. So the outer contour's edge pixels are a little darker in the stack (up to 58 levels on single edge pixels, up to 148 on loose hair strands that stand alone on the background in `tape` and `bell`, nowhere else). Everything more than 3 px inside the figure is within 4 levels, and 99.9% of it within 2 (the rest is rounding: each of about forty layers is 8 bit).

## The .clip

There is no public spec and no CSP in this container, so the format comes from three places, kept apart here.

**Checked by this repository on 22 files saved by CSP** (the samples of `al3ks1s/clip-tools`, `dobrokot/clip_to_psd`, `wamsoft/clipparse`, `nodamushi/clip_layer_rename`; fetch them to re-run `node scripts/clipcheck.ts *.clip`):
- The container: `CSFCHUNK`, then `CHNKHead` (whose second u64 is the position of `CHNKSQLi`), one `CHNKExta` per pixel store (40-byte id `extrnlid` + 32 hex digits), `CHNKSQLi` (a whole SQLite database), empty `CHNKFoot`; all big-endian. `ExternalChunk(ExternalID, Offset)` gives every store's position. 0 problems on all 22 files.
- A tile is 256x256, zlib: first the alpha plane row by row (65,536 bytes), then B, G, R, alpha per pixel. Straight alpha. On the files without text, vector or adjustment layers (`Illustration-Pixel`, 24% of its canvas drawn on, and `Illustration-Locks`) the layers composited from the tiles equal the preview CSP stored, **max difference 0**.
- **The tile checksum**: Adler-32 of the 4-byte little-endian zlib length and the zlib bytes. It matches all 2,448 non-zero checksums in these files (51 are 0). The writer writes it, so it writes what CSP writes.
- Storage classes: `Offscreen.BlockData` is a BLOB, `ExternalChunk.ExternalID` TEXT, in every file.
- Folder rows: `LayerFolder` 17 (folder, closed) or 1, `LayerType` 0, pass-through is `LayerComposite` 30 (found closed and pass-through as written here). In all 14 files with both, CSP writes folders with `LayerMasking` 32 and the three colour-type columns NULL; a folder's pixel store has the same attribute as a raster layer's.
- The validator finds the faults that broke files for others: on `Illustration-copy.clip`, a copy written by another tool, it reports 6 problems, among them `MipmapCount` 2 for a chain of 4 (the fault that made CSP crash).

**Learned by others by opening their files in CSP** (wamsoft/clipparse `docs/WRITE_TEST*.md` and `CLIP_FORMAT.md`, CSP 5.0.4; dreaifekks/csp-ai-enhancer `README.md`, CSP PRO 5.0.4; Aodaruma/clipfile-rs `docs/`):
- A layer copied from a raster row, with new ids and its own pixel store, opens and draws; so do folders made the same way, 19 blend modes, a resized canvas, and empty smaller mip levels (CSP redraws them).
- `ExternalID` as BLOB or `BlockData` as TEXT: layers open transparent. A wrong non-zero checksum: "layer image or mask is damaged". `MipmapCount` not equal to the chain: CSP crashes while loading. An empty folder without a mipmap: crash. A stale `CanvasPreview`: the old picture shows until the first redraw. Thumbnails: CSP redraws them when the store is missing and `Thumbnail*NeedRefresh` is 50.
- CSP opens a layered PSD with names, folders, blend modes, opacity and visibility.

**Not checked: whether CSP opens these exact files.** That needs CSP. `src/layers/clip.ts` keeps every rule above, `clipcheck.ts` checks them on the result. What to look at when opening `rig.clip`:
1. It opens; the layer panel shows the folders as in the table above, closed; the canvas is 2172x2896.
2. The picture equals `render.png` (apart from the contour's edge) right after opening, at 100% and zoomed out.
3. `Shading/Shade` is multiply, `Finish/Grain` linear light, `Finish/Warm shaded skin` overlay, the folders pass-through.
4. Hide `Flats/hairF`: the hair goes white under its shading, nothing else moves. Paint on a layer, save, open again.

If the .clip fails, the PSD is the safe way: open `rig.psd` in CSP and save it as .clip. If the PSD opens and the .clip does not, the message CSP gives and which of the four points failed say what to fix.

## Into a canvas you work on

With `--template` pointing at a .clip of the same size as the render, nothing in that file changes: its layers keep their pixels bit for bit, and the stack goes on top in a folder `Agent layers`. Checked on a CSP file (`Illustration-Pixel`, 7 layers, with a layer mask): the 7 layers read back unchanged, 0 rule problems, every storage class as in the original, and the new preview equals the composite. A file of another size can only be used when it is an empty new canvas, which is resized; otherwise the script stops and says so.

## Limits

- Layers are pixels at the render's scale, not vector strokes, and not the renderer's shapes. Edit them like painted layers.
- A multiply layer follows when a flat is recoloured; a normal layer (lit planes, highlights) keeps its colours. The `… lift` layers and `(rest)` layers were fitted over these flats and are the least editable.
- Re-render after changing the drawing's data; the layers are not read back into the code.
- The background lies under the line art (see above). `cut` renders and the `masks`, `value`, `grey` and `regions` views have no layers.

## Code

| File | What |
|---|---|
| `src/layers/steps.ts` | every step: name, folder, mode |
| `src/layers/record.ts` | the recorder in the browser, and the fit |
| `src/layers/stack.ts` | the stack and its composite, with CSP's formulas |
| `src/layers/psd.ts` | the PSD writer |
| `src/layers/clip.ts` | the .clip writer: new canvas or injected |
| `src/layers/clipread.ts` | the .clip reader, composite and rule checks |
| `src/layers/template/` | the empty CSP canvas the writer copies from (wamsoft/clipparse, MIT) |
| `scripts/layers.ts`, `scripts/clipcheck.ts`, `scripts/layerview.ts` | the commands: export, read back, look |

Sources, read for this work: [wamsoft/clipparse](https://github.com/wamsoft/clipparse) 322a273 (format notes and CSP test log), [Aodaruma/clipfile-rs](https://github.com/Aodaruma/clipfile-rs) bd88467 (`docs/format-analysis.md`, `docs/writing.md`), [dreaifekks/csp-ai-enhancer](https://github.com/dreaifekks/csp-ai-enhancer) 7a80c19 (what opened in CSP), [dobrokot/clip_to_psd](https://github.com/dobrokot/clip_to_psd) e8db68c, [al3ks1s/clip-tools](https://github.com/al3ks1s/clip-tools) e1d3d7e, [nodamushi/clip_layer_rename](https://github.com/nodamushi/clip_layer_rename) 83b01db (sample files). No code was copied; the writer and reader here are new.
