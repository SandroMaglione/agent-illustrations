import type { Shape } from "./engine.ts"
import { say } from "./shapes.ts"

export const GEAR: ReadonlyArray<Shape> = [
  /* lenses: one shade, one diagonal reflection, one chip */
  say("lt", "lens", "glassA", "run s16@.22 ~0 s16@.46 ~0 s15@.44 ~0 s15@.28 ~0 s16@.22", undefined, 0.55),
  say("lt", "lens", "glassA2", "run s16@.54 ~0 s16@.6 ~0 s15@.54 ~0 s15@.49 ~0 s16@.54", undefined, 0.5),
 
  say("lt", "lens", "glassB", "run s37@.14 ~0 s37@.36 ~0 s36@.62 ~0 s36@.38 ~0 s37@.14", undefined, 0.55),
  say("lt", "lens", "glassB2", "run s37@.44 ~0 s37@.5 ~0 s36@.76 ~0 s36@.69 ~0 s37@.44", undefined, 0.5),
 
  /* frames */
  say("hi", "rim", "rimAhi", "band s7[.08..0.3] r 0 4 0"), say("hi", "rim", "rimBhi", "band s20[.1..0.5] d 0 4 0"), say("s1", "rim", "rimBin", "fill s37@.8:s35@.8:.5"),
  /* screws and hinges */
  ...["s65[.2..0.9] l 0 6 4", "s83[0..1] u 5 6 5", "s71[.3..0.9] l 0 5 3", "s95[0..1] u 3 3", "s101[.3..0.8] l 0 6 3", "s122[0..1] u 5 6 5", "s108[.2..0.8] l 0 5 3"].map((t, i) => say("s1", "hw", `hw${i}`, `band ${t}`)),
  ...["s66[.2..0.5] d 0 4 0", "s64[.15..0.6] d 0 4 0", "s98[.2..0.5] d 0 4 0", "s100[.1..0.5] d 0 3 0"].map((t, i) => say("hi", "hw", `hwHi${i}`, `band ${t}`)),
  /* strap and buckle */
  say("s1", "strap", "strUp", "band s55[0..1] u 0 8 6 0"), say("s1", "strap", "strTail", "band s132[.1..0.95] r 0 8 8 0"), say("lt", "strap", "strLit", "band s74[.1..0.8] u 0 8 7 0", undefined, 0.7), say("lt", "strap", "strTailLit", "flow s132[.2..0.9] s155[.1..0.9] .62 0 .16 0", undefined, 0.8), 
  say("hi", "buckle", "bkHi", "band s62[.1..0.5] r 0 5 0"),
  say("lt", "tie", "tieLit", "band s372[.1..0.6] r 0 6 0"),
  /* zip */
 
 
  say("s2", "lens", "lensAdeep", "band s16[.02..0.95] d 0 9 8 4"), say("s2", "lens", "lensBdeep", "band s37[.02..0.9] d 0 9 8 4"),
  /* chips stand just outside the rim's shadow */
  say("hi", "lens", "chipA", "run s16@.12:s15@.7:.3 ~0 s16@.26:s15@.6:.3 ~0 s16@.22:s15@.6:.46 ~0 s16@.11:s15@.66:.44 ~0 s16@.12:s15@.7:.3"),
  say("hi", "lens", "chipB", "run s37@.08:s36@.75:.3 ~0 s37@.2:s36@.72:.28 ~0 s37@.17:s36@.72:.42 ~0 s37@.07:s36@.72:.42 ~0 s37@.08:s36@.75:.3"),
  /* metal: the darkest beside the brightest */
  say("s3", "buckle", "bkGroove", "band s79[.15..0.9] l 0 4 4 0"), say("hi", "buckle", "bkChip", "band s62[.05..0.22] r 0 7 0"),
 
  say("s1", "pull", "pullSide", "band s589[.5..0.98] l 0 9 9 5"), say("s2", "pull", "pullDeep", "band s589[.42..0.62] u 4 7 4"), say("hi", "pull", "pullChip", "band s589[.04..0.36] r 0 4 0"),
]
