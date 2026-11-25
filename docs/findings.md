# Findings

What was learned in two days, 24 and 25 November 2026. Full story: [`journey.md`](journey.md). Measurements and disagreements: [`history.md`](history.md).

The client's judgement on the last drawing (goggles, second version): "way better, way way better". Scores before that came from models and moved by about 0.6 between sittings, so treat them as weak.

## What made the difference, most first
1. **One declared light, and everything computed from it.** Folds, rims, cast shadows and hair shade no longer choose their own side. Scattered light was the fault most visible to a person and least visible to our checks.
2. **Value before detail.** The client saw at once that nothing attracted the eye; the numbers confirmed it: the jacket was lighter (172) than the head (154). A black-and-white view would have shown it in the first minute. Use luma: HSV V and HSL L call orange and blue equally light.
3. **Objects need thickness.** Cast shadows in two depths, lit and shaded rims, undersides. Every overlap must be in the cast list.
4. **Name things, do not measure them.** Shapes said in terms of numbered lines: typed coordinates in shapes went from 2,954 to 18 on tape and 0 on rig, and slivers from 150 to 0 after the seal. The agent is bad at reading coordinates and good at reading numbers on a drawing.
5. **Big planes first, then accents, then a separate round for lights.** References use a few large shadow masses, not a wedge beside every fold. The first pass always has too few lights.
6. **A person draws, code colours.** Rules transfer between drawings. Drawing itself did not work in code: pose, hair, hands and face.
7. **Face and eyes carry the picture.** Their ink is never slimmed, the lash core is the darkest mark.
8. **Shades barely gain saturation** (reference blue 0.41, 0.44, 0.50). Ours ran to 0.82.
9. **Measure claims, the critic's and your own.** Neon's practical review was mostly right, with one bright pixel misread; earlier reviewers and makers were both wrong about several things.

## What did not work
- Typed polygons on a grid: 30 to 35% of shadow edges ran 2 to 6 px beside a line.
- Shaded surfaces (inflated height): cloth turned to latex.
- Hair shadow as stripes between two lines, or from the lock kit alone.
- Automatic deep shade. Lumpy.
- Light chips in the middle of a plane. Always look stuck on.
- Judging the dark side of a fold with a score: it counts pocket edges as errors.
- White highlights on cloth, warm band on the lit side, shades that gain saturation.
- Scores as a target. A list of doable changes is what a review is for.

## Numbers
### Placement
| | Typed (tape) | Named lines (tape) | Rig |
|---|---|---|---|
| Shapes | 266 | 246 | 263 |
| Typed coordinates in shapes | 2,954 | 18 | 0 |
| Lit slivers | 150 | 0 | 0 |
| Shadow edge running beside a line | 7.4% | 0.1% | 0.5% |

The total of numbers did not fall as much as the coordinates: tape has about 2,300 in its finished shapes, rig about 3,300, because the kits expand into many small shapes. What an agent writes by hand for rig is about 2,000. Slivers are zero because the engine closes them: 35 on tape, 77 on rig, so the shapes alone still leave gaps.

### From zero
The goggles drawing, first version: about 17 minutes from line art to render, four rounds, 349 region clicks, 2 walls. Earlier drawings were not timed, so there is no clean speed comparison. The rework for light and value took several more rounds and was not timed.

### Value (goggles, box over the head against the rest)
| | First | Before the review | Too far | Final | Closest reference |
|---|---|---|---|---|---|
| Head median luma | 154 | 142 | 135 | 141 | 183 |
| Rest median luma | 172 | 71 | 69 | 84 | 85 |
| Rest that is dark (under 85) | 27% | 57% | 71% | 51% | 50% |
| Local contrast, rest | 16.8 | 10.7 | 8.5 | 9.6 | 12.7 |
| Local contrast, head over rest | 1.12 | 1.75 | 2.16 | 1.97 | 1.24 |

`pnpm check` uses the focus ellipse instead and gives 1.33. The jacket changed from cream to slate to get there.

### Neon's 12 findings on the goggles drawing
| Result | Findings |
|---|---|
| Done | shoulder border, goggle cast and rims, hair tuft and braid, nose, sleeve piping, mouth |
| Partly | arm on chest, bangs on the far brow, collar trim (still L 153), body contrast, zip metal |
| Part wrong | buckle: the bright pixel was our key line; the rest was right and done |

[Neon's text](reviews/rig-neon.md). It has not reviewed the final version.

## Experiments
| Tried | Result | Kept |
|---|---|---|
| Eye rig on tape, bell and rig | fits from 4 to 8 line names; needs a drawn lower lid (not on twin) | yes |
| Wedges standing on a line for hair | reads as hair | yes |
| `flow` as hair shadow | random stripes | only hairs and lights |
| Ring with lobes on both sides | a cloud; a calm top edge and small scallops fixed it | yes, changed |
| Lock kit on top of large planes | energy back, still clean | yes |
| Cloth kit (fold, seam) | sides chosen by the light | yes |
| One form line per limb, one band per finger | cleaner than by hand | yes |
| Lint that counts every edge near a line | half the faults were narrow bands; the line must be on the lit side | yes, corrected |
| Thinner inner lines, sky-tinted shadow centres | closer to the references | yes |
| Working at one scale | shapes match between sizes at 0.97 or more, before 0.85 to 0.96 | yes |
| Light falling off from the focus | helps, but flattened the body at first | yes, weaker |

## Bugs a new drawing showed
Bare fills ran through open hair lines. Very heavy ink gave blotchy contours (line weight now uses local thickness). Lash tips glowed onto hair, and lashes over hair lost their colour. Bevels appeared under things that lay on top. A straight edge inside a lock became a chord and lit the tuft from below.

## Open
- Body contrast below the reference, and below the version Neon flagged.
- The collar trim is too bright for its place; the lenses compete a little with the eyes.
- Our hair is a mid grey, the references' heads are lighter, so the face carries the focus alone.
- Light, focus and value checks only on rig. The other three need them.
- A proof on a third new drawing, timed.
