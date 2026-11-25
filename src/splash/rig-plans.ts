import type { Masses, Plan } from "../tools/thumbs.ts"

export const MASSES: Masses = [["hairF", "hairB", "face", "ear", "brow"], ["cap", "patch"], ["sleeve", "stripe", "inner"], ["jack", "panel", "band", "tape", "zip", "seam"], ["collar", "trim"], ["braid"]]
const F = { x: 610, y: 540, rx: 300, ry: 260, dim: 0.3 }, UL = { fall: [0.64, 0.77], up: 0.58 } as const
export const PLANS: ReadonlyArray<Plan> = [
  { id: "a", say: "the one that was drawn: slate jacket, face is the light", light: UL, focus: F, color: {} },
  { id: "b", say: "the first version: cream jacket, competes with the face", light: UL, focus: F, color: { collar: "#e6e1da", jack: "#e6e1da", cap: "#e6e1da", sleeve: "#e6e1da", panel: "#d9d4cf" } },
  { id: "c", say: "light from the right, hair nearly white against a dark coat", light: { fall: [-0.6, 0.8], up: 0.45 }, focus: F, color: { hairF: "#e9eaf0", hairB: "#b4b6c6", braid: "#cfd0dc", collar: "#3d4450", jack: "#454c5a", cap: "#4a5262", sleeve: "#454c5a", panel: "#4f5868" } },
]
