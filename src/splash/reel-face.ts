/** Colour inside the artist's face. Their lines stay: only what lies between them is painted. */
import { eyeDetails, eyeLights } from "../bold/eye.ts"
import type { Detail, Eye, EyeLook } from "../bold/eye.ts"

/** Amber eyes against the navy hair, dark at the top under the lid. */
const LOOK: EyeLook = {
  reach: [46, 22], white: "#ffffff", shade: "#e4dee8", rim: "#3a2316", inner: [0.9, 0.9],
  stops: [[0, "#6a3e24"], [0.32, "#9c5c2e"], [0.33, "#bc7834"], [0.55, "#d69640"], [0.56, "#e8b25a"], [1, "#f8d888"]],
  spokes: { n: 11, from: 0.3, span: 2.55, half: 0.05, out: 0.86, color: "#a8682a" },
  glow: [{ name: "Iris glow 1", inner: 0.38, outer: 0.94, n: 5, color: "#ffd889" }, { name: "Iris glow 2", inner: 0.64, outer: 0.94, n: 3, color: "#fff0c4" }],
  lid: { right: -0.15, mid: 0.05, left: -0.15, color: "rgba(40,20,30,.55)" },
  pupil: { x: 0, y: 0, rx: 0.3, ry: 0.36, color: "#26140c" }, spark: { x: 0, y: 0.14, rx: 0.1, ry: 0.14, color: "#c98a3c" },
  lights: [{ x: -0.3, y: -0.22, rx: 0.24, ry: 0.22, color: "#ffffff" }, { x: 0.38, y: 0.32, rx: 0.08, ry: 0.08, color: "#fffdf4" }],
  star: { x: 0.1, y: 0.52, r: 0.14, color: "#fff6dc" },
}
const NEAR: Eye = { open: "588,268 595,263~ 605,262~ 616,262 628,262~ 638,264 644,268 636,274 626,280~ 615,286 605,291~ 594,293 590,285 589,275", x: 601, y: 278, rx: 11.5, ry: 14, turn: 0, shade: "584,272 595,265 605,264~ 616,266 616,252 584,252" }
const FAR: Eye = { open: "504,312 512,309~ 522,309~ 530,311 526,320 518,330 510,337 506,330 504,320", x: 515, y: 323, rx: 8.5, ry: 12.5, turn: 0, shade: "500,316 512,311~ 522,311~ 534,313 534,300 500,300" }
export const DETAILS: ReadonlyArray<Detail> = [...eyeDetails("Eyes", NEAR, LOOK), ...eyeDetails("Eyes", FAR, LOOK), ...eyeLights("Highlights", NEAR, LOOK), ...eyeLights("Highlights", FAR, LOOK)]
/** Brows: thin, under the fringe; only a touch shows. */
export const BROWS = [{ d: "566,251! 580,246! 598,243! 616,243! 600,247! 582,250!", color: "#2a2f4a" }]
