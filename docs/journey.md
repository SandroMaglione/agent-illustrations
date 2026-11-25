# The journey, step by step

Sixteen steps, 24 and 25 November 2026. What was asked, what was built, what went wrong and what stayed. Older steps describe older code; the current process is in [`process.md`](process.md) and the conclusions in [`findings.md`](findings.md).

## 1. Can a drawn look be code?

**Asked:** is the pencil look in David Hill's character engine video made with code, and can it be reproduced?

It is code: his video shows its own source. The rebuild uses original characters. A figure is a few posed solids that output named shapes and lines, not pixels. Each style draws that same list its own way.

First tries: correct objects, lifeless lines.

![First tries](../gallery/journey/1a-first-tries.jpg)

What made it read as drawn: contours broken at corners that overshoot, lines heavier on the shadow side, a loose second stroke, hatching made of real strokes, construction lines that run past.

![Pencil](../gallery/journey/1b-pencil.jpg)
![Poses](../gallery/journey/1c-poses.jpg)
![Styles](../gallery/journey/1d-styles.jpg)

One scene, the same data, pencil and felt-tip:

![Scene in pencil](../gallery/journey/1e-scene-pencil.jpg)
![Scene in felt-tip](../gallery/journey/1f-scene-felt.jpg)

And ten more:

![Scene in ten styles](../gallery/journey/1g-scene-all.jpg)

![Reel](../gallery/journey/1h-reel.gif)

[Full reel](../gallery/reel.mp4) · [interactive studio in one file](../gallery/studio.html)

## 2. A splash-art style as numbers

**Asked:** how did he get there, and can general principles give other styles, such as game splash art with solid shapes and cel shading?

A reference was measured instead of described. A style came down to eight decisions: shapes, value steps, shadow hue, edges per material, line hierarchy, separation, surface, detail budget.

![Steps](../gallery/journey/2c-steps.jpg)

Four attempts at an original courier, drawn fully in code:

![Attempts](../gallery/journey/2a-attempts.jpg)
![Courier](../gallery/journey/2b-courier.jpg)

Changing almost only the numbers gives six styles, and the kitchen scene from step 1 goes through the same engine:

![Six styles](../gallery/journey/2d-styles.jpg)
![Scene](../gallery/journey/2e-scene.jpg)

**Learned:** rendering rules transfer. Drawing does not: pose, hair, hands and face were the weak part. Shadows need a tint, not a hue rotation, or cream turns green.

## 3. Let a person draw, let code colour

**Asked:** the drawing is not there yet; render this sketch in the style instead.

Rough colour marks spread until they hit ink, so edges snap to the lines. Rules add shadows, and the pencil is smoothed along its own direction.

![Attempts](../gallery/journey/3a-attempts.jpg)

Sketch, regions, flats, result:

![Steps](../gallery/journey/3b-steps.jpg)
![Result](../gallery/journey/3c-final.jpg)
![Detail](../gallery/journey/3d-detail.jpg)

**Learned:** this split works. Construction lines became hard ink, so clean line art matters.

## 4. Clean line art, one light

**Asked:** clean lines, one consistent light, cold shadows, warm lights, more tones in eyes, face and hair.

Regions, then three rounds. Yellow shaded straight to blue turned to mud, so it goes through rust and violet.

![Attempts](../gallery/journey/4a-attempts.jpg)
![Steps](../gallery/journey/4b-steps.jpg)
![Tone ramps](../gallery/journey/4c-ramps.jpg)
![Result](../gallery/journey/4d-final.jpg)

**Learned:** much better, but cloth looked like latex. Shadows copied the outline, and every material had white streaks.

## 5. Work like an illustrator

**Asked:** research how anime and Zenless Zone Zero style illustrations are rendered, turn it into formal steps, and start again from scratch.

A Claude Fable 5.2 agent did the [research](research-anime-rendering.md) ([summary](reviews/research-summary.md)). It found no breakdown of how that game's art is painted, and said so. It became [15 passes](earlier/rendering-steps.md):

![Passes](../gallery/journey/5a-passes.jpg)

Before and after, same line art:

![Before and after](../gallery/journey/5b-before-after.jpg)
![Result](../gallery/journey/5c-final.jpg)
![Head](../gallery/journey/5d-head.jpg)

**Learned:** shadow shapes must be designed, with one clean side and one pointed side. Edge width names the material. Skin shadow starts warm. No white highlights on cloth. Grey most colours.

## 6. Match the references, with a critic

**Asked:** a new line art that must look like the references (clear outline, solid shadows, subsurface scattering, solid shapes), iterated with Gemini 4 Neon as reviewer.

Line art, regions, first render:

![Start](../gallery/journey/6a-start.jpg)

Rounds 1 to 3 and the signed-off version:

![Rounds](../gallery/journey/6b-rounds.jpg)
![Heads, rounds 1 to 4](../gallery/journey/6c-heads.jpg)
![Passes](../gallery/journey/6d-passes.jpg)

