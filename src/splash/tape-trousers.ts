/** Trousers, without a coordinate: every shape is said in terms of the numbered lines (?v=sheet&box=360,1010,420,526). */
import type { Shape } from "./engine.ts"
import { say } from "./shapes.ts"

export const TROUSERS: ReadonlyArray<Shape> = [
  /* masses: the planes that turn away from the light */
  say("s1", "pants", "hip", "line s418@.3 ~-.12 s502@.5 > s536@.5:s418@.8:.5"),
  say("s1", "pants", "leg", "line s514@.18 ~.06 s589@1:s514@1:.62 > s589@.9:s514@.9:.85"),
  say("s1", "pants", "gap", "fill s514@.97:s599@.7:.5"),
  say("s1", "pants", "valley", "run s518[.4..1] s559[1..0] ~.06 s518@.4"),
  say("s1", "pants", "thigh", "run s585[.95..0] s559[1..0] ~-.24 s585@.95"),
  say("s1", "pants", "knee", "band s544[0..1] r 0 26 46"),
  say("s1", "pants", "flank", "line s558@.05 ~.04 s544@1:s558@1:.72 > s544@.95:s558@.95:.9"),
  say("s1", "pants", "bag", "line s554@.4 s569[0..1] ~.1 s558@.82 > s558@.3:s569@.3:.5"),
  say("s1", "pants", "bagUnder", "line s600@0 ~-.12 s580@.66 > s600@.7:s580@.6:.3"),
  say("s1", "pants", "outer", "line s601[0..1] > s582@.5:s590@.4:.7"),
  say("s1", "pants", "cuff", "line s595@.12 ~-.1 s592@1:s594@1:.62 > s592@.85:s594@.8:.3"),
  /* pleats and creases */
  say("s1", "pants", "fly", "run s439[0..0.5] ~.06 s441@.02"),
  say("s1", "pants", "fold", "run s439[.67..0.74] s441[1..0.62] ~-.06 s439@.67"),
  say("s1", "pants", "pleat", "run s441[0..0.55] ~.05 s451@.03"),
  say("s1", "pants", "slit", "line s451@.2 ~.1 s498@.75 > s456@.3:s451@.3:.2"),
  say("s1", "pants", "waist", "band s413[0..1] d 0 8 0"),
  say("s1", "pants", "nick", "band s466[0..1] l 0 7 0"),
  say("s1", "pants", "pinch", "band s537[0..1] r 0 8 0"),
  say("s1", "pants", "crotch", "band s585[0..0.9] l 6 12 0"),
  /* pockets and straps */
  say("s1", "pocket", "rim", "fill s547@.5:s550@.5:.5"),
  say("s1", "pocket", "flap", "line s548@.45 ~.08 s579@.1 > s548@.85:s579@.9:.4"),
  say("s1", "tabP", "strapR", "band s582[0..1] l 4 12 16"),
  say("s1", "tabP", "strapL", "band s598[0..1] l 4 8 12"),
  /* deep shade, always inside its parent */
  say("s2", "pants", "deepGap", "fill s514@.97:s599@.7:.5", "gap"),
  say("s2", "pants", "deepValley", "band s518[.5..1] d 0 15 0", "valley"),
  say("s2", "pants", "deepLeg", "line s514@.45 ~.05 s589@1:s514@1:.84 > s589@.95:s514@.95:.95", "leg"),
  say("s2", "pants", "deepHip", "line s502@.9 ~.08 s564@.15 > s536@.6:s418@.8:.2", "hip"),
  /* light planes */
  say("lt", "pants", "litThigh", "band s544[.02..0.9] l 0 16 12 0", undefined, 0.45),
  say("lt", "pants", "litHip", "band s418[.02..0.28] r 0 9 0", undefined, 0.6),
]
