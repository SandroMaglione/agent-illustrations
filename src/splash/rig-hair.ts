/** Hair, lock by lock: two drawn lines, root to tip, and the set each carries (shapes.ts). Then what belongs to no lock. */
import type { Shape } from "./engine.ts"
import { lock, say } from "./shapes.ts"

export const HAIR: ReadonlyArray<Shape> = [
  /* one highlight band across the crown, below the goggles' shadow, cut only at the parting */
  say("ring", "hairF", "ringR", "ring s159@.2 s110@.62 s93@.9 s148@.36 s77@.74 s141@.52 s135@.64 ^ s22@.5 .07 .1 .12 .12 .1 .08 ~.13"),
  say("ring", "hairF", "ringL", "ring s58@.5 s112@.25 s157@.22 s102@.62 s147@.4 s165@.3 ^ s22@.5 .06 .1 .1 .1 .08 ~.13"),
  /* bangs */
  ...lock("b1", "s111[0..1]+s129[0..1]+s153[0..1]+s159[0..0.9]", "s87[.1..1]+s110[.42..1]", { side: ["x", 0.5], deep: true }),
  ...lock("b2", "s110[.1..1]+s159[.85..1]+s287[0..0.9]", "s93[.1..1]+s171[0..0.1]+s183[0..1]+s217[0..0.9]", { side: ["x", 0.34], lit: 0.4 }),
  ...lock("b3", "s93[0..0.6]+s148[.1..0.65]", "s77[0..1]", { tip: 0.22, side: ["x", 0.36], deep: true, lit: 0.3 }),
  ...lock("b4", "s77[.15..1]", "s141[0..1]", { tip: 0.34, side: ["x", 0.42] }),
  ...lock("b5", "s141[0..1]", "s135[.1..1]+s191[0..0.2]", { tip: 0.46, side: ["x", 0.34], deep: true, lit: 0.4 }),
  ...lock("cross", "s148[.1..1]", "s171[.1..1]", { side: ["x", 0.4], lit: 0.3 }),
  ...lock("b7", "s187[0..1]+s216[.6..1]", "s202[0..1]+s301[0..1]", { tip: 0.3, side: ["x", 0.5], lit: 0.36, root: 0.24 }),
  ...lock("b8", "s183[.1..1]+s216[0..0.6]", "s187[0..1]", { side: ["x", 0.6] }),
  ...lock("b9", "s207[0..1]", "s222[0..1]", { tip: 0.42, root: 0.22, side: ["x", 0.31], lit: 0.5 }),
  ...lock("b10", "s222[0..1]", "s304[0..1]", { tip: 0.5, side: ["x", 0.4], lit: 0.4 }),
  ...lock("b11", "s336[0..1]", "s277[.35..0.95]", { tip: 0.6, side: ["x", 0.5] }),
  ...lock("b12", "s304[0..1]", "s291[0..1]+s337[0..1]", { tip: 0.55, side: ["x", 0.5], root: 0.3 }),
  ...lock("b13", "s135[.1..1]", "s134[.1..0.8]", { tip: 0.6, side: ["x", 0.5] }),
  say("s1", "hairF", "under174", "fill s174@.5:s191@.5:.5"),
  say("s1", "hairF", "under139", "fill s202@.6:s207@.5:.4"),
  say("s1", "hairF", "lock221", "band s422[.02..0.7] l 0 12 0"),
  /* crown and left */
  ...lock("l16", "s13[0..1]", "s44[0..1]", { side: ["x", 0.56] }),
  ...lock("l31", "s44[0..1]+s59[0..1]+s61[0..1]", "s58[0..1]+s105[.2..1]", { side: ["x", 0.41], deep: true, lit: 0.4 }),
  ...lock("l43", "s58[.1..0.9]", "s62[.1..1]+s112[0..0.5]", { side: ["x", 0.62], deep: true }),
  ...lock("l78", "s105[0..1]+s118[1..0]", "s163[1..0]+s119[1..0]", { side: ["x", 0.46], deep: true, lit: 0.3 }),
  ...lock("l86", "s112[0..1]+s173[0..1]", "s167[0..1]+s192[0..1]", { side: ["x", 0.42], deep: true, lit: 0.36 }),
  ...lock("l90", "s140[.2..1]+s156[0..1]", "s144[0..0.25]+s157[0..1]", { side: ["x", 0.34], deep: true }),
  ...lock("l109", "s157[0..1]", "s144[.2..1]", { side: ["x", 0.5] }),
  ...lock("l102", "s144[0..1]", "s186[0..0.2]+s185[0..1]", { lit: 0.4, side: ["x", 0.34], deep: true }),
  ...lock("sideL", "s102[0..1]+s186[0..1]+s199[0..1]", "s147[0..1]+s206[0..1]", { side: ["x", 0.41], deep: true, lit: 0.4 }),
  ...lock("l106", "s166[0..1]+s147[.45..1]", "s165[.1..1]", { side: ["x", 0.36], deep: true, lit: 0.36 }),
  ...lock("l154", "s309[0..1]+s347[0..1]", "s323[0..1]", { side: ["x", 0.41], deep: true, lit: 0.6 }),
  ...lock("l136", "s199[.4..1]", "s237[0..1]", { side: ["x", 0.56] }),
  say("s1", "hairF", "l114", "fill s167@.6:s132@.7:.5"),
  say("s1", "hairF", "l77", "fill s94@.7:s105@.72:.5"),
  say("s1", "hairF", "l118", "fill s173@.4:s180@.3:.5"),
  say("s1", "hairF", "l113", "band s176[.05..0.9] u 0 14 10 0"),
  say("s1", "hairF", "l123", "band s182[.2..1] u 0 16 12 0"),
  say("s1", "hairF", "l133", "band s211[0..1] u 0 12 8 0"),
  say("s1", "hairF", "l143", "band s205[.1..1] u 0 12 10 0"),
  say("s1", "hairF", "l126", "fill s185@.4:s200@.5:.5"),
  say("s1", "hairF", "l84", "band s151[0..1] u 0 10 6 0"),
  say("s1", "hairF", "l84b", "band s126[0..1] d 0 9 0"),
  say("s1", "hairF", "curl", "band s34[.1..0.95] l 0 10 13 6"),
  say("lt", "hairF", "curlLit", "band s32[.15..0.75] r 0 7 0", undefined, 0.6),
  say("s1", "hairF", "tuft", "band s5[.5..1] u 0 14 20 10"),
  say("s1", "hairF", "tuftBack", "fill s2@.6:s3@.88:.5"),
  say("lt", "hairF", "tuftLit", "band s3[.3..0.6] d 0 9 0", undefined, 0.6),
  /* back hair: shade is the rule */
  ...["s226[.2..0.9] l 0 12 10 0", "s322[0..1] l 0 12 8", "s274[.1..0.9] l 0 12 8 0", "s229[.1..1] l 0 10 6 0", "s242[.1..1] r 0 14 10 0", "s236[.2..0.9] l 0 10 6", "s383[.1..0.9] l 0 14 8", "s417[0..1] l 0 10 6", "s432[.1..1] r 0 8 6 0", "s394[.3..1] l 0 10 6", "s244[.1..0.9] r 0 8 0", "s463[.1..1] r 0 14 8 0", "s439[.1..1] u 0 12 8 0", "s402[0..1] l 0 8 6", "s364[.1..0.9] l 0 12 8 0"].map((t, i) => say("s1", "hairB", `back${i}`, `band ${t}`)),
  say("s1", "hairB", "bk200", "fill s330@.6:s329@.3:.5"),
  say("s1", "hairB", "bk239", "fill s388@.6:s412@.4:.4"),
  /* braid: a ring in space, its lower right half turned away */
  say("s1", "braid", "braidTurn", "ball s452@.4 s433@.5 s378@.5 s424@.8 -.12"),

  ...["s391[0..1] u 0 8 5", "s413[0..1] u 0 11 8 0", "s407[0..1] l 0 8 0", "s416[0..1] l 0 10 6", "s411[.2..1] l 0 9 6", "s447[0..1] d 0 10 0", "s453[.1..1] l 0 10 6 0", "s446[0..1] l 0 10 6", "s480[0..1] d 0 8 0", "s481[0..1] u 0 12 8 0", "s467[0..1] d 0 12 0", "s484[0..1] u 0 8 0", "s466[0..1] d 0 8 0", "s433[.2..1] r 0 10 6", "s441[.1..0.9] d 0 10 8 0", "s434[0..1] l 0 8 0", "s479[0..1] u 0 8 0"].map((t, i) => say("s1", "braid", `br${i}`, `band ${t}`)),
  ...["s378[.1..0.9] d 0 6 0", "s386[.15..0.45] r 0 7 0", "s452[.2..0.8] r 0 6 0"].map((t, i) => say("lt", "braid", `brLit${i}`, `band ${t}`, undefined, 0.7)),
  /* the far side of the head is in shade: toothed tips above, deep shade below */
  say("s2", "hairF", "deepR1", "band s277[.35..0.95] l 0 12 14 6"), say("s2", "hairF", "deepR2", "band s222[.45..0.95] l 0 11 9 0"), say("s2", "hairF", "deepR3", "band s337[.1..0.9] l 0 12 8 0"),
 
 
  say("s1", "hairB", "farBack", "fill s439@.4:s388@.7:.4"), say("s1", "hairB", "farBack2", "fill s463@.4:s439@.7:.5"), say("s1", "hairB", "farBack3", "fill s364@.5:s402@.5:.5"),
  say("s2", "hairB", "underTop", "band s211[0..1] d 0 16 14 4"), say("s2", "hairB", "behindEar", "band s329[0..1] l 0 16 14 6"), say("s2", "hairB", "behindEar2", "band s236[.2..1] l 0 14 12 4"),
]
