# Lessons

Every note on a result, sorted by why the maker missed it. A lesson starts as a **trial**. It becomes a rule after it helped on two or three drawings, and can be retired.

Kinds: **see** (no view showed it), **ask** (nobody asked the question), **do** (no tool), **forgot** (known and skipped), **rule** (a rule of ours caused it).

## Checkpoint, 25 November 2026: what holds after `crate` and nine rounds on `visor`
Confirmed by the client on `visor`; still trial until a second drawing.

| Holds | First seen |
|---|---|
| Greyscale at every stage; a gate that fails | 3rd, 5th |
| Base shade from the solid, exceptions on top | 5th |
| A 3D blockout as understanding, not as rendering | 6th, 7th |
| Form says where, the drawn line says how; shapes drawn by the agent | 7th |
| Simple shapes beat correct uneven ones; hair one shape per lock | 8th |
| Face never modelled; neck carries the shade | 8th |
| Casts that tell a distance stay, clear of their caster | 8th |
| Warm skin shade by orange overlay | 8th |
| Second light as bold planes, only against open air, below the light | 4th, 9th |
| Scattering band on soft turns, none on casts | 4th |
| Inner lines coloured, lines between front and back dark | 3rd |
| Fine line art, parts at the back softer | 2nd |
| Piece by piece review, large | 3rd |
| Peel without a glint, reflection by material | 2nd |

