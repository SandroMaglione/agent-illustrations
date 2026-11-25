/** Colour inside the artist's face. Their lines stay: only what lies between them is painted. "x,y~" is a soft point. */
import { path } from "../bold/shadows.ts"

type G = CanvasRenderingContext2D
const fill = (g: G, d: string, c: string): void => { path(g, d, 1); g.fillStyle = c; g.fill() }
type Eye = { open: string; x: number; y: number; rx: number; ry: number; turn: number; shade: string }
const white = (g: G, e: Eye): void => { g.save(); path(g, e.open, 1); g.clip(); g.fillStyle = "#fffaf8"; g.fillRect(e.x - 70, e.y - 60, 140, 120); fill(g, e.shade, "#cdc5dc"); g.restore() }
const iris = (g: G, e: Eye): void => {
  g.save(); path(g, e.open, 1); g.clip()
  g.translate(e.x, e.y); g.rotate(e.turn)
  const { rx, ry } = e, el = (x: number, y: number, a: number, b: number, c: string): void => { g.beginPath(); g.ellipse(x, y, a, b, 0, 0, 7); g.fillStyle = c; g.fill() }
  el(0, 0, rx, ry, "#0f2f38"); g.beginPath(); g.ellipse(0, 0, rx * 0.92, ry * 0.92, 0, 0, 7); g.clip()
  const q = g.createLinearGradient(0, -ry, 0, ry); for (const [a, c] of [[0, "#113a44"], [0.3, "#16545c"], [0.31, "#1a6c72"], [0.5, "#229089"], [0.51, "#34b3a0"], [1, "#4ccfae"]] as const) q.addColorStop(a, c)
  g.fillStyle = q; g.fillRect(-rx, -ry, rx * 2, ry * 2)
  g.fillStyle = "#1c7a78"; for (let i = 0; i < 13; i++) { const a = 0.3 + (i / 12) * 2.55; g.beginPath(); g.moveTo(Math.cos(a) * rx * 0.3, Math.sin(a) * ry * 0.3); g.lineTo(Math.cos(a - 0.045) * rx * 0.88, Math.sin(a - 0.045) * ry * 0.88); g.lineTo(Math.cos(a + 0.045) * rx * 0.88, Math.sin(a + 0.045) * ry * 0.88); g.fill() }
  const crescent = (inner: number, outer: number, n: number, c: string): void => { g.beginPath(); for (let i = 0; i <= 40; i++) { const a = 0.22 + (i / 40) * 2.7; g.lineTo(Math.cos(a) * rx * outer, Math.sin(a) * ry * outer) } for (let i = 40; i >= 0; i--) { const t = i / 40, a = 0.22 + t * 2.7, w = Math.abs(Math.sin(t * Math.PI * n)), r = outer - (outer - inner) * Math.sin(t * Math.PI) ** 0.6 * (0.62 + 0.38 * w); g.lineTo(Math.cos(a) * rx * r, Math.sin(a) * ry * r) } g.fillStyle = c; g.fill() }
  crescent(0.36, 0.95, 6, "#86e6bd"); crescent(0.62, 0.95, 4, "#e6fbc9")
  g.beginPath(); g.moveTo(-rx, -ry); g.lineTo(rx, -ry); g.lineTo(rx, -ry * 0.3); g.quadraticCurveTo(0, ry * 0.02, -rx, -ry * 0.26); g.fillStyle = "rgba(8,20,40,.5)"; g.fill()
  el(0, 0, rx * 0.3, ry * 0.4, "#081a20"); el(0, ry * 0.12, rx * 0.11, ry * 0.18, "#4fd0b0")
  g.restore()
}
const light = (g: G, e: Eye): void => {
  g.save(); g.translate(e.x, e.y); g.rotate(e.turn)
  const el = (x: number, y: number, a: number, b: number, c: string): void => { g.beginPath(); g.ellipse(x * e.rx, y * e.ry, a * e.rx, b * e.ry, 0, 0, 7); g.fillStyle = c; g.fill() }
  el(-0.36, -0.12, 0.16, 0.2, "#ffffff"); el(0.44, 0.36, 0.08, 0.1, "#fffdf0"); el(-0.5, 0.34, 0.05, 0.05, "#c8fff0"); el(0.32, -0.02, 0.045, 0.045, "#ffd98a")
  g.fillStyle = "#fffbd8"; g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283, r = i % 2 ? 0.045 : 0.17; g.lineTo(0.08 * e.rx + Math.cos(a) * r * e.rx, 0.56 * e.ry + Math.sin(a) * r * e.ry * 1.15) } g.fill()
  g.restore()
}
const NEAR: Eye = { open: "500,241 512,231~ 526,223~ 544,218~ 562,216 571,219 566,230 552,236~ 536,240~ 514,246", x: 542.5, y: 227, rx: 20, ry: 15.5, turn: -0.16, shade: "498,242 512,235 528,228~ 546,224~ 572,224 572,210 520,212" }
const FAR: Eye = { open: "394,300 402,292~ 416,284~ 430,279~ 440,277.4 444,281 438,290~ 424,301~ 414,305 402,305", x: 431, y: 288, rx: 16, ry: 14, turn: -0.48, shade: "392,302 404,295 418,288~ 432,284~ 450,281 446,270 400,280" }
export const NOINK: ReadonlyArray<string> = ["529,224! 541,222! 556,220.4! 558,231! 545,235.6! 532,238.6! 527,232!", "420,291! 430,284! 441,281! 443,285! 434,292! 424,298!", "471.6,209! 479,191! 500,180! 524,171! 562,170.6! 562,178! 530,183! 512,190! 494,200! 478,213!", "374.6,261! 379,247! 396,239.6! 405,247! 391,255.4! 379,263!"]
export const BROWS = [{ d: "473,206.4! 486,193.6! 504,183.4! 529,176.4! 561,174! 532,181.4! 514,188! 497,197.8! 479,211!", color: "#256053" }, { d: "375.4,255.6! 385,247.6! 396.6,241.8! 401,246.6! 389.4,253.4! 378.6,260.4!", color: "#256053" }]
const mouth = (g: G): void => {
  fill(g, "484,338 494,328.6~ 508,322.6~ 524,319.4 534,316 527,324~ 512,334~ 500,338.6", "#fff8f4"); fill(g, "488,336 498,328.6~ 512,323.4~ 530,319 526,322 510,327~ 498,332", "#dccfd6"); fill(g, "518,330 528,321~ 537,314 531,322.6~ 522,329.4", "#b9575a")
  g.save(); g.globalAlpha = 0.45; g.filter = "blur(3px)"; fill(g, "498,346 508,345~ 519,339.4~ 524,334 522,341~ 511,348~", "#e0685f"); g.restore()
}
const nose = (g: G): void => fill(g, "466,296 471,299~ 475,304~ 475,309 468,304~", "#f6cfc3")
/** What is printed on the things. */
const prints = (g: G): void => {
  g.save(); g.translate(252, 664); g.rotate(0.42); g.fillStyle = "rgba(246,240,232,.92)"; g.font = "800 15px 'Avenir Next Condensed', 'Arial Narrow', sans-serif"; g.fillText("LOW TIDE", 0, 6); g.font = "600 6.5px 'Avenir Next', sans-serif"; g.fillText("RECORD EVERYTHING", 1, 16); g.restore()
  fill(g, "112,1239 226,1245 224,1253 110,1247", "#c2513f"); fill(g, "71,1326 99,1329 94,1350 66,1346", "#c2513f")
  g.fillStyle = "#34323f"; g.save(); g.translate(143, 1264); g.rotate(0.05); g.font = "800 9px 'Avenir Next Condensed', 'Arial Narrow', sans-serif"; g.fillText("SIDE A", 4, 8); g.restore()
  g.lineWidth = 1; g.strokeStyle = "rgba(246,240,232,.65)"; for (let i = 0; i < 9; i++) { const a = -2.5 + i * 0.5; g.beginPath(); g.moveTo(285 + Math.cos(a) * 30, 1213 + Math.sin(a) * 30); g.lineTo(285 + Math.cos(a) * 34, 1213 + Math.sin(a) * 34); g.stroke() }
  g.fillStyle = "#c8e05a"; g.beginPath(); g.arc(283, 1322, 4, 0, 7); g.fill(); g.fillStyle = "rgba(246,240,232,.8)"; g.font = "700 8px 'Avenir Next', sans-serif"; g.save(); g.translate(252, 1352); g.rotate(0.07); g.fillText("VOL", 0, 0); g.restore()
}
export const drawLights = (g: G): void => { light(g, NEAR); light(g, FAR); g.fillStyle = "#fffdfb"; g.beginPath(); g.ellipse(510, 343, 2.4, 1, -0.5, 0, 7); g.fill() }
export const DETAILS = [
  { name: "Eye whites", draw: (g: G): void => { white(g, NEAR); white(g, FAR) } }, { name: "Irises", draw: (g: G): void => { iris(g, NEAR); iris(g, FAR) } },
  { name: "Mouth", draw: mouth }, { name: "Nose", draw: nose }, { name: "Prints", print: true, draw: prints },
]
