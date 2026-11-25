# History: how the rules were found

Record of the review rounds. Current rules are in `process.md`; numbers below may be superseded.

Agreed between the maker and Gemini 4 Neon over four review rounds on 2026-11-24 (scores below are the reviewer's, per-round re-scoring varied by up to 0.5). Code: `src/splash/` (`engine.ts` rules, `tones.ts` colours, `twin.ts` one drawing). Run `?v=twin&upto=N`, plus `&view=grey|masks|regions` and `&stats=1`.

Lengths are in line-art px on a head of 433 px (crown to chin); scale them with head height. Lightness ratios are **OKLCH L**. Lab L is 0-255. [M] measured on the references, [A] agreed by eye.

## Before starting
- Lines closed. Same part names on every character. Close gaps under 3 px on straps and knots before filling.
- One light: upper left.

## Passes
| # | Pass | Rule | Check |
|---|---|---|---|
| 0 | Line art | flood each part; one label per part | `view=regions`, no leaks |
| 1 | Flats | skin light `#fcf1ec` [M]; greyed cloth; hair mid-light; stockings never black | reads as a sticker |
| 2 | Gradients | one slow drift per part. Hanging and back hair 20 to 35 Lab L darker than the crown, cooler to the tips. Blush on cheeks, shoulders, elbows, knees, hands | squint: crown, tails and skin are three values |
| 3 | Contact | soft dark beside an overlap, no direction | paper cut-outs |
| 4 | Shadow shapes | design each shape; cast shadows are the caster's silhouette moved along the light. Skin 15 to 30% in shade | `view=masks` reads as a drawing |
| 5 | Edges and warm band | cast edges 1 to 2.5; form edges 4 to 10 by radius. Skin near the edge `#c9aaa4`, deeper `#b89b97` [M]. Warm band `#e2b1a5` **just inside** the shadow edge, 3 to 6 on cast, 6 to 10 and softer on form [M] | band never on the lit side |
| 6 | Deep shade | `#a38386` on skin, slate on hair, 0.55 on cloth. Only overlaps and folds | remove it: form stays, punch goes |
| 7 | Ring and light shapes | hair ring: one solid scalloped band, broken only where the hair parts, +22 to 28 Lab L, warm lip on the lower edge only [M]. Cloth light planes crisp, 2 or less. Dark cloth: tapered sheen, never white. Gold: bronze, gold, cream chips | hide it: form survives |
| 8 | Face and eyes | sclera shadow top quarter; dark top third of iris with crisp bands; bright saturated lower crescent; one main light, one small opposite; lash core is the darkest mark. Crisp warm-white nose mark | eyes read at 96 px |
| 9 | Colour line | a line takes its darkest neighbour (cloth, hair, skin), but at a skin and cloth border it leans red-brown. Silhouette darker than interior; skin lines thin, red-brown | no black line inside skin or pale hair |
| 10 | Finish | skin clean; hair and cloth slight grain (std 0.4 to 0.7) [M]. White page, halo optional and at most 9% [M] | blink against 9 |

## Cloth [M, OKLCH]
shade 1 = 0.70 x base, shade 2 = 0.56 (blue `#637ba8`, `#3b4a69`, `#27354e`). White cloth shades to lavender grey. Dark cloth goes about 35 to 45% below base in folds.

## The review loop
1. Maker renders, crops head, torso, legs.
2. Reviewer sees references, line art and render, not the maker's opinion. It must give scores with located evidence, ranked fixes in numbers, and label each gap RULE, SHAPE or LINE ART.
3. Maker measures every claim on the references before acting. Accept, or reject with numbers.
4. Reviewer re-checks the rejections and re-scores. Stop when process and image are signed off separately.
- RULE gaps change `engine.ts` or `tones.ts`, SHAPE gaps change the drawing's data, LINE ART gaps go back to the artist.

| Round | Overall | Main change |
|---|---|---|
| 1 | 5.5 | first pass |
| 2 | about 6.9 | warm band inside the edge, darker skin shade, soft form and hard cast edges, tinted lines |
| 3 | 7.4 | hair masses, ring lip, eyes, crisp sheen, line ownership |
| 4 | 8.4 | inner shade reaches soft shadows, tails darker, deeper stockings. Process and image signed off |

After sign-off the maker met its two process conditions (cloth plane edges, skin-side line tint). Those last edits were not reviewed again.

## Where reviewer and maker disagreed
- Ring "must be feathered shards": wrong, withdrawn. Luminance is a flat plateau for 200 px along the arc in ref-b.
- No halo, no grain, no nose mark, no glow: withdrawn after measuring.
- Warm band on the lit side: the maker was wrong.
- Cloth ratio 0.62 / 0.46: a different lightness scale; settled on OKLCH.

## What still limits it
- The line art's even weight: the references use tapered, broken lines.
- Hand-placed shapes: ring, sheen, fringe and tail shadows are correct in rule but plainer in design.
- Open line gaps need hand corrections.

## Repeatability run: the tape character (2026-11-24)
`engine.ts` and `tones.ts` were frozen (checksums identical before and after). Only `tape-seeds.ts` and `tape.ts` were new. Three data-only self-checks, no review rounds. One final judgement by Gemini 4 Neon: tape 6.8 average, the previous character re-scored 7.8 by the same reviewer in the same sitting (it had given 8.4 earlier, so its scores move by about 0.6 between sittings). Style match: fail. Repeatability: partial pass. About 72% of the way to the references, against 82% for the previous one.

| | Previous | Tape |
|---|---|---|
| Colour marks | 298 | 335 |
| Corrections | 27 | 6 |
| Cast rules | 22 | 39 |
| Placed shapes | 218 | 267 |
| Review rounds | 4 | 0 |

Confirmed after measuring:
- RULE: line tint is not scaled to line weight. Pass 9 keeps "solid black" where ink is thick; with 5 to 7 px outlines that catches ordinary contours. Shoulder line L 21, previous character L 88. Fix: judge thickness against this drawing's own typical line.
- SHAPE: ring cut into disconnected pieces. Draw it whole, then cut only at real partings.
- SHAPE: sclera shadow placed for open eyes ended up hidden under the lash on narrow eyes. Place it from the lash edge down.
- Data bugs: skin spill left of the raised hand (708,370), smudge on the player's corner (274,1394), speckle on the lapel (410,855), shadow mark on the shoulder (390,425).

Not confirmed:
- White shades warm: no. Shaded trim and panels are `#b5b1bd`, `#ada8b4`; the reviewer sampled the lit tone.
- Ring lip on both edges: no. Lower edge only; the upper reading is a warm shadow edge nearby.
- Nose mark soft: no. `#fffcf7`, L 253, at (481,288); the reviewer sampled (455,288).
- Halo 9.8%: no. That spot is the glow of a floating ornament.
- Hair drops 79 L: a lit crown compared with a shaded tip. Unshaded clumps sampled are 15 to 22 darker.
- Skin 44% shaded: the mask gives face 16, arm 24, hands 31 and 35 (slightly over), neck 100 by design.
- Near-black outlines are off-style: only against ref-a to ref-c. ref-d has them (thigh contour L 1). They do break our own rule 9.

Consequence: line weight belongs in the brief for the artist, in relation to head height, and the engine must read it.

## Head to head: the bell character (2026-11-24)
Two makers, blind, same brief (`docs/bell-brief.md`), rules frozen in both copies (checksums equal). Opus in this folder, Gemini 4 Neon in `../sketch-probe-neon`. Each then judged the other; a fresh Neon session did Neon's side. Neither judge is neutral.

| | Opus image | Neon image |
|---|---|---|
| Scored by Opus | 7.4 | 6.9 |
| Scored by Neon | 8.3 | 7.0 |
| Colour marks | 463 | 213 |
| Corrections (force + walls) | 15 + 8 | 7 + 25 |
| Cast rules | 33 | 22 |
| Placed shapes | 254 | 201 |

Agreed: Opus image has cleaner regions, cloth, hair ring, finish. Neon image has calmer floating graphics.
Split: Opus rated Neon's eyes and palette higher; Neon rated Opus's higher.

RULE bug found, missed by both judges: `tones.ts` gains too much saturation as it darkens. The reference blue goes 0.41, 0.44, 0.50 (HSV S); our rule gives 0.41, 0.54, 0.70, then 0.82. Figure pixels under S 0.3: references 82 to 99%, Opus 55%, Neon 42%. Share below L 30: references 0.1 to 3.8%, Opus 7%, Neon 18%. Fix: lower chroma at each step until HSV S rises by no more than about 0.05. Rule 1 ("greyed cloth") needs a measured check on the flats.

Neon's claims checked: bangs and back hair "lack the drop": no, 29 and 30 Lab L below the crown (Neon's own nape is 118 below). Forehead cast "missing": no, there but narrow (L 177 at (490,98); the sample was past it). Jaw shade narrower than it could be: yes. Waist-down ink near black: yes, the known line bug. Left wedge (275,1480): the drawing allows both readings.

