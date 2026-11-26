# Flat colours to open

Each `.clip` opens directly in CLIP STUDIO PAINT with the exact flat-colour layer stack described in [`docs/flats.md`](../../docs/flats.md):

1. **`Paper`** — white background.
2. **`Base 50% Grey`** — opaque `#808080` silhouette covering the coloured figure, excluding exterior background and enclosed white spaces.
3. **`↳ [Flats]`** — Normal folder clipped directly to `Base 50% Grey` below, with one raster layer per flat colour (zero overlaps, zero uncovered pixels, zero white halos, zero outer bleed).
4. **`Line art`** — original B&W line art on top in `multiply` mode.

Every `.clip` here passes all 8 Quality Gate metrics (`0` unnamed, `0` halos, `0` outer bleeds, `0` base mismatch, `0` layer overlaps, `0` unwalled bare-paper boundaries) and `node scripts/clipcheck.ts <file.clip> --tree` with `0` rule problems and `max diff = 0`. PSD outputs are omitted to keep the repository small and are regenerated in a few seconds by `scripts/flats.ts build`.

## Reference (`reel/`)

- `reel.clip`: `1086 × 1448`, 16 flat colour layers + `Base 50% Grey` + clipped `Flats` + `Line art`.
- `reel.flats.txt`: reproducible spec built directly from [`public/reel.png`](../../public/reel.png):

```sh
node scripts/flats.ts build public/reel.png examples/flats/reel/reel.flats.txt output/flats/reel --name reel
node scripts/clipcheck.ts output/flats/reel/reel.clip --tree
```

## Stress-test challenges (`challenges/`)

Three additional line-art challenges used to refine gap sealing (`sealNecks <= 1.5`), the `box:` auto-absorb floor, the 5 automatic 3× review contact sheets, and CSP round-trip diffing (`scripts/flats.ts diff`):

- `wheel.clip` + `wheel.flats.txt` (`1254 × 1254`, 15 colour layers including `Plastic Glass`, `0` tiny islands)
- `cloak.clip` + `cloak.flats.txt` (`1199 × 1312`, 12 colour layers, `0` tiny islands)
- `puppet.clip` + `puppet.flats.txt` (`1086 × 1448`, 15 colour layers)
