# Bell Character Colouring Notes

## Palette & Extras
- **Palette**: Warm champagne-ash hair (`#d1beaa` crown drifting to cool mauve-taupe tips, `#a494a2` nape), porcelain skin (`#fcf1ec`), luminous emerald-teal eyes and brooch gem (`#58a8a8`), twilight slate-navy tailcoat (`#43495c`), warm ivory lapel/collar/cuff/hem trims (`#ebe6e4` shading to lavender-grey), muted wine-crimson waistcoat (`#8e4a5b`) and coat lining (`#783c4e`), charcoal-slate trousers (`#585c6e`), crisp white dress shirt/gloves, and antique gold hardware (`#d2ab64` desk bell, bell brooch, buttons, chain, ornate key).
- **Extras**: Mitered antique-gold pinstripes inside all ivory coat trims (`face`), clipped subtle vertical pinstripes on the burgundy waistcoat (`face`), warm reflected brass horizons on both bells, crisp star glints on metal/gem highlights and whisper-thin hair flyaways (`over`), and glowing golden bell-chime arcs, radial bars, cyan-teal diamond hotel crest, rings, and sparkles in the whitespace (`back`).

## Process & Checks
- **Self-review rounds**: 4 full rounds (plus 3 initial region-isolation passes).
- **What was checked**: Zoomed coordinate grids on every part before seeding; `view=regions` across head, torso, cuff, hems, and key until leaks were sealed; Pass 2 value hierarchy and `view=grey`; `upto=6&view=masks` for shadow silhouette design; `&stats=1` (face 20% shaded, hairF 25%, coatR 52%, pants 53%); full 1024×1536 and 2×–2.4× zoomed crops compared against `public/refs/ref-a..d` at every round; final 2048×3072 (`k=3&zoom=2`) render inspected.

## Counts
- **Colour marks (seeds)**: 213
- **Corrections**: 32 (25 `walls`, 7 `force`)
- **Cast rules**: 22
- **Placed shapes**: 201 (plus 12 gradients, 13 washes)

## Weakest Area
The upper segment of the right coat waist trim (`y=910–980`) narrows sharply where the lining tucks under the key chain, so the ivory strip tapers slightly abruptly into the fold, and the waistcoat's vertical gold placket shows a subtle step along its lower-right edge at high zoom.
