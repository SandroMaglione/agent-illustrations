/** Colour inside the artist's face. Their lines stay: only what lies between them is painted. */
import { eyeDetails, eyeLights } from "../bold/eye.ts"
import type { Detail, Eye, EyeLook } from "../bold/eye.ts"

/** Narrow, smiling eyes; a lavender-grey iris, mostly under the lid. */
const LOOK: EyeLook = {
  reach: [24, 18], white: "#fffafa", shade: "#cfc6de", rim: "#2c2948", inner: [0.9, 0.9],
  stops: [[0, "#241f55"], [0.32, "#3d3594"], [0.33, "#4c43b0"], [0.55, "#6a5fd0"], [0.56, "#8b7fe6"], [1, "#c4b6ff"]],
  spokes: { n: 11, from: 0.3, span: 2.55, half: 0.05, out: 0.86, color: "#5d5893" },
  glow: [{ name: "Iris glow 1", inner: 0.38, outer: 0.94, n: 5, color: "#c3c0ea" }, { name: "Iris glow 2", inner: 0.64, outer: 0.94, n: 3, color: "#eeeaff" }],
  lid: { right: -0.1, mid: 0.15, left: -0.1, color: "rgba(30,20,60,.5)" },
  pupil: { x: 0, y: 0, rx: 0.26, ry: 0.32, color: "#1e1b36" }, spark: { x: 0, y: 0.14, rx: 0.1, ry: 0.14, color: "#9a95d0" },
  lights: [{ x: -0.3, y: -0.18, rx: 0.24, ry: 0.27, color: "#ffffff" }, { x: 0.38, y: 0.3, rx: 0.08, ry: 0.09, color: "#fffdf4" }],
  star: { x: 0.1, y: 0.5, r: 0.14, color: "#fff6dc" },
}
const NEAR: Eye = { open: "526,161 530,157~ 538,155.4~ 548,155 556,155.4 560,157 560,162 558,166 550,167.2~ 540,167.6~ 532,166.4 528,164", x: 544.8, y: 162, rx: 10, ry: 9.6, turn: 0, shade: "524,162 532,158 546,157.4~ 560,158.6 562,150 524,150" }
const FAR: Eye = { open: "463,196 466,191 471,186~ 479,182.4~ 487,180.8 491,182 491,187 489,190.6 483,193.6~ 475,196.6~ 468,198.6", x: 480, y: 188, rx: 8.6, ry: 8.6, turn: -0.15, shade: "460,197 470,188 480,184~ 492,183 492,174 460,180" }
/** A sharp glint on metal: four points and a soft glow. */
const glint = (x: number, y: number, r: number) => (g: CanvasRenderingContext2D): void => {
  g.save(); g.globalAlpha = 0.5; const q = g.createRadialGradient(x, y, 0, x, y, r * 1.6); q.addColorStop(0, "#fff6d8"); q.addColorStop(1, "rgba(255,240,200,0)"); g.fillStyle = q; g.beginPath(); g.arc(x, y, r * 1.6, 0, 7); g.fill(); g.restore()
  g.fillStyle = "#fffdf4"; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.22, y - r * 0.22); g.lineTo(x + r, y); g.lineTo(x + r * 0.22, y + r * 0.22); g.lineTo(x, y + r); g.lineTo(x - r * 0.22, y + r * 0.22); g.lineTo(x - r, y); g.lineTo(x - r * 0.22, y - r * 0.22); g.closePath(); g.fill()
}
const GLINTS: ReadonlyArray<readonly [number, number, number]> = [[639, 102, 6], [571, 404, 5], [596, 392, 4], [614, 232, 4], [476, 278, 3.5], [525, 330, 4.5], [698, 948, 4], [767, 853, 4], [429, 566, 4], [229, 1396, 3.5], [299, 1403, 3.5], [657, 452, 3], [742, 518, 3]]
export const DETAILS: ReadonlyArray<Detail> = [...eyeDetails("Eyes", NEAR, LOOK), ...eyeDetails("Eyes", FAR, LOOK), ...eyeLights("Highlights", NEAR, LOOK), ...eyeLights("Highlights", FAR, LOOK), ...GLINTS.map(([x, y, r]): Detail => ({ name: "Glints", over: true, draw: glint(x, y, r) }))]
/** Brows: one solid tapered shape each, the hair's dark, under the artist's arcs. */
export const BROWS = [{ d: "511,133! 517,128.4! 526,125! 537,123.2! 548,123.4! 554,125! 546,125.6! 535,126.6! 524,129! 516,132.6!", color: "#565174" }, { d: "450,164! 456,158.6! 463,154.4! 471,151.2! 478,150.4! 474,153.4! 466,157! 459,161.4!", color: "#565174" }]
