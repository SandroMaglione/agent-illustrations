import type { Masses, Plan } from "../tools/thumbs.ts"

export const MASSES: Masses = [["hairF", "hairB"], ["cape", "capeC", "capeHem"], ["vest", "plack", "dress", "under"], ["sleeveL", "mantle", "sleeveR"], ["panelC", "hemC"], ["skirt", "panelL", "lap"], ["panelR", "skirtR"], ["pleat"], ["train", "trainB"], ["face", "neck"], ["handT", "handU"], ["scroll", "roll"], ["stool"]]
const F = { x: 530, y: 190, rx: 190, ry: 190, dim: 0.06 }, UL = { fall: [0.78, 0.62], up: 0.5 } as const
const robe = (main: string, deep: string, panel: string): Record<string, string> => ({ robeF: main, sleeveL: main, mantle: main, skirt: main, panelL: main, skirtR: main, panelR: main, sleeveR: deep, backR: deep, lap: deep, backD: deep, panelC: panel, hip: deep })
export const PLANS: ReadonlyArray<Plan> = [
  { id: "a", say: "silver-violet hair, night-blue cape and train, violet robe, ivory dress, crimson lining", light: UL, focus: F, color: {} },
  { id: "b", say: "steel hair, night-blue cape, sea-green robe, ivory dress, terracotta lining", light: UL, focus: F, color: { ...robe("#4f8d8b", "#41787a", "#5b9a95"), lining: "#c46a4a", ribbon: "#c46a4a", ribB: "#9a4b3a", leafT: "#c46a4a", tassel: "#c46a4a", hip: "#2f5862" } },
  { id: "c", say: "silver hair over a wine robe, cape near black-blue, pale blue dress", light: UL, focus: F, color: { ...robe("#8e3f55", "#78344a", "#a04a5c"), lining: "#3f7f88", ribbon: "#3f7f88", ribB: "#2d5f6a", leafT: "#3f7f88", tassel: "#3f7f88", hip: "#55283a", belt: "#2d5f6a" } },
  { id: "d", say: "light robe: dove blue over everything, cape and train night blue, crimson as the only warm mass", light: UL, focus: F, color: { ...robe("#a9b6d4", "#96a4c6", "#b7c3dd"), hip: "#6d7aa4", hairF: "#8a8cab" } },
  { id: "e", say: "ochre robe, night-blue cape and train, teal lining, ivory dress, warm silver hair", light: UL, focus: F, color: { ...robe("#b98a4c", "#a3763f", "#c79a5c"), lining: "#2f7480", ribbon: "#2f7480", ribB: "#235a66", leafT: "#2f7480", tassel: "#2f7480", hip: "#6e4f34", belt: "#2f7480", trimC: "#f0d48a", hemM: "#2c3565", hemL: "#2c3565" } },
]
