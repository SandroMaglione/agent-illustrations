import type { Masses, Plan } from "../tools/thumbs.ts"

export const MASSES: Masses = [["hairF", "hairB"], ["face", "neck", "ear"], ["armL", "handL", "armR", "handR"], ["coat", "sleeveL", "sleeveR", "skirt"], ["lapel", "cuff"], ["shirt", "collar", "collarIn"], ["scarf"], ["sash", "lapelT", "trim"], ["film"]]
const F = { x: 580, y: 300, rx: 220, ry: 220, dim: 0.06 }, UL = { fall: [0.78, 0.62], up: 0.5 } as const
const c = (hair: string, coat: string, lapel: string, shirt: string, scarf: string, sash: string, film: string): Record<string, string> => ({ hairF: hair, hairB: hair, coat, sleeveL: coat, sleeveR: coat, skirt: coat, lapel, cuff: lapel, shirt, collar: shirt, collarIn: shirt, scarf, sash, lapelT: sash, trim: sash, film })
export const PLANS: ReadonlyArray<Plan> = [
  { id: "a", say: "black-violet hair, deep wine uniform, cream lapels, white shirt, gold scarf, black film", light: UL, focus: F, color: c("#2b2433", "#5e2232", "#efe2c8", "#f5f2ee", "#e0a83a", "#26202a", "#232026") },
  { id: "b", say: "ash-silver hair, charcoal uniform, crimson lapels and scarf, white shirt, amber film", light: UL, focus: F, color: c("#b9b6c4", "#2e2d36", "#b8283a", "#f5f2ee", "#c8283a", "#b8283a", "#c48a3a") },
  { id: "c", say: "teal-black hair, cinema red uniform, black lapels, white shirt, red scarf matching, gold trim", light: UL, focus: F, color: c("#1f3a40", "#b02a34", "#24222a", "#f5f2ee", "#24222a", "#d8b25a", "#2a2830") },
  { id: "d", say: "navy hair, cream uniform, navy lapels, pale blue shirt, red scarf, brown film", light: UL, focus: F, color: c("#28304e", "#e8dcc2", "#28304e", "#dfe6f2", "#c8463d", "#28304e", "#7a4a2a") },
  { id: "e", say: "soft pink-brown hair, slate blue uniform, cream lapels, white shirt, orange scarf, amber film", light: UL, focus: F, color: c("#c08878", "#46566e", "#ecdfc6", "#f5f2ee", "#e8823a", "#2e3646", "#c48a3a") },
]
