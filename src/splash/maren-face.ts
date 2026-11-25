/** Colour inside the artist's face. Their lines stay: only what lies between them is painted. "x,y~" is a soft point. */
import { eyeDetails, eyeLights, fill } from "../bold/eye.ts"
import type { Detail, Eye, EyeLook } from "../bold/eye.ts"

type G = CanvasRenderingContext2D
const LOOK: EyeLook = {
  reach: [70, 60], white: "#fffaf8", shade: "#cdc5dc", rim: "#0f2f38", inner: [0.92, 0.92],
  stops: [[0, "#113a44"], [0.3, "#16545c"], [0.31, "#1a6c72"], [0.5, "#229089"], [0.51, "#34b3a0"], [1, "#4ccfae"]],
  spokes: { n: 13, from: 0.3, span: 2.55, half: 0.045, out: 0.88, color: "#1c7a78" },
  glow: [{ name: "Iris glow 1", inner: 0.36, outer: 0.95, n: 6, color: "#86e6bd" }, { name: "Iris glow 2", inner: 0.62, outer: 0.95, n: 4, color: "#e6fbc9" }],
  lid: { right: -0.3, mid: 0.02, left: -0.26, color: "rgba(8,20,40,.5)" },
  pupil: { x: 0, y: 0, rx: 0.3, ry: 0.4, color: "#081a20" }, spark: { x: 0, y: 0.12, rx: 0.11, ry: 0.18, color: "#4fd0b0" },
  lights: [{ x: -0.36, y: -0.12, rx: 0.16, ry: 0.2, color: "#ffffff" }, { x: 0.44, y: 0.36, rx: 0.08, ry: 0.1, color: "#fffdf0" }, { x: -0.5, y: 0.34, rx: 0.05, ry: 0.05, color: "#c8fff0" }, { x: 0.32, y: -0.02, rx: 0.045, ry: 0.045, color: "#ffd98a" }],
  star: { x: 0.08, y: 0.56, r: 0.17, color: "#fffbd8" },
}
const NEAR: Eye = { open: "500,241 512,231~ 526,223~ 544,218~ 562,216 571,219 566,230 552,236~ 536,240~ 514,246", x: 542.5, y: 227, rx: 20, ry: 15.5, turn: -0.16, shade: "498,242 512,235 528,228~ 546,224~ 572,224 572,210 520,212" }
const FAR: Eye = { open: "394,300 402,292~ 416,284~ 430,279~ 440,277.4 444,281 438,290~ 424,301~ 414,305 402,305", x: 431, y: 288, rx: 16, ry: 14, turn: -0.48, shade: "392,302 404,295 418,288~ 432,284~ 450,281 446,270 400,280" }
export const NOINK: ReadonlyArray<string> = ["529,224! 541,222! 556,220.4! 558,231! 545,235.6! 532,238.6! 527,232!", "420,291! 430,284! 441,281! 443,285! 434,292! 424,298!", "471.6,209! 479,191! 500,180! 524,171! 562,170.6! 562,178! 530,183! 512,190! 494,200! 478,213!", "374.6,261! 379,247! 396,239.6! 405,247! 391,255.4! 379,263!"]
export const BROWS = [{ d: "473,206.4! 486,193.6! 504,183.4! 529,176.4! 561,174! 532,181.4! 514,188! 497,197.8! 479,211!", color: "#256053" }, { d: "375.4,255.6! 385,247.6! 396.6,241.8! 401,246.6! 389.4,253.4! 378.6,260.4!", color: "#256053" }]
/** What is printed on the things. */
const prints = (g: G): void => {
  g.save(); g.translate(252, 664); g.rotate(0.42); g.fillStyle = "rgba(246,240,232,.92)"; g.font = "800 15px 'Avenir Next Condensed', 'Arial Narrow', sans-serif"; g.fillText("LOW TIDE", 0, 6); g.font = "600 6.5px 'Avenir Next', sans-serif"; g.fillText("RECORD EVERYTHING", 1, 16); g.restore()
  fill(g, "112,1239 226,1245 224,1253 110,1247", "#c2513f"); fill(g, "71,1326 99,1329 94,1350 66,1346", "#c2513f")
  g.fillStyle = "#34323f"; g.save(); g.translate(143, 1264); g.rotate(0.05); g.font = "800 9px 'Avenir Next Condensed', 'Arial Narrow', sans-serif"; g.fillText("SIDE A", 4, 8); g.restore()
  g.lineWidth = 1; g.strokeStyle = "rgba(246,240,232,.65)"; for (let i = 0; i < 9; i++) { const a = -2.5 + i * 0.5; g.beginPath(); g.moveTo(285 + Math.cos(a) * 30, 1213 + Math.sin(a) * 30); g.lineTo(285 + Math.cos(a) * 34, 1213 + Math.sin(a) * 34); g.stroke() }
  g.fillStyle = "#c8e05a"; g.beginPath(); g.arc(283, 1322, 4, 0, 7); g.fill(); g.fillStyle = "rgba(246,240,232,.8)"; g.font = "700 8px 'Avenir Next', sans-serif"; g.save(); g.translate(252, 1352); g.rotate(0.07); g.fillText("VOL", 0, 0); g.restore()
}

export const DETAILS: ReadonlyArray<Detail> = [
  ...eyeDetails("Eyes", NEAR, LOOK), ...eyeDetails("Eyes", FAR, LOOK),
  { name: "Mouth", draw: (g) => fill(g, "484,338 494,328.6~ 508,322.6~ 524,319.4 534,316 527,324~ 512,334~ 500,338.6", "#fff8f4") },
  { name: "Mouth shade", draw: (g) => fill(g, "488,336 498,328.6~ 512,323.4~ 530,319 526,322 510,327~ 498,332", "#dccfd6") },
  { name: "Mouth shade", draw: (g) => fill(g, "518,330 528,321~ 537,314 531,322.6~ 522,329.4", "#b9575a") },
  { name: "Lips and nose", draw: (g) => { g.save(); g.globalAlpha = 0.45; g.filter = "blur(3px)"; fill(g, "498,346 508,345~ 519,339.4~ 524,334 522,341~ 511,348~", "#e0685f"); g.restore() } },
  { name: "Lips and nose", draw: (g) => fill(g, "466,296 471,299~ 475,304~ 475,309 468,304~", "#f6cfc3") },
  { name: "Prints", print: true, draw: prints },
  ...eyeLights("Highlights", NEAR, LOOK), ...eyeLights("Highlights", FAR, LOOK),
  { name: "Highlights", over: true, draw: (g) => { g.fillStyle = "#fffdfb"; g.beginPath(); g.ellipse(510, 343, 2.4, 1, -0.5, 0, 7); g.fill() } },
]
/** Whose line is whose: stroke numbers (tape-lines.ts), and "@x,y,r" for a mark that is no stroke. */
export const LINE_GROUPS: ReadonlyArray<readonly [string, string]> = [
  ["Eyes/Eye lines", "s63 s64 s65 s67 s68 s71 s72 s73 s75 s77 s78 s82 s83 s86 s87 s102 s105 s114 s115 s118 s119 s123 s126 s132"],
  ["Face", "s113 s145 s150 s166 @485,298,6 @576.7,238.5,5"],
]
