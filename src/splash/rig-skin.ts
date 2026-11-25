import type { Shape } from "./engine.ts"
import { say } from "./shapes.ts"

export const SKIN: ReadonlyArray<Shape> = [
  say("s1", "face", "nose", "band s376[.1..1] away 0 7 13 10 0"),
  say("form", "face", "jaw", "band s462[.0..0.95] u 20 26 20 0"),
  say("form", "face", "cheekL", "band s436[0..1] r 0 9 8 0"),
  say("s1", "neck", "neckAll", "all"),
  say("s2", "neck", "underJaw", "band s436[0..0.9] l 10 24 10", "neckAll"),
  say("s1", "ear", "earBowl", "run s289[0..1] ~.12 s295[1..0.12] ~.14 s289@0"),
  say("s2", "ear", "earDeep", "band s295[.3..0.9] l 0 10 6 0", "earBowl"),
  say("s1", "ear", "earHole", "band s313[0..1] l 0 9 4"),
  say("s1", "ear", "earLobe", "band s329[.2..0.95] r 0 8 6 0"),
  say("s1", "ear", "earRim", "band s247[.1..0.6] d 0 5 0"),
  say("s1", "teethM", "teethTurn", "band s451[0..1] l 4 6 4"),
  say("lt", "mouth", "tongue", "run s450[.3..0.7] ~.22 s450@.3"),
  say("form", "face", "farCheek", "band s388[.25..1] l 0 16 24 20"),
  say("s2", "face", "noseDeep", "band s376[.62..0.96] away 0 8 0", "nose"),
  say("s1", "face", "socketFar", "run s301[.8..1] s334[0..0.5] ~.1 s339[.3..0] ~.1 s301@.8"),
 
]