**The pattern behind the misses:** each new system quietly dropped what the one before it did (solids dropped facets' bounce, the mesh dropped casts, the design dropped bounce). A thing the client approved needs a check that fails when it disappears. Second light and value have one now; casts, scattering and materials do not.

## Cold start, `crate`, 25 November 2026
A fresh agent, repository only, 52 minutes. Client's notes in their own words, then what was measured. Sorted here; the client then named e, f and g as the only target (a to d are out) and asked for value first, blocky shapes, and hair bands that move hue and not value. Status in the last section.

| # | Note | Kind | What was found |
|---|---|---|---|
| 1 | "style is way too flushed out, not bold enough", "lines got too much coloured where not needed" | rule, see | Line art is crisp black; the engine recolours and softens it. Lines between two light areas: ours 1% near black, references e f g 9 to 24%. Between two dark areas: 70%, references 91 to 94%. Rules 9 ("no black line inside skin") and line slimming come from references a to c |
| 2 | "darker ones stay better in shadow and where you need a clear separation between front and back" | do | Line colour knows its neighbours' material, not depth or shade. No tool for a black wedge under jaw or collar; the neck is one greyed shade |
| 3 | "the face lost its clear look" | rule, see | References keep a face almost flat: clean skin, short shadow under the fringe, black lash and jaw line. Ours has soft lid tints, wide blurred fringe shadow, warm bands and blush, all on a 200 px head |
| 4 | "a shadow for the nose in the middle of the face for no reason" | see, ask | The line art has no nose. The maker invented a triangle, and the fringe's cast ends in a blob beside it |
| 5 | "materials are not respected ... like a billiard ball" | do | One highlight for every material. Nothing says how sharp, how bright or where a reflection sits |
| 6 | wrist band "bad 3d shape, unclear light" | do | Band bent around an arm has no tool: shade follows drawn lines, not the tube it wraps |
| 7 | metal "normally would reflect way more" | do | Brightest 5% of our metal: luma 186 to 195. References 211 to 250, beside values down to 7 to 48 |
| 8 | "cheeks are also all the same ... almost geometrical" | do | Four equal strokes, hard coded in `eyes.ts`. References e f g have no strokes at all |
| 9 | "more contrast in the shadows ... more deep, more blue-ish, and the light side ... orange-ish" | rule | `tones.ts` caps the saturation a shade may gain. Skin light to shade: ours 0.09 to 0.20, e 0.06 to 0.28, f 0.06 to 0.34. Trousers hue 218 to 221. No warm light tone |
| 10 | "bounce light ... clearly important step that you may not have yet" | do | Not there. Found in the references: a narrow warm line where shadow begins (g shirt `#edd3d7`, e arm `#e8b8a6`), and cool planes on the side away from the key (f coat `#5f70ac` on `#131623`) |
| 11 | "post processing effects" | do | g and f carry grain, e almost none. e has coloured stripes on the dark hem that look like colour fringing. Ours: grain only |
| + | "I like the combination of colours" | keep | five adjusted palettes before rendering |
| + | "overall shape stands", shadow direction "somehow consistent" | keep | declared light, cast list |

What the maker had on its own list: hair shade too grey, flat slate trousers (part of 9). Nothing else of the above. Every check that failed was about something the client did not mention, and the saturation rule the maker broke on purpose was right to break.

### The references disagree with our rules
Share of the figure under HSV S 0.3: a 82, b 99, c 87, d 63, **e 58, f 35, g 55**. Under luma 30: a b c under 1, d 4, **e 6, f 14, g 7**. Our rules (75% or more, 5% or less) describe a to c only. A look has to own its numbers.

### Materials: first notes (trial)
Read off the references and two tutorials; not tried yet.

| Material | Reflection | Edge | Measured luma, 5th to 95th percentile |
|---|---|---|---|
| Gold, silver | 3 or 4 flat bands, darkest beside brightest, bright rim on edges, lighter band at the bottom (bounce) | hard | gold 27 to 248, silver 16 to 225 |
| Leather, dark cloth | one or two pale cool polygons, low contrast, on the turn of the form | hard, transparent | 22 to 112 |
| Matte rubber, stone | none, only a lit rim on edges | soft plane | 58 to 113 |
| White cloth | none; shade blue-violet with a warm line at its start | hard | 169 to 249 |
| Skin | none on the face; a small pale patch on a joint | soft | |
| Fruit peel (orange) | broad, soft, warm, low contrast, broken by pores: not a white oval | soft | not in the references |

General: highlight size and sharpness follow roughness, brightness is separate; a metal without reflections reads as plastic ([Clip Studio](https://www.clipstudio.net/how-to-draw/archives/159970)); matte things blur and widen it ([Oekaki Zukan](https://oekaki-zukan.com/articles/26825)). Gold stops from the same Clip Studio page: (51,42,17) (153,126,50) (255,230,130) (255,249,227); silver (48,49,51) (121,124,128) (210,213,217) (255,255,255).
Bounce: inside the form shadow, beyond its darkest band, a touch lighter than the shadow and never read as light; colour from the thing that reflects ([Draw Paint Academy](https://drawpaintacademy.com/how-to-paint-reflected-light/)).
Blush: outer strokes shorter, inner longer, inside a stretched oval; or a plain gradient, or one shape across the nose for embarrassment ([Anime Outline](https://www.animeoutline.com/how-to-draw-anime-blush-in-different-ways/)).

## The target look, first round (all trial)
New renderer `src/bold`, tried on `crate` (reworked) and `rig` (materials and forms only). `tape`, `bell` and `twin` were not touched and render. Judge: `scripts/lineup.ts`, the drawing between the references at one head size, colour and greyscale.

| Note | What was built | State |
|---|---|---|
| washed out, lines coloured | strokes redrawn from their centre line at the references' weight; black except inside a lit plane; the artist's filled blacks kept; face ink untouched | done; crate now too black (73% of line pixels under 45, references 25 to 53; rig 51) |
| value, sides that turn away | `forms`: every patch, part or mass is a pillow and gets a flat turned plane and a lit plane by itself | done |
| blocky | every shade is cut: crumbs dropped, edges straightened, nothing crosses a part's border | done |
| deeper blue shadows, warm light | shade is a colour multiplied on top, with no saturation cap; warm light side, cool far side | done |
| bounce | band of reflected light at the far edge, rich line where shade begins, sky tint on dark things | done, small |
| black where front meets back | right under anything that stands off by more than 7% of the head | done |
| face | no soft bands, smaller blush, nose only a patch and a mark, harder iris steps | done; fringe shadow still ends in a point beside the nose on crate |
| materials | `kind` now decides the reflection: metal bands, leather plane, plastic plane, soft fruit, none on matte | done; first values |
| wrist band | lit and turned planes from its patch | partly: still not a tube |
| cheeks | gradient only; optional marks that vary in length, lean, weight | done |
| hair bands | strands follow the drawn lines, hue turns, value nearly still | done; weak on yellow hair |
| post effects | grain, light falloff; no fringing, no glow | open |

Measured, share of the figure: low saturation crate 49 to 37, rig 87 to 53 (references 35 to 58). Near black crate 1.0 to 11.9, rig 3.1 to 10.8 (references 6 to 14).
Learned: a rule taken from one set of references must not outlive that set. Line weight and the cut of the shapes did more than any colour change.
Also fixed: casts, eye light and rims now follow a light from any side; blur and distance are 3 to 8 times faster.

## Second round, `visor` (a finer line art), all trial
| Client's note | Kind | Answer |
|---|---|---|
| reflection on an orange is never a round glint | do | peel has no glint: a broad warm light and irregular pores near the turn |
| "details are all a blob, off the lines" | do | a tooling fault, not seeing: planes came from blurred pillows. Now measured along the light from drawn line to drawn line (`bold/planes.ts`), then cut straight inside their own part. What lies on top of a form is no edge of it |
| blacks too intense | do | no pure black fill under things, inner lines take the colour of what they lie on |
| hair not sleek | do | each lock has its own axes, root to tip and lit side to dark side (`bold/locks.ts`); shade, light, hue and ring are said in those axes |
| things at the back softer | do | `depth`, 0 to 1 per part: paler, bluer, softer line |
| maybe the line art | both | yes, also: a fine line art is now kept as the artist inked it instead of redrawn. The redraw broke thin lines into dashes |

Also: `scripts/clean.ts` turns grey fills into paper before anything is numbered (it must not change afterwards: it renumbers patches). `wedge` and hand-cut polygons for cloth the artist left open.
Learned: the line art decides a lot. The head is about 205 px in both drawings; the fine one carries more form.
Open: cloth folds are typed coordinates; large cloth stays plain; wide hair areas with open lines (bun) still muddy; small metal is busy; no glow or colour fringing; sleeve and jacket edges a little jagged at 400%.

## Third round, `visor`, fine rendering (trial)
| Client's note | Kind | Answer |
|---|---|---|
| inner lines softer, like the one under the armpit | do | a line inside one form takes a darker step of the colour it lies on; a line between forms stays dark; printed marks stay ink (`print`). Decided per stroke, not per pixel |
| bounce light, cold, "neon" | do | a hard cold strip along edges that face away from the sun and have something further back behind them: blue on navy and white, violet on red, pink on skin |
| eyebrows missing | forgot | `brows`: under the line, faint through the hair |
| greyscale too soft, check at each stage | see | `scripts/value.ts` beside the references; grey in every review sheet. Palette planned again: navy darker, trousers and white lighter, jacket from coral to red |
| shapes off the lines, unclear volume; a long refining step piece by piece | do | facets (`tools/facets.ts`): the artist's lines, even the faintest, cut a piece into numbered facets; an agent gives each a tone. `scripts/review.ts` shows one piece as line art, colour, shadow design, grey |
| cold hue in shade, warm in light | do | shade factors colder; inside a shade it cools with distance, inside a light it warms towards the sun |

Measured: dark fills 7 to 14% (e 9, f 37, g 33), 5th percentile 74 to 42 (47, 22, 41), black share 4.1 to 5.5 (6 to 14). The step between two planes (median 52 to 38) is still larger than the references' (19 to 23), which have many soft steps; the edge width is noisy, do not read much into it.
Learned: shading by machine alone is either blobs or spots. Machine finds the pieces, the agent decides the tone, the machine cuts and lays it. 430 facets in 32 pieces took one pass. Hair shaded by rule looked like a leopard; by facet it became the sleekest part.
Open: third soft step in shades; metal still by rule and busy; crate, hands, belt not facet-rendered; big cloth where the artist drew no line stays one tone; eyes typed; hair highlight zigzag is mechanical.

## Fourth round, `visor`: reflected light and scattering (trial)
| Client's note | Kind | Answer |
|---|---|---|
| bolder bounce, a shape and not a thin line | do | a plane as wide as a share of its form, tapered at both ends, with a darker step inside it; and tone `B`, so the agent can hand whole facets to the second light (the navy side of the body) |
| subsurface scattering where a form turns softly | do | a band of the form's own colour between light and shade: rose on skin, pink to lavender on white, maroon on dark cloth. Only on soft turns and round parts (`scatter`); casts and folds have none |
| bounce inside a shade, lower than the light | do | a shade is darkest just behind its edge, then lighter and cooler towards the far side. Every reflected colour is capped at 0.88 of the base's value, dark things excepted |
| no blue where the surroundings are not blue | do | open air behind an edge gives the cold light; another surface gives its own colour (orange under a leaf); only something lower in the stack gives; peel and leaf take no cold light at all |

Read off the references: skin `#fcf0f2` > `#ebced2` > `#bb95a6`; cloth grey > `#3f2338` > black; breast 249 > 203 right behind the edge > 213 to 226 further in.
Step between planes 38 to 33 (references 19 to 23).
Learned: a smoothing that suits a big shade erases a thin strip, so each mask needs its own. Before calling a comparison, check that the file was really rewritten: one render failed and the old image was compared with itself.
Open: the cold light has one fixed colour per material, not a declared light with a place; skin half tones still wander on the shoulder; metal, crate, hands, face not fine-rendered.

## Fifth round, `visor`: form first, values gated (trial)
| Client's note | Kind | Answer |
|---|---|---|
| shoulder shade does not follow the form; an arm is a cylinder; base from geometry, exceptions on top | do | `solids` (`bold/solids.ts`): tubes and balls give shade, half tone and far side from one smooth field. Casts, folds and facets come after and may only add, or cut light back with `L` |
| contrast went off in the darks again; check it at every step, it gates a final piece | see, forgot | `scripts/gate.ts`: a value plan (`values`: dark, mid, light parts) and measurements after flats, form, deep shade, bounce, final. It found the leak at once: the air pass lifted the darks from 21 to 18% |

Measured (fills, against e f g): dark 14 to 24% (9, 37, 33), p5 41 to 30 (47, 22, 41). Gate: all pass but two fruits 1 and 3 points over the mid band.
Learned: the lumps on the shoulder were an old facet tone drawing over the solid; isolate one layer at a time before changing a shape. A measured radius runs through what lies on top: next to the body give the radius. Nothing that comes late may mix towards a light colour; tint by multiplying.
Open: solids placed by typed axis points; only limbs, fruit, bust, bun have them. Face, hair mass, crate, shoes, metal do not. Steps between planes 34 (19 to 23).

## Sixth round, `visor`: a 3D blockout before any shading (trial)
| Client's note | Kind | Answer |
|---|---|---|
| stop chasing notes one by one; have a clear picture of the 3D forms (triangles), then only apply shades to them and nothing that goes off that structure | see | `src/form/`: the whole figure as a low-poly mesh in the drawing's own view, with depth. `scripts/form.ts` measures it against the line art and turns it around |

How it is made: each form is typed from what is seen (its two outlines) and what is judged (depth). Outlines are then pulled onto the drawn line (`settle`), depth is never touched, cloth lies taut over the body (`drape`), the head is a model posed on the drawn eyes, nose, mouth, chin and ear (`solve`).
Checks that do not need taste: the right form shows at 97.3% of the figure's pixels (84% as first typed), 2.0% outside it. A wrong depth shows up as the wrong form in front. Left and right limbs must be equally long in space: 170/173, 168/182, 275/287, 278/294 px. Pose landmarks miss by about 8 px.
Learned: limb lengths fix most of the depth. Forms that come toward the viewer need rings that tip back; computed from depth, not typed. Typed outlines were off by 3 to 10 px, always the same way; do not retype, settle. Ear-clipped cloth has slivers; use even triangles.
Open: folds are not in the mesh; hair is a mass with few locks, the bun a ball; face planes are a standard head, not this face; what no line shows (backs, far sides) is a guess. Shading is not driven by it yet.

## Seventh round, `visor`: shading from the blockout (trial)
| Client's note | Kind | Answer |
|---|---|---|
| no full 3D render needed: understand the form, see where it breaks the basic cylinders, find better shapes | see, do | `form.ts --field` asks the mesh per pixel (facing, casts by rays, enclosure). `scripts/guide.ts` prints that as a guide under the line art: shade blue, half tone pale, cast violet, far side teal. An agent then draws the shadow shapes over it, snapped to the artist's lines (`shadows`, `bold/shadows.ts`) |

Tried in this order, each looked at beside the last round:
1. Mesh shading straight into the render: right, but soft-edged, blobby, hair ruined, trousers without folds. Better than nothing, worse than round five.
2. Facets and fold ridges tilting the mesh normals: noisy steps, edges where no artist would put one.
3. Mesh as a guide, shapes drawn by the agent: clear win. Form decides where, the drawn line decides the edge.
Learned: the mesh is for understanding, not for rendering. Use it directly only for simple solids (fruit, crate, leaves, bands) and long casts; draw everything the artist has lines for; leave hair to its locks. A physically right cast can still read as a blot (leaf shadows floating on the fruit): keep it attached. A change of light to please one spot cost dark value everywhere: the gate showed it (24 to 20%), so the light went back.
Open: hands, shoes, belt, crate fittings, hair not designed yet; shapes are typed points; one fully shaded part (coat) is under its value band.

## Eighth round, `visor`: depth casts back, simple shapes, a clean face, warm skin shade (trial)
| Client's note | Kind | Answer |
|---|---|---|
| leaf on the orange, visor on the head, belt and pack on the legs: those shadows give depth, keep them | see | drawn back as shapes over the mesh casts. I had removed them in round seven as "blots": a cast that stands clear of its caster is exactly what shows distance |
| uneven shadows must be simpler, even against the 3D form | do | the tail is designed lock by lock (one shape each); reflected strips taken off designed parts; every mesh edge on hair dropped |
| the face does not follow the 3D form; clean even if flat | see | rule in the engine: the form never shades the part `face`. Only casts of the hair, plus a sliver that frames the chin |
| skin shade too cold; overlay orange | see, do | overlay pass (255,146,72) on skin in shade, its soft edge, and lightly on warm hair. No cold second light on face and ear |

Measured, skin shade: references e 205/148/148 and 225/187/181, f 205/136/140, g 188/153/169 (cool light in that piece). Hue 357 to 8, saturation 28 to 34.
Learned: the mesh guide is an argument, the style decides. Three kinds of part: solids follow the form; cloth and hair follow it in simplified shapes; the face does not follow it. Before removing a shadow, ask whether it tells a distance.
Open: hands, shoes, crate fittings not designed; edges of strand casts on the bangs a little ragged at 400%.

## Ninth round, `visor`: the second light had vanished again (trial)
| Client's note | Kind | Answer |
|---|---|---|
| bounce light is missing, it was there before | forgot, see | two causes: with a mesh, every part counted as "round" and the strict test for round parts almost never passed; and the shadow design had no tone for it, so designing a part deleted it |

Built: tone `B` in the shadow design, with an automatic darker inner step; undesigned parts find it from line to line again; skin answers in peach, not pink. `gate.ts` measures second light on far edges (59%, must be 45%) and lists parts with almost none.
Learned: the guide's teal had shown the place all along. A step that is nobody's job gets lost.
Cost: darkest twentieth 33 to 38 (limit 42), because strips that were deep are now lit.
Open: the share says present or not, not whether the shapes are good. Tassel, belt, hips, crate edges, shoe straps and tongue, right ankle band have none.
