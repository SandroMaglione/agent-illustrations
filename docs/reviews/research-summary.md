# Fable 5.2 research: summary

Written by Claude Fable 5.2, unedited apart from removed machine paths. Not every claim held up when measured: see `../history.md`.

The research document is written: `research-anime-rendering.md`. Nothing in `src/` or any existing file was touched, and no subagents were started.

1. I found no official or artist-written breakdown of how ZZZ splash art is painted, and no GDC or CEDEC talk on the 2D art; everything ZZZ-specific is measured from the one reference or inferred.
2. Nothing surfaced for Honkai Star Rail, Wuthering Waves, Arknights or Persona, so those are not covered.
3. Several sources were read only through search summaries, not the full page; section D marks which.
4. The reference is mostly flat: 83% of skin is the light tone, 14% shade, 3% the band between; hair is 62% mid, 27% shadow, 4% deep, 7% highlight.
5. Its highlights are quiet: the hair highlight is only +8 value and less saturated than the base, and pure white appears in four or five tiny marks.
6. Material reads from edge width, not gloss: skin has a 2–3 px hard step with a saturated pink band, cloth a plain soft blend of about 10 px with no highlight.
7. The reference is desaturated: 86% of figure pixels sit under 0.3 saturation, with tiny neon accents; the oni's saturation peaks around 0.6.
8. The latex look in the oni has three causes: a mauve band beside every inner line, tone bands that copy the outline, and white streaks on every material.
9. Section A is 15 passes in order, from value plan through flats, occlusion, form and cast shadows, edges, rim, speculars, line colour and background to finishing, each with numbers and a pass/fail check.
10. Sourced numbers include the three multiply shadow colours, occlusion at 44%, the "white shadow is value 50, mid-grey is 25" rule, and glow settings (blur 60–90, add at 20–60%).
11. Section B has recipes for eyes, skin, hair, horn, six cloth and leather types, metal, gold, gem, ember and smoke.
12. The numbers for band width, rim, grain, line colour and highlight contrast are all from measurement; no source gives them.
13. The top fixes for the oni are: remove the line-hugging bands, stop contour-parallel shading, and delete white streaks from cloth.
14. Next are the hair (lower the base, one broken trapezoid highlight band, real shadow masses) and cutting saturation while separating the hood, jeans and cuff values.
15. The remaining fixes are warm skin shadow, quieter background type with no drop shadow, flat decals, coloured lines and grain; all ten have pixel locations in section C.
