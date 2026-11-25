# Rendering steps

The working list: what each pass does, the rule behind it, and how to check it. Run one with `?v=oni2&upto=N`; `&view=grey`, `&view=masks` and `&stats=1` are the checks. Code: `src/passes/`. Evidence and sources: `research-anime-rendering.md`; tags there say what is sourced, measured or inferred.

| # | Pass | Do | Rule | Check |
|---|---|---|---|---|
| 0 | Line art | closed shapes, one name per part | same part names on every character, so colours and casts carry over | no leaks in `view=regions` |
| 1 | Value plan | grey only: light, mid, dark groups | neighbours differ, or share a heavy line; face is the lightest shape beside the darkest | 96 px wide, greyscale |
| 2 | Flats | one colour per part | mostly greyed; 2-3 small accents; pick bases lighter than the result | reads as a sticker |
| 3 | Gradients, prints | one slow gradient per part, plus blood in skin, warm and cold drifts; logos and stitching go here | never follows the outline; prints sit under all light | a small crop looks flat |
| 4 | Rough light | very blurred volume, at most 45% of a shadow | no lines, no edges | squint: big forms turn |
| 5 | Contact | darken only where one part overlaps another | no direction; never along creases inside a part | looks like stacked paper |
| 6 | Form and cast shadow | one designed shape per form, plus cast shadows on the same layer | one side a long curve, the other 1-3 points at folds; skin 12-22%, cloth 30-45%, hair 25-35% | `view=masks` is readable as a design |
| 7 | Edges | transition width per material; lose a few edges on purpose | skin hard with a thin saturated band, nylon firm, cotton and knit softer, hair, horn and metal hard | name the material from the edge |
| 8 | Deep shadow | second and third tone inside existing shadow | a few places: under hood, behind neck, ear, armpit; under a fifth of the shadow; shade gets colder further from the light | remove it: less punch, same form |
| 9 | Light planes, rim | warm planes facing the key; a thin cool rim on far silhouettes | never over a shadow; rim on under a third of the contour | hide it: form survives |
| 10 | Highlights | horn ridge, metal, gem, hair ring, nose | none on cloth; hair ring runs across the strands, one clean side and one ragged side | under 1% of the figure |
| 11 | Face and eyes | eight ordered eye layers, make-up, blush | strongest contrast in the picture is here | eyes read at 96 px |
| 12 | Colour line | near black outside, the part's own dark inside, red-brown in skin | keep the artist's solid blacks | inner lines lighter than outer |
| 13 | Backdrop | halftone away from the light, worn print, tiny technical text | lower contrast and chroma than the figure | outline unbroken at 96 px |
| 14 | Effects, finish | smoke, ember, dust, glow, warm and cold air, grain by material | changes air, never form | blink against 13 |

## Colour rules
- Light adds warm (OKLCH hue 80), shade adds cold (280) as a tint vector, scaled down on dark cloth so it does not go electric blue.
- Skin: first shade stays warm (in the blood); only the deeper ones go cold.
- Yellow and orange darken through rust; reds lose chroma as they darken, or they turn magenta.
- Shade is a multiplier on what is already printed, so prints, gradients and blush survive inside it.
- Up to six tones in key areas (face, eyes, hair), two or three elsewhere.

## Eyes, in order
white (not pure) - lid shadow - iris, dark at the top - outer ring - a few uneven fibres - lower pool shifted in hue, thin opposite-hue lip - pupil with a soft foot - lid shadow again - one round-rect light and one dot, above the line - lash tips red-brown, lit top edge.
