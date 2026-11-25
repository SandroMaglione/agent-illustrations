# Concierge, Neon as maker: its own report

Written by Gemini 4 Neon, unedited apart from removed machine paths. Not every claim held up when measured: see `../history.md`.

**Final image**: `archive/neon-bell/bell.png` (kept at 1000 × 1500; judged at 2048 × 3072, rendered with `v=bell&k=3&zoom=2`)  
**Notes**: `archive/neon-bell/notes.md`  
**Edited drawing data**: `archive/neon-bell/bell-seeds.ts`, `archive/neon-bell/bell.ts`

### Short Notes
- **Palette & extras**: Warm champagne-ash hair (`#d1beaa` → cool mauve tips, `#a494a2` nape), porcelain skin (`#fcf1ec`, face 20% shaded), emerald-teal eyes and brooch gem, twilight slate-navy tailcoat (`#43495c`) with ivory trims (`#ebe6e4`) and mitered antique-gold pinstripes, wine-crimson waistcoat (`#8e4a5b`, subtle clipped pinstripes) and coat lining, slate trousers, crisp white shirt/gloves, and antique-gold brass hardware (desk bell, cravat brooch, buttons, chain, ornate key) with bronze shadows, warm reflected horizons, and cream chips. Floating `back` graphics add golden chime arcs/bars above the bell and a glowing cyan-teal hotel diamond crest with sparkles.
- **Process & counts**: 4 full self-review rounds (plus 3 region-isolation passes) checking coordinate grids, `view=regions`, `view=grey`, `upto=6&view=masks`, `&stats=1`, and 2×–2.4× zoomed crops against `public/refs/ref-a..d`. **213** colour marks, **32** corrections (25 `walls`, 7 `force`), **22** cast rules, **201** placed shapes (plus 12 gradients, 13 washes). `pnpm typecheck` passed; dev server stopped.
- **Weakest**: The upper right waist trim (`y=910–980`) tapers slightly abruptly into the lining fold beneath the key chain, and the waistcoat's vertical gold placket has a tiny step along its lower-right edge at high zoom.

### Frozen Rules Checksums (`shasum`)
``text
d3d2ea8209828036ea1c1c4fb3c0dd40197a1ed7  src/splash/engine.ts
4d4e290f25e83e94f2b6a7e9d099900f72849170  src/splash/tones.ts
``
