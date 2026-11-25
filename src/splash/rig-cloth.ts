/** Jacket. Turning planes come from the light (ball, turn), folds and seams from the kit, lights last. */
import type { Shape } from "./engine.ts"
import { fold, say, seam } from "./shapes.ts"

export const CLOTH: ReadonlyArray<Shape> = [
  /* big planes */
  say("s1", "cap patch", "shoulder", "ball s507@.7 s511@.75 s508@.35 s652@.62 .34"),
  say("s1", "patch", "patchTurn", "line s515@.22 ~.14 s515@.76 > s515@.5:s515@.2:.12"),
  say("s2", "patch", "patchDeep", "band s515[.46..0.74] u 0 16 14 0", "patchTurn"),
  say("s1", "stripe", "stripeR", "band s690[0..0.3] u 20 16 0"),
  say("s1", "sleeve", "armUnder", "band s730[.0..1] d 0 30 36 24"),
  say("s1", "sleeve", "upperArm", "line s652@.24 ~.1 s683@.26 > s651@.5:s683@.15:.3"),
  say("s1", "sleeve", "lowerArm", "line s690@.26 ~.08 s730@.3 ~-.12 s689@1 > s689@.6:s730@.2:.3"),
  say("s1", "sleeve", "gusset", "fill s563@.5:s606@.3:.5"),
  say("s1", "sleeve", "gusset2", "fill s606@.9:s666@.4:.5"),
  say("s1", "inner", "innerAll", "all"),
  say("s1", "panel", "panTurn", "line s729@.3 ~.12 s768@.6 > s729@.8:s768@.85:.4"),
  say("s1", "jack tape zip", "chest", "ball s590@.3 s634@.8 s584@.12 s759@1 .06"),
  say("s1", "collar", "collarTurn", "line s488@.48 ~.05 s510@.5 > s488@.8:s510@.9:.4"),
  say("s1", "colIn", "colInAll", "all"),
  say("s2", "colIn", "colInDeep", "band s506[0..1] r 16 30 26 14", "colInAll"),
  say("s1", "jack", "slit", "fill s511@.3:s522@.4:.5"), say("s1", "jack", "under", "fill s510@.8:s525@.4:.4"), say("s1", "jack", "backC", "fill s518@.5:s519@.5:.5"), say("s1", "jack", "backD", "band s551[0..1] l 0 22 18 8"), say("s1", "jack", "backA", "fill s548@.6:s549@.5:.5"), say("s1", "jack", "backB", "fill s583@.5:s546@.85:.5"),
  say("s2", "inner", "innerDeep", "band s736[0..1] l 20 44 40", "innerAll"),
  say("s2", "sleeve", "gussetDeep", "band s564[.1..1] l 0 20 16 6", "gusset"),
  say("s2", "cap patch", "shoulderDeep", "band s511[.35..1] l 0 16 18 10", "shoulder"),
  say("s2", "jack", "chestDeep", "band s634[.45..1] l 0 26 34 30", "chest"),
  /* folds */
  ...fold("f495", "collar", "s495", 18), ...fold("f502", "collar", "s502", 14), ...fold("f730", "sleeve", "s730[.02..1]", 16), ...fold("f606", "sleeve", "s606", 14, 0), ...fold("f737", "inner", "s737", 30), ...fold("f632", "jack", "s632", 22), ...fold("f759", "jack", "s759", 22), ...fold("f679", "jack", "s679", 18), ...fold("f615", "cap", "s615", 12), ...fold("f533", "jack", "s533", 16), ...fold("f554", "jack", "s554", 14, 0), ...fold("f574", "jack", "s574", 12), ...fold("f549", "jack", "s549", 14), ...fold("f762", "jack", "s762", 14), ...fold("f768", "panel", "s768", 18),
  say("s1", "collar", "colLow", "band s508[.1..0.7] u 0 12 9 0"), say("s1", "cap", "capLow", "band s652[.12..0.95] u 0 18 22 12"),
  /* seams and padded panels */
  say("s1", "cap", "m515b", "band s515[.46..0.95] away 4 6 6 4"), say("s1", "sleeve", "m690", "band s690[.1..1] away 5 7 7 4"), say("s1", "collar", "m488", "band s488[0..0.58] away 4 6 6 4"), say("s1", "jack", "m584", "band s584[.06..1] away 5 8 8 5"), ...seam("m590", "jack", "s590", 8, 0.5), say("s1", "sleeve", "m652", "band s652[.1..0.9] away 5 8 8 5"),
  say("s2", "sleeve", "capUnder", "band s652[.1..0.97] d 0 24 26 12"),
  say("lt", "cap", "capLit", "band s507[.02..0.3] d 0 10 0", undefined, 0.8), say("lt", "jack", "litChest", "flow s584[.1..0.5] s634[.05..0.35] .3 0 .2 0", undefined, 0.8), say("lt", "collar", "colLit", "band s494[.1..0.9] r 0 14 12 0", undefined, 0.7), say("lt", "sleeve", "armLit", "band s676[.1..0.9] r 0 16 12 0", undefined, 0.7),
  /* lit planes: one per mass, where the light meets it square */
  say("lt", "panel", "crestPanel", "crest s590@.3 s634@.8 s584@.12 s759@1 .93", undefined, 0.6), say("lt", "sleeve", "crestArm", "crest s676@.3 s651@.9 s652@.6 s690@.5 .9", undefined, 0.7), say("lt", "collar", "crestCollar", "flow s494[.05..0.9] s495[.2..1] .42 0 .5 .4 0", undefined, 0.6),
]