| Round | Neon's overall | Main change |
|---|---|---|
| [1](reviews/twin-round-1.md) | 5.5 | first pass |
| [2](reviews/twin-round-2.md) | about 6.9 | warm band inside the shadow edge, soft form and hard cast edges |
| [3](reviews/twin-round-3.md) | 7.4 | hair masses, ring lip, eyes, line ownership |
| [4](reviews/twin-round-4.md) | 8.4 | darker tails, deeper shade in soft shadows; signed off |

The first-round score is the reviewer's later re-score.

**Learned:** every claim was measured before acting. The maker was wrong about the side of the warm band and the paleness of skin shadow. The reviewer was wrong about feathering the hair ring, and about removing grain, halo and the nose highlight.

## 7. Does it repeat?

**Asked:** run the full process on an original character, with no review during the work, then get one final judgement.

The rules were frozen and proven unchanged by checksum. Line art, regions, shadow design, first render:

![Start](../gallery/journey/7a-start.jpg)
![Passes](../gallery/journey/7b-passes.jpg)
![As judged](../gallery/journey/7c-final.jpg)

[Neon's judgement](reviews/tape-final.md): 6.8 against 7.8 for the previous character, style fail, repeatability partial pass. Measuring confirmed part of it: a rule bug kept lines near black inside skin when outlines are thick, the ring was cut into pieces, and the eye-white shadow was hidden. Other claims sampled the wrong spot.

**Learned:** skin, cloth, metal and edges carry over. Anything tied to line weight did not.

## 8. Two models, one drawing

**Asked:** can Neon do better? Both render the same line art, then judge each other.

Same [brief](earlier/bell-brief.md), same frozen rules, blind to each other. Opus: line art, regions, first render:

![Start](../gallery/journey/8a-start.jpg)

Opus left, Neon right:

![Side by side](../gallery/journey/8b-side-by-side.jpg)
![Heads](../gallery/journey/8c-heads.jpg)
![Accessories](../gallery/journey/8d-accessories.jpg)

| | Opus image | Neon image |
|---|---|---|
| [Scored by Opus](earlier/bell-verdict-opus.md) | 7.4 | 6.9 |
| [Scored by Neon](reviews/bell-swap.md) | 8.3 | 7.0 |
| Placed shapes | 254 | 201 |

Notes: [Opus](earlier/bell-notes.md), [Neon](reviews/bell-neon-maker.md). Neon's drawing data is in [`archive/neon-bell/`](../archive/neon-bell/).

**The client's verdict:** Opus is better overall, especially the face and eyes, and those carry a lot of an illustration. Opus does better on the overall look and larger shapes. Neon did slightly better on some smaller accessories and their silhouettes.

Measuring both also found a second rule bug: shades gained too much saturation.

## 9. Fix the rules

**Asked:** update the rules.

- **Face and eyes first.** Face ink is never thinned; lashes stay the darkest mark.
- **Shade saturation is capped.** The reference blue goes 0.41, 0.44, 0.50. The rule gave 0.41, 0.54, 0.70 and now gives 0.41, 0.44, 0.49.
- **Line colour adapts to each drawing's line weight.**
- **Accessories get their own silhouette:** a pale key line and deeper metal.
- **`pnpm check`** holds each figure to numbers measured on the references.

Before left, after right:

![Twin-tails](../gallery/journey/9a-twin-before-after.jpg)
![Headphones](../gallery/journey/9a-tape-before-after.jpg)
![Concierge](../gallery/journey/9a-bell-before-after.jpg)
![Heads](../gallery/journey/9b-heads.jpg)

| | Twin-tails | Headphones | Concierge | References |
|---|---|---|---|---|
| Low-saturation pixels | 87% | 86% | 80% (was 55%) | 82 to 99% |
| Near-black pixels | 1.7% | 2.0% | 4.7% (was 7.4%) | 0.1 to 3.8% |

These versions were not reviewed by Neon.

### All passes of the current process

![Passes](../gallery/bell-passes.png)

## 10. Stop typing coordinates

Until here every shadow was a polygon of typed coordinates read off a grid. Now the drawn lines are numbered, and a shape is a sentence about them: `band s544[0..1] r 0 26 46`. The engine works out the geometry, stops at the ink and reports what failed. Tools and every experiment: [`tools.md`](tools.md).

Before left, after right:

![Headphones](../gallery/journey/10a-before-after.jpg)

Every shape has a name:

![Named shapes](../gallery/journey/10b-named-shapes.jpg)

Placement faults before and after (red: lit slivers, blue: edges beside a line), measured before the automatic seal:

![Faults](../gallery/journey/10c-faults.jpg)

| | Typed coordinates | Named lines |
|---|---|---|
| Shapes | 266 | 234 |
| Typed coordinates in shapes | 2,954 | 18 |
| All numbers in shapes | 2,954 | 1,972 (485 are line names) |
| Lit slivers | 150 (7,005 px) | 0 (about 30 closed by the seal) |
| Shadow edge running beside a line | 7.4% | 0.1% |
| Shadow edge length | 23,353 px | 13,820 px |
| Share in shadow | 32% | 32% |

Both sides were measured with the same engine. Not reviewed by anyone else.

![Eyes](../gallery/journey/10d-eyes.jpg)
![Hair](../gallery/journey/10e-hair.jpg)
![Sleeve](../gallery/journey/10f-sleeve.jpg)
![Player](../gallery/journey/10g-player.jpg)
![Card](../gallery/journey/10h-card.jpg)

The hair took one more round, with a kit for what every lock carries. Typed, named lines, kit:

![Hair rounds](../gallery/journey/10i-hair-rounds.jpg)

## 11. A new drawing from zero

The test of the new process: line art nobody had seen before, no coordinates. About 17 minutes, four rounds. Details in [`tools.md`](tools.md).

![Goggles](../gallery/journey/11a-rig.jpg)
![Process](../gallery/journey/11b-process.jpg)
![Rounds](../gallery/journey/11c-rounds.jpg)
![Named shapes](../gallery/journey/11d-shapes.jpg)
![Head](../gallery/journey/11e-head.jpg)

## 12. One light, real form, a value plan

Notes on the last drawing: objects without thickness, light from everywhere, no focal point. The jacket measured lighter than the head. Now the light and the focus are declared in the drawing, the kit's shading is computed from that light, and black-and-white values are checked against the references. Then Gemini 4 Neon gave 12 practical findings ([text](reviews/rig-neon.md)); each was measured before acting. Not re-reviewed.

![Before and after](../gallery/journey/12a-before-after.jpg)
![Values](../gallery/journey/12b-value.jpg)
![Goggles](../gallery/journey/12c-goggles.jpg)
![Face](../gallery/journey/12d-face.jpg)

## 13. Can a fresh agent do it?

A new agent with only the repository coloured new line art in 52 minutes. The client liked the colours and the overall shape; the rest was washed out, with lines too coloured, an invented nose shadow, one highlight for every material. Each note was sorted by cause (could not see, did not ask, could not do, forgot, or our rule was wrong). Two rules came from references that were no longer the target. [Lessons](lessons.md).

## 14. A new target, a new renderer

Three references, one goal: the drawing should fit beside them. A new renderer (`src/bold`): value first, hard blocky planes, black line, materials, hair by lock. On a finer line art (`visor`) five rounds followed: planes from line to line, fine rendering by facets, reflected light and scattering, solids behind limbs, a value gate. Better each time, and each time new notes on single spots.

## 15. Form first

**Asked:** stop chasing spots. Map the forms in 3D, with triangles, and only then shade them.

The figure was modelled in the drawing's own view (about 25,000 triangles) and measured against the line art: 84% of pixels showed the right form as typed, 97% after the outlines were pulled onto the drawn lines. It can be turned around.

![The blockout turned](../gallery/visor-turn.jpg)


**Asked:** no full 3D render needed; use it to find better shapes. Shading straight from the mesh was blobby. Printed as a guide under the line art, with the agent drawing the shadow shapes over it, it worked.

Then four corrections that became rules: keep the shadows that tell a distance, simplify uneven ones even against the form, never model the face, warm the skin's shade. And one regression: the second light had vanished, so the gate now measures it.

![Blockout, guide, shadow design, grey, result](../gallery/visor-steps.jpg)

**Learned:** the form says where, the drawn line says how, the style says where not. [How it is done](form-guide.md).

## 16. The face, the grain, the last look

**Asked:** the subtle noise of the references, a cleaner face, and a greyscale check at the end, every time.

Grain was measured and rebuilt: fine, coloured, strongest in darks, gathered towards the far side of hair and cloth. The first try at the face drew new lashes and lips over the artist's, and was rejected at once: their lines stay, paint goes between. The greyscale sheet showed what every number had passed: in three values the hair vanished into the page. The hair became a mass that frames the face, and its hue was pulled back to blonde.

![Rounds](../gallery/visor-rounds.jpg)
![Detail](../gallery/visor-detail.jpg)

**Learned:** a check that passes is not a picture that works. Look.

## 17. The same process on another drawing

**Asked:** apply it to the headphones character.

From the line art, with the documented steps. It carried over; what fell short were tools, and one colour rule. A slip: the gate failed on the hair and the hair was taken off its list, until the greyscale sheet showed the same fault.

![Maren](../gallery/maren.jpg)

**Learned:** never edit the plan to pass.

## 18. Out as layers

**Asked:** the render as layers, with Maren as a `.clip` to open.

Every paint step became a layer with the blend mode that says what it does. The `.clip` format has no public spec, so a reader and checker came first, tested on files CLIP STUDIO PAINT had saved; then the writer. The client opened Maren's file: modes, folders and names as expected.

![Layers](../gallery/layers-maren.jpg)

**Learned:** check a format on real files before writing one. [How it is done](layers.md).

## What it cost

Counted when each of the first three was first finished.

| | Twin-tails | Headphones | Concierge |
|---|---|---|---|
| Colour marks | 298 | 335 | 463 |
| Cast rules | 22 | 39 | 33 |
| Placed light and shadow shapes | 218 | 267 | 254 |

The placed shapes were the main cost and did not carry over. Steps 10 to 12 went after that.
