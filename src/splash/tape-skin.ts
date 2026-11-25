/** Face, neck, arms, hands. Form shadows are one line across a tube; every finger is dark on the side away from the light. */
import type { Shape } from "./engine.ts"
import { say } from "./shapes.ts"

export const SKIN: ReadonlyArray<Shape> = [
  /* face and neck */
  say("s1", "face", "nose", "run s113[.5..1] ~-.22 s113@.5"),
  say("s1", "neck", "neckL", "fill s216@.3:s208@.5:.5"),
  say("s1", "neck", "neckR", "fill s219@.4:s180@.7:.5"),
  say("s2", "neck", "underJaw", "line s208@.6 ~-.05 s192@.25 > s180@.35:s219@.6:.1", "neckR"),
  say("s2", "neck", "underEar", "band s204[0..1] r 3 6 4", "neckL"),
  /* near arm: one form shadow across the tube, the body beside it in its shade */
  say("form", "armL", "armForm", "line s268@.36 ~.05 s255@.3 > s268@.8:s255@.6:.3"),
  say("s1", "armL", "side", "line s255@.25 ~-.06 s233@.7 > s255@.8:s233@.88:.4"),
  say("s1", "armL", "crease", "band s256[0..1] u 0 4 0"),
  say("s2", "armL", "armpit", "band s255[.3..1] r 0 8 11 4", "side"),
  say("form", "armR", "armRForm", "line s250@.42 ~.1 s260@.7 > s250@.8:s260@.85:.4"),
  /* raised hand */
  say("form", "handR", "wrist", "line s155@.08 ~-.04 s226@.45 > s155@.7:s226@.8:.4"),
  say("s1", "handR", "finger1", "band s111[.1..0.9] d 0 5 6 0"),
  say("s1", "handR", "finger0", "band s97[.15..0.7] l 0 6 0"),
  say("s1", "handR", "finger2", "band s138[.1..1] u 0 5 0"),
  say("s1", "handR", "knuckle1", "band s161[.1..0.95] r 0 5 7 3"),
  say("s1", "handR", "knuckle2", "band s177[.1..0.95] r 0 5 7 3"),
  say("s1", "handR", "palm", "run s201[.45..0] s200[0..1] s199[0..0.3] ~-.22 s201@.45"),
  say("s1", "handR", "curl", "band s174[.4..0.9] u 0 4 5 0"),
  /* resting hand */
  say("form", "handL", "back", "line s390@.75 ~.07 s417@.6:s424@.95:.35 ~-.07 s464@.3 > s430@.4:s460@.1:.15"),
  say("s1", "handL", "f1", "band s449[.1..1] l 0 6 8 5"),
  say("s1", "handL", "f2", "band s448[.08..1] l 0 7 9 5"),
  say("s1", "handL", "f3", "band s460[.06..1] l 0 6 8 4"),
  say("s1", "handL", "f4", "band s464[.35..0.95] l 0 7 9 4"),
  say("s1", "handL", "thumb", "band s424[.05..0.9] d 0 5 4 0"),
  say("form", "face", "jaw", "band s180[.02..0.5] u 0 9 10 5 0"),
]
