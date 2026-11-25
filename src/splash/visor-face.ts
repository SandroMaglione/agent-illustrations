/** Colour inside the artist's face. The lines of eyes, lids, nose and mouth are theirs and stay: only what lies between them is painted. */
import { eyeDetails, eyeLights, fill } from "../bold/eye.ts"
import type { Detail, Eye, EyeLook } from "../bold/eye.ts"

const LOOK: EyeLook = {
  reach: [40, 40], white: "#fffaf8", shade: "#cdc5dc", rim: "#11304a", inner: [0.91, 0.92],
  stops: [[0, "#113456"], [0.3, "#154d74"], [0.31, "#196791"], [0.5, "#1e83a8"], [0.51, "#2aa5b8"], [1, "#3ccabf"]],
  spokes: { n: 11, from: 0.35, span: 2.45, half: 0.05, out: 0.86, color: "#1a7199" },
  glow: [{ name: "Iris glow 1", inner: 0.36, outer: 0.95, n: 6, color: "#62e2c6" }, { name: "Iris glow 2", inner: 0.6, outer: 0.95, n: 4, color: "#cbf9d5" }],
  lid: { right: -0.36, mid: -0.06, left: -0.32, color: "rgba(9,18,44,.5)" },
  pupil: { x: 0, y: -0.02, rx: 0.32, ry: 0.38, color: "#081222" }, spark: { x: 0, y: 0.1, rx: 0.12, ry: 0.18, color: "#33a3cc" },
  lights: [{ x: -0.34, y: -0.26, rx: 0.18, ry: 0.23, color: "#ffffff" }, { x: 0.42, y: 0.34, rx: 0.09, ry: 0.11, color: "#f2fffb" }, { x: -0.48, y: 0.2, rx: 0.055, ry: 0.055, color: "#bff7ff" }, { x: 0.3, y: -0.12, rx: 0.045, ry: 0.045, color: "#ffd98a" }],
  star: { x: 0.06, y: 0.5, r: 0.18, color: "#fff2a0" },
}
const NEAR: Eye = { open: "516.6,212 519.5,205~ 524,200~ 530,196~ 537,193.4~ 545,192.4~ 549,193.4 548.6,199~ 546,202.2 540,205.2~ 533,209~ 526.5,212~ 520,213.2~", x: 535.4, y: 201.2, rx: 8.9, ry: 9.8, turn: -0.36, shade: "512,212 519,207 525,204~ 532,200.2~ 540,197.2~ 550,196.4 552,188 530,188 512,204" }
const FAR: Eye = { open: "474.4,241 474.8,236.8~ 478,232.4~ 483,229.8~ 489,229~ 493.8,230.4 494.8,232.2~ 491.4,236~ 486.8,239.2~ 482,242.4~ 477.6,243~", x: 487, y: 233.8, rx: 6.9, ry: 8, turn: -0.5, shade: "472,242 476,238 479.4,235~ 484.4,232.8~ 490,232~ 497,232.8 498,226 480,225 470,234" }
/** Cleared: the pencil marks inside the irises, and the double line of the brows. */
export const NOINK: ReadonlyArray<string> = [
  "530,197.6! 540.6,194.2! 542.4,197! 542.2,202! 535,205.8! 531,205.4!", "482,231.8! 488.6,230.4! 491.6,231.6! 489.6,234.8! 486.4,237.2! 483.8,235.6!",
  "505.6,191.6! 516,186.4! 530,178.6! 533,176! 527,171.8! 516,175.4! 507,182! 504.8,187!", "459.6,222! 462.6,224.6! 470.4,216! 468.2,211!",
]
export const BROWS = [{ d: "504.8,187.4 511,181.8! 520,177! 531,172.8! 547,169.4! 534,174.9! 523,179.6! 514,184.8! 506.2,191!", color: "#7d4a34" }, { d: "460.4,221.4! 464,217.2! 468.8,212.4! 470,214.4! 466.2,218.6! 462.2,222.6!", color: "#7d4a34" }]
export const DETAILS: ReadonlyArray<Detail> = [
  ...eyeDetails("Eyes", NEAR, LOOK), ...eyeDetails("Eyes", FAR, LOOK),
  // the grey of the lash, made solid: inside the drawn band
  { name: "Lash fill", folder: "Eyes", draw: (g) => fill(g, "516,207.4 519,202.6~ 525,197.6~ 531,193.8~ 539,190.6 539,193~ 531,196.2~ 525,199.8~ 520,205", "#3a2027") }, { name: "Lash fill", folder: "Eyes", draw: (g) => fill(g, "470,238 471.4,233.6~ 475.6,229.8~ 482,227.2~ 488,226.4 488.4,228.6~ 480,231~ 475,235.6~ 473.4,239.4", "#3a2027") },
  // the open mouth: teeth, and a little red where it is deepest
  { name: "Mouth", draw: (g) => fill(g, "513,261.2 519.5,256.4~ 527,252.4~ 533.2,249.6~ 537.6,245.4 535.4,250.6~ 531,257~ 525.4,261.6~ 518.6,262.6~", "#fff8f4") }, { name: "Mouth shade", draw: (g) => fill(g, "515,260.6 521,256.4~ 528,253~ 535,249.4 534.4,251 528,254.4~ 521.4,257.8~ 517,261", "#dccfd6") }, { name: "Mouth shade", draw: (g) => fill(g, "530.6,257.4 533.2,252.4~ 537.8,245.4 535.6,251~ 533,255.4", "#b9575a") },
  // lips: a touch of red below, no shape
  { name: "Lips and nose", draw: (g) => { g.save(); g.globalAlpha = 0.45; g.filter = "blur(2px)"; fill(g, "519.6,265.4 524.4,264.8~ 529,262.2~ 532.4,259.2 530.4,263~ 525.6,266.2~", "#e0685f"); g.restore() } },
  // nose: a pale patch on its shaded side
  { name: "Lips and nose", draw: (g) => fill(g, "498,240.4 501,241.2~ 502.6,244~ 502.6,247 499.4,245.2~", "#f6cfc3") },
  ...eyeLights("Highlights", NEAR, LOOK), ...eyeLights("Highlights", FAR, LOOK),
  { name: "Highlights", over: true, draw: (g) => { g.fillStyle = "#fffdfb"; g.beginPath(); g.ellipse(526.6, 264, 1.3, 0.55, -0.5, 0, 7); g.fill() } },
]
