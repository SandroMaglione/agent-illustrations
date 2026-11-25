import type { Masses, Plan } from "../tools/thumbs.ts"

export const MASSES: Masses = [["hairF", "hairB", "face"], ["jackL", "flap"], ["jackR"], ["top", "turtle"], ["pants"], ["dev", "devF", "devP"], ["cup", "disc", "pad"]]
const F = { x: 490, y: 260, rx: 230, ry: 230, dim: 0.06 }, UL = { fall: [0.8, 0.6], up: 0.5 } as const
export const PLANS: ReadonlyArray<Plan> = [
  { id: "a", say: "hair a mid mass, face the lightest, black top as the anchor, dark teal jacket, pale trousers", light: UL, focus: F, color: {} },
  { id: "b", say: "dark bottle-green hair, everything else lighter: cream jacket, grey trousers", light: UL, focus: F, color: { hairF: "#2f7a62", hairB: "#1c4d44", jackL: "#efe6d6", jackR: "#efe6d6", flap: "#e2d6c2", pants: "#6f7380", pocket: "#7d8290", trimL: "#3a7478", trimR: "#3a7478" } },
  { id: "c", say: "pale mint hair on a dark figure: near-black jacket, dark trousers, amber player as the only warm mass", light: UL, focus: F, color: { hairF: "#b6ecd0", hairB: "#6fb59c", jackL: "#234446", jackR: "#234446", flap: "#2e5658", pants: "#4b4a57", pocket: "#565564", tabP: "#23212c" } },
  { id: "d", say: "as a, lit from the right: the raised arm is light, the shoulder in shade", light: { fall: [-0.75, 0.66], up: 0.5 }, focus: F, color: {} },
]
