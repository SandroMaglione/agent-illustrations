# Research: how anime splash art is rendered, as executable passes

Tags: **[S]** from a source (list in D), **[M]** measured on the splash reference (1258x1482) or on `output/oni-final.png`, **[I]** my inference.
Units: `W` = canvas width (736 in line-art coordinates), `HH` = head height (crown to chin, about 380 px on the oni). Lightness and chroma are OKLCH; "V" is HSV value where a source or measurement used it.

## The three findings that matter most

1. **The reference is mostly flat.** 83% of skin pixels are the light tone, 14% shade, 3% the band between [M]. Hair is 62% mid, 27% shadow, 4% deep, 7% highlight [M]. Rendering there means few, large, designed shapes, not many gradients.
2. **Highlights are quiet.** The hair highlight is only +8 V and less saturated than the base (#648674 to #859f93) [M]. Bright white is reserved for 4 or 5 tiny marks: eye, nose tip, thigh, orb [M].
3. **The latex look in the oni comes from three stacked things** [M]: a mauve band beside every ink line, tone bands that run parallel to the contour (inflation shading), and white streaks on every material. None of these exists on cloth in the reference.

## A. Process

Each pass writes its own layer and never repaints an earlier one. Shadows are multiply layers over flats, lights are screen or add layers [S1, S2, S5].

### 1. Value plan (before any colour)
- **Goal:** decide light and shadow masses and the focal point.
- **Do:** render regions in grey. Assign each material a local value in three groups: light (L 0.85-0.97), mid (0.45-0.65), dark (0.15-0.30). Neighbouring regions should differ by at least 0.12 L or share an outline of full weight [I, from S9]. Choose one light direction (keep upper left, about 35° above horizontal).
- **Rule:** a white object's shadow is about V 50, a mid-grey object's about V 25; dark objects get fewer steps [S1].
- **Mistake:** colouring first, then finding the picture has no value structure [S1].
- **Check:** downscale to 96 px wide, greyscale, posterize to 3 levels. Face must be the largest light shape touching the darkest shape (lashes, hair shadow) [I, S9].

### 2. Flats
- **Goal:** local colour only, one colour per region, no gaps.
- **Do:** pick bases lighter than the intended final, since shadows only darken [S6, S11]. Keep 85% of the figure area below chroma 0.08 (reference: 86% of figure pixels under S 0.3 [M]). Allow 2 or 3 accents at chroma 0.15-0.22, each under 3% of figure area (reference: lime tabs, orange strap, gold buttons [M]).
- **Mistake:** every region saturated. The oni's saturation mode is S 0.6 [M].
- **Check:** flats alone must read as a finished sticker at 96 px.

### 3. Local gradients
- **Goal:** large slow value drift, so flat areas are not dead.
- **Do:** per region, one linear gradient along the region's long axis, total change 0.03-0.06 L, darker and cooler away from the light or toward the bottom. Hair: top to bottom about x0.72 in value (#668a78 to #465e53 [M]). Skin: none, or under 0.02 L [M].
- **Must not:** follow the contour. A gradient that hugs the outline is pillow shading [I].
- **Check:** crop any 5% W square: it should look flat.

### 4. Occlusion and contact (light-independent)
- **Goal:** depth where forms meet, before any directional light [S1].
- **Do:** multiply layer at 40-50% [S1 uses 44%]. Only at junctions of two different regions where one overlaps the other: under hood rim, under chin, sleeve into cuff, hair against neck. Width 1-2% W, hard on the occluder side, fading over 1% W on the other.
- **Must not:** run along inner crease lines of the same region. That is the mauve band in the oni.
- **Check:** with this layer alone the figure reads as stacked paper cut-outs.

### 5. Form shadow (first shadow)
- **Goal:** the one shape per region that states volume.
- **Do:** threshold a low-frequency normal field (blur normals by 6-10% of the region's width first), so the terminator is one long curve. Target shadow share by material: skin 12-18%, cloth 25-40%, hair 25-35% [M]. Tone: skin L x0.79, warmer; cloth L x0.66-0.73, cooler, chroma equal or slightly lower [M]. Move hue by adding a tint, not rotating; yellow darkens toward orange [S8, style-notes].
- **Shape rules:** [I, consistent with S3, S7] one side of each shadow shape is a long simple curve, the other side follows form with 1-3 pointed notches at folds. Straights against curves. No shape narrower than 0.6% W unless it is a deliberate accent.
- **Mistake:** shadow on both sides of a form; shadow as an inset copy of the outline.
- **Check:** fill shadows flat black on white: the shapes should be readable as design, and count under about 12 for the whole jacket.

### 6. Cast shadows
- **Goal:** explain overlaps and the light direction.
- **Do:** offset the occluder mask along the light vector. Offsets: bangs on forehead 2.5-3.5% HH; head on neck fills most of the neck; hood on jacket 3-4% W; horn on hair 2% HH. Same tone as the form shadow (they merge into one mass) [M: neck and under-chin shadow in the reference is one shape]. Edge hard.
- **Must not:** cast from thin lines or decals.
- **Check:** cast and form shadow must be indistinguishable in tone where they touch.

### 7. Edge control
- **Goal:** material reads from the edge width, not from highlights.
- **Do:** set the light-to-shadow transition per material: skin 0.25% W (about 2 px) with a saturated warm band, chroma +0.03 to +0.05, L between the two tones (#e8bcb1 [M]); matte cloth 0.8% W (about 6 px), plain blend, no band [M]; hair, metal, horn, leather: 0-1 px. Cast shadows: hard at the occluder, optionally 2x softer at the far end.
- **Sources:** "terminator" as its own adjustable layer [S1]; hard brushes on characters [S3]; gal-game style softens only the lower part of a hard shadow [S4, S6].
- **Check:** at 400% you can name the material from the edge alone.

### 8. Second shadow (accent darks)
- **Goal:** depth in 3 to 6 key places only.
- **Do:** inside existing shadow, never in light. Tone: shadow x0.75 L. Area under 15% of the shadow mass (reference deep hair tone is 4% of hair [M]). Places: under hood interior, hair behind the neck, inside the ear, armpit of the sleeve, under the collar.
- **Check:** remove it: the picture should lose punch but not form.

### 9. Bounce and rim
- **Goal:** separate shadow-side silhouettes.
- **Do:** thin band inside the shadow-side contour, width 0.15-0.4% W, hard edge, tone = shadow + ambient colour at 35-50% screen. On skin the reference has a pale 1-2 px rim just inside the ink (#e2d8da) [M]; on hard objects a cool blue rim [style-notes, M]. Coloured reflections use screen on light objects, normal on dark ones [S1].
- **Must not:** be brighter than the light tone of that region.
- **Check:** rim present on at most 30% of the contour length.

### 10. Material speculars
- **Goal:** state gloss only where the material has it.
- **Do:** see recipes. Budget for the whole figure: pure white marks under 0.3% of figure area; cloth gets none. Highlights are tinted with the base colour, not white, except on wet, glass, metal [S5, S8].
- **Check:** hide the layer: only metal, eyes, horn, gem should change.

### 11. Face and eyes
See recipes. Done after the body so its contrast can be set as the maximum in the image.

### 12. Line colour (iro-trace)
- **Do:** silhouette lines near black (L 0.12-0.18) tinted to the local hue; interior lines = local shadow colour x0.55 L; lines between two skin areas dark red-brown; lash lines keep near black with a red-brown tip at the outer corner (#6b2a1c-like in the reference [M]). No line for blush, nose light, decals [style-notes M]. Thicken silhouette to 1.5x inner width; fill acute corners with ink.
- **Source status:** line tinting is common practice [S3 mentions studio colour-trace]; exact tones are [M]/[I].
- **Check:** in greyscale, inner lines are lighter than silhouette lines.

### 13. Decals and graphic marks
- **Do:** printed patches are flat fills multiplied by the cloth's shadow layer at 100% and nothing else: no own highlight, no outline halo. Add 1 or 2 micro-labels or stripes at 0.5% W text height, as the reference does [M: "N.E.P.S", "01 NEO-GENESIS VI", "CAUTION"].
- **Check:** decal contrast drops inside shadow.

### 14. Background and separation
- **Do:** background chroma at most 60% of the figure's accent chroma and value at least 0.25 L away from the figure's silhouette average. Keep a 0.3% W pale keyline only between figure parts that overlap each other, not against the page [style-notes M]. No drop shadow.
- **Check:** at 96 px the figure outline is unbroken.

### 15. Unify and finish
In this order:
1. Ambient multiply gradient over the whole figure, from the far or lower end: up to 12% darker and cooler across the bottom 30% [I; S1 "distance" layer].
2. Glow: duplicate the flattened image, raise levels so only lights survive, Gaussian blur 4-6% W (60-90 px on a typical 1500-2000 px canvas [S5a]), screen at 10-20% [S5b]. Optional soft-light copy for contrast [S5a]; add at 20-60%, 35 typical [S5a].
3. Grain: monochrome noise, std 2/255 on cloth and hair, under 1 on skin, 1 px at the reference scale [M].
4. Chromatic offset: 1 px R/B shift, edges only, optional [S5c describes the method; I found no evidence the reference uses it].
5. Grade: small S-curve, shadows toward blue-violet by 0.01-0.02 chroma [I].
- **Check:** blink compare with pass 14: forms must not change, only air.

## B. Recipes

**Eyes** (order) [S10, S6, M]
1. White: light grey-warm, not pure white (L 0.93); cast shadow from lid across top 30-40%, hard edge, cool grey.
2. Iris base, mid value.
3. Top-down dark gradient: upper half toward the lash colour, so iris merges with the lid line.
4. Outer ring 6-8% of iris radius, darker.
5. Pupil: dark, soft lower edge.
6. Lower crescent light: brighter and more saturated or hue-shifted (reference: yellow-green pool on a green iris, with a thin cyan edge) on the lower 30%, opposite the highlight.
7. Lash thickness: black, red-brown at outer tip and where it crosses skin.
8. Highlight above the line art: one main, round-rect, 12-15% of iris width, upper side toward the light; one secondary dot at 30% of that size. Tinted off-white.

**Skin and face** [M, S6, S2, S4]
1. Flat, L 0.94, low chroma.
2. One shadow tone (L x0.79, warmer, hue toward red), in: hair cast on forehead, eye sockets under the lid only, under nose as a tiny notch or nothing, upper lip no, under lower lip tiny, under chin and the whole neck, far ear interior.
3. Warm band on those edges (pass 7).
4. Blush: soft ellipse, 12% HH wide, chroma +0.03, at 25-35%; plus 3 short strokes optional.
5. Nose: one white dot or lozenge, 1.5% HH, and a 2 px dark tick. No nose shadow shape.
6. Lips: only a darker mid line and a soft tint on the lower lip.
7. Rim from pass 9 on the shadow side of limbs. Shadow colour check: if the neck looks grey, the shadow is too cool [S2].

**Hair** [M, S7, S11]
1. Flat + vertical gradient (pass 3).
2. Big shadow masses: under the crown overlap, behind the ears, under each bang clump on one side only, everything behind the neck. Hard edges, pointed ends that follow strand direction.
3. Clump separations: thin dark tapered slivers from the tips upward, 15-40% of clump length, 5 to 9 on the bangs, uneven spacing.
4. Deep tone only behind the neck and under the hood.
5. Highlight: one band across the skull curve at 25-30% down from the crown, height 3% HH, tone +8 V and less saturated; broken into 6-10 trapezoids with gaps of unequal width, side edges hard and slanted with the strands, top and bottom edges softer (about 4 px) [M]. Gaps fall on clump separations. A second weaker band is allowed on a long fall. No white dashes.
6. Skin show-through on bangs near the face: soft skin-tinted airbrush at 15-25% on the lower bang ends [common practice; I found no numeric source].
7. Flyaways: 3 to 6 single lines outside the silhouette.
On white or silver hair the base must sit at L 0.82-0.86 so shadows carry the design; highlights then only need L 0.93 [I].

**Horn / keratin** [I, from M of the orb and staff]: flat, hard two-tone, one hard narrow highlight along the ridge at 60% length, cool rim on the shadow side, darker gradient to the root.

**Matte cloth (hoodie, cotton)**: 2 tones + accent dark, 6 px edge, zero highlight. Shadow shapes from fold type [S12]: pipe folds give long tapered wedges from the tension point; zigzag (bent sleeve) gives alternating diamonds on the inside of the bend; spiral (pushed-up sleeve) gives parallel crescents wrapping the tube; compression at cuff gives short stacked wedges.

**Nylon / bomber**: same as matte, then at most 2 broad soft sheens per panel on fold crests facing the light, tone +0.05 L, width 3-5% W, opacity 30-40%, never white [I; S8 on satin-type fabrics].

**Denim**: 2 tones, 4 px edge, visible grain std 3, seam lines lighter than the cloth, slight fade (+0.04 L) on the thigh crest.

**Rib knit (cuff, hem)**: per rib a 1 px dark groove, no per-rib highlight; one overall form shadow across all ribs.

**Leather / patent**: hard edge, high contrast, hard highlight shapes with the darkest tone placed next to them [S8].

**Metal (zip, snaps)**: 3 hard tones; dark band next to the highlight; one white spark per piece, 1-2 px [S8, M: belt buckles are flat grey planes].

**Gold**: base ochre, shadow toward orange-brown, highlight pale yellow; hue shift allowed here [S8].

**Gem**: saturated base, darker top half, light lower crescent, one large and one small white oval (reference orb [M]).

**Ember and smoke** [I]: ember = 2 px core white-yellow, orange ring, add-mode glow radius 1.5% W at 50%; glow may tint the lip by 10%. Smoke = flat pale shape at 60-70% opacity, hard edge, no interior shading.

## C. Critique of `output/oni-final.png` (line-art coordinates 736x1104)

1. **Remove the mauve band beside every inner line on the jacket** (sleeve 200-470, 560-900). It makes each fold a rubber tube. Replace with pass 5 wedges on one side only.
2. **Stop contour-parallel shading.** Hood (340-705, 340-625) and sleeve show tone bands that copy the outline. Blur the normal field and threshold once.
3. **Delete white streaks from cloth**: hood (410-560, 440-470), sleeve (290, 590 and 250, 780), red top (175, 650), jeans (440, 1010), cuff (150-280, 900-1040). Keep white for eyes, horn ridge, snaps, earring.
4. **Hair highlights**: the white dash rows at y about 165, 355 and 690 are V 99 on a V 80 shadow [M], regular like a barcode. Lower hair base to L 0.84, use one broken trapezoid band at y about 150-165 and a weak one at 690.
5. **Give the hair shadow masses**: all hair right of the neck and inside the hood (400-600, 330-470), under the horn roots, behind the ear, one side of each bang clump. Currently the hair is nearly one tone.
6. **Cut saturation overall.** Mode is S 0.6 against the reference's S below 0.3 [M]. Keep the yellow jacket as the accent; drop hood, jeans and cuff chroma by 40% and separate their values (hood L 0.28, jeans L 0.45, cuff L 0.22); they now merge into one navy mass.
7. **Skin shadow is violet-grey** (neck 420, 355 is #c599aa, hue 336) [M]. Move to a warm red-brown x0.79 with the pink band; make chin and neck one shape; remove the soft face gradients around the cheek (300-400, 280-330).
8. **Background competes.** The orange type (S 64) is as saturated as the jacket and the offset drop shadow thickens the silhouette on the right (around 560-600, 150-330). Desaturate type to chroma 0.06, remove the drop shadow.
9. **Decals**: the wolf patch (315-470, 600-760) has its own gradient and a halo; make it flat and let the sleeve shadow cross it.
10. **Finish layer missing**: no grain, uniform black line. Add pass 12 line colours (skin lines red-brown around 300-420, 230-420) and pass 15 grain.

## D. Sources and evidence

- **S1** 兔子_Max, "Drawing Light and Shadow with 7 Layers", Clip Studio Tips: https://tips.clip-studio.com/en-us/articles/6449 (grey first; occlusion, distance, main shadow, terminator, glow, reflection, specular layers; V 50/25 rule; occlusion 44%).
- **S2** Anime Art Academy, shadow colours: https://animeartacademy.com/p/how-to-draw-anime-shadow-colors (multiply colours warm 217/168/177, pastel 254/200/219, cool 200/194/217; per-part choice; grey neck test).
- **S3** Konart, "Shading like an anime movie": https://tips.clip-studio.com/en-us/articles/3054 (hard untextured brushes on characters, uniform line, detail goes to background).
- **S4** Clip Studio, painting styles (anime-nuri, gal-game-nuri, atsunuri): https://www.clipstudio.net/oekaki/archives/152445 and https://www.clipstudio.net/oekaki/archives/152004 (read through search summaries only).
- **S5a** 蓓果, filter finishing: https://tips.clip-studio.com/en-us/articles/9248 (blur 60-90, soft light, add 20-60%). **S5b** glow: https://www.clipstudio.net/oekaki/archives/151074 (levels, blur, screen). **S5c** chromatic offset: https://www.clipstudio.net/oekaki/archives/169220 (summary only).
- **S6** Nanniimo, anime skin: https://www.clipstudio.net/how-to-draw/archives/161037 (base lighter than final; hard shadow under hair with soft lower part; blush; highlight).
- **S7** Liz Staley, cel shading tips: https://tips.clip-studio.com/en-us/articles/10901 (planes of the face; multiply about 50%).
- **S8** Highrise art guide, materials: https://create.highrise.game/learn/designer-resources/artguides/material (2-3 tones; no pure white; metal = dark beside highlight; yellow shades to orange; minimal hue shift).
- **S9** Value grouping: https://www.creativebloq.com/features/everything-you-need-to-know-about-tonal-values and https://www.proko.com/course-lesson/project-designing-value-groups (summaries only).
- **S10** Eyes in 6 steps: https://clipstudio.net/how-to-draw/archives/159611 (top gradient, lower light, no pure white, highlight above line art).
- **S11** Shadow colour choice: https://www.clipstudio.net/oekaki/archives/151736 (darkening by value alone dulls; shift saturation and hue toward red on skin).
- **S12** Fold types: https://www.pluralsight.com/blog/creative-professional/the-6-fold-types-every-illustrator-should-know-for-drawing-clothing and https://www.proko.com/lesson/a-review-of-the-7-folds (names only; the shadow shapes per fold are my inference).
- **S13** ZZZ direction: https://zenless.hoyoverse.com/en-us/news/123577 (graphic design as a priority, urban signage; via search summary).

**No evidence found**
- No official or artist-written breakdown of how ZZZ splash illustrations are painted. No GDC or CEDEC talk on the 2D art surfaced. Everything ZZZ-specific here is measured from the one reference or inferred.
- No source gives numbers for the saturated terminator band, rim width, grain amount, line colours or highlight contrast. Those numbers are all [M].
- No source on halftone or chromatic offset in ZZZ splash art; the reference shows grain only.
- Nothing found specific to Honkai Star Rail, Wuthering Waves, Arknights or Persona illustration process. Not covered.
- Bang transparency, ember, smoke, horn and denim recipes are inference from general practice.

**What makes the reference read as ZZZ** [M, I]: low-chroma greyed locals with tiny neon accents; very large flat light masses; hard cel shadows with soft edges only on cloth; quiet tinted highlights; even grain; thin near-black line with filled corners; technical micro-typography on gear; hard-surface props drawn as flat grey planes.