## Rules update after the head to head (2026-11-24)
The client preferred the Opus bell overall, the face and eyes above all; Neon did slightly better on small accessories and their silhouettes.

| Change | Before | After |
|---|---|---|
| Shade saturation is capped per step | ref blue gave S 0.41, 0.54, 0.70 | 0.41, 0.44, 0.49 (reference 0.41, 0.44, 0.50) |
| Figure under S 0.3 (bell) | 55% | 80% |
| Figure under luma 30 (bell, tape) | 7.4%, not measured | 4.7%, 2.0% |
| Line tint judged against the drawing's own contour | thick outlines stayed black in skin | red-brown skin lines at any weight |
| Face ink never slimmed, lashes stay darkest | generic | face rule |
| Key line around small accessories, deeper metal | none | `keyline`, metal 0.64, 0.43, 0.29 |
| Borders under ink cleaned by majority vote | comb specks | clean |

Part of the bell's saturation gain comes from slightly greyer flats (coat, brass, braid), not only the rule. Not re-reviewed by Neon.

## Goggles character: client notes and Neon's practical review (2026-11-25)
Client: objects lack 3D form, light scattered, no contrast or focal point. Measured: the jacket was lighter than the head (172 against 154) and local contrast at the head only 1.12 times the rest. Fixes, numbers and which of Neon's 12 findings held: `findings.md`. Full review: `reviews/rig-neon.md`. The first correction overshot (body 71% dark), so it was lifted again. Not re-reviewed by Neon.
