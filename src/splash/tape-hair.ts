/** Hair, without a coordinate (?v=sheet&box=270,10,370,260). Few large planes, then wedges that stand on a drawn line and point along the strand. */
import type { Shape } from "./engine.ts"
import { lock, say } from "./shapes.ts"

export const HAIR: ReadonlyArray<Shape> = [
  /* side hair, left */
  say("s1", "hairF", "curtain", "line s17@.6 ~-.14 s207@.5 > s17@.95:s99@.95:.15"),
  say("s1", "hairF", "curtainLeft", "run s99@.35 ~.03 s182[.9..0.1] ~.03"),
  say("s1", "hairF", "spike", "line s137@.02 ~-.08 s99@.6 > s137@.6:s99@.75:.4"),
  say("s1", "hairF", "spikeFold", "fill s167@.5:s137@.9:.5"),
  say("s1", "hairF", "flick", "run s76[.05..1] ~-.2 s76@.05"),
  say("s1", "hairF", "flickFold", "fill s50@.5:s57@.6:.5"),
  say("s1", "hairF", "back85", "band s85[0..1] d 0 9 4"),
  say("s1", "hairF", "tip206", "band s206[0..1] l 0 6 4"),
  /* bangs */
  say("s1", "hairF", "bangTip", "run s92[.1..1] s100[1..0.3] ~-.07 s92@.1"),
  say("s1", "hairF", "lockFace", "line s17@.56 ~.08 s127@.6 > s17@.62:s81@.5:.85"),
  /* single strands */
  say("s1", "hairF", "hair1", "flow s9[0..1] s17[.05..0.5] .55 0 .07 0"),
  say("s1", "hairF", "hair2", "flow s3[.25..0.8] s9[.1..1] .5 0 .08 0"),
  say("s1", "hairF", "hair3", "flow s17[.06..0.42] s29[0..1] .55 0 .05 0"),
  say("s1", "hairF", "hair4", "flow s99[0..1] s17[.55..0.95] .35 0 .06 0"),
  say("s1", "hairF", "hair5", "flow s15[.05..0.8] s10[.3..1] .5 0 .08 0"),
  say("s1", "hairF", "hair6", "flow s103[0..0.9] s137[0..0.9] .3 0 .08 0"),
  /* right */
  say("s1", "hairF", "right15", "run s15[.3..1] s47[0..0.35] ~.12 s15@.3"),
  say("s1", "hairF", "right28", "run s28@.1 ~-.05 s40[.6..0.25] ~.05"),
  say("s1", "hairF", "lockCup", "line s79@1 ~.08 s160@.5 > s91@.6:s122@.5:.2"),
  say("s1", "hairF", "wedge13", "band s13[0..1] d 0 6 0"),
  say("s1", "hairF", "wedge19", "band s19[0..1] d 0 5 2"),
  say("s1", "hairF", "ahoge", "band s1[.1..1] u 0 4 9 10"),
  /* back hair: shade is the rule, light the exception */
  say("s1", "hairB", "backA", "fill s128@.6:s148@.4:.5"),
  say("s1", "hairB", "backB", "line s164@.05 ~.05 s196@.7 > s148@.8:s164@.5:.6"),
  say("s1", "hairB", "backC", "fill s168@.5:s175@.5:.5"),
  say("s1", "hairB", "backD", "line s186@.1 ~-.08 s214@.75 > s186@.8"),
  say("s1", "hairB", "backE", "run s178[.1..1] s179[0..1] ~-.14 s178@.1"),
  /* deep, only where hair dives under hair */
  say("s2", "hairF", "deepTip", "run s92[.6..1] s100[1..0.75] ~.05 s92@.6", "bangTip"),
  say("s2", "hairF", "deepSpike", "run s137[.3..0.8] ~-.08 s137@.3", "spike"),
  say("s2", "hairF", "deepCurtain", "band s17[.72..1] l 0 10 0", "curtain"),
  /* what every lock carries: highlight piece, teeth, strands */
  ...lock("crown", "s3[.1..0.9]", "s9[0..1]+s51[0..1]", { ring: [0.6, 0.085], side: ["b", 0.4], lit: 0.3 }),
  ...lock("part", "s9[.05..1]+s51[.2..1]", "s17[.1..0.6]", { ring: [0.5, 0.1, 0.1], side: ["b", 0.5] }),
  ...lock("bangA", "s17[.3..0.5]+s58[0..1]+s80[0..0.8]", "s29[.02..1]+s92[.1..0.5]", { ring: [0.3, 0.09], lit: 0.36 }),
  ...lock("bangB", "s29[.02..1]", "s14[.1..1]+s35[0..0.95]", { ring: [0.26, 0.1], side: ["a", 0.5], lit: 0.66 }),
  ...lock("right", "s18[.1..1]+s28[.2..1]", "s15[.05..1]+s47[0..0.5]", { ring: [0.4, 0.1], lit: 0.3 }),
  ...lock("backLock", "s148[0..1]", "s164[0..1]", { side: ["b", 0.6], on: "hairB" }),
  say("s1", "hairF", "bangWedge", "run s58@.6:s29@.5:.6 ~.04 s100[.36..0.16] ~.05"),
  say("s1", "hairF", "bangWedge2", "run s58@.6:s29@.6:.28 ~.03 s100[.14..0.02] ~.03"),
  say("s1", "hairF", "bangLeft", "run s58@.25 ~.03 s80[.75..0.2] ~-.04 s58@.25"),
  say("s1", "hairF", "bangRoot", "band s17[.12..0.4] r 0 10 7 0"),
  say("s1", "hairF", "rootL", "band s9[.02..0.5] r 0 9 0"),
  say("lt", "hairF", "litSide", "flow s99[0..0.95] s17[.6..0.95] .2 0 .15 0", undefined, 0.6),
  say("lt", "hairF", "litLock", "flow s17[.6..0.95] s81[0..1] .5 0 .16 0", undefined, 0.6),
  say("lt", "hairF", "litSpike", "band s103[.1..0.9] d 0 9 8 0", undefined, 0.6),
  say("lt", "hairF", "litFlick", "band s74[.05..0.9] d 0 5 6 0", undefined, 0.6),
]
