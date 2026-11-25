import { FOLDERS } from "./tape-folders.ts"
import { curve, loop } from "../cel/path.ts"
import type { P2 } from "../geo.ts"
import type { Art, Level, Shape, Wash } from "./engine.ts"
import type { Iris } from "../tools/eyes.ts"
import type { RGB } from "../bold/tones.ts"
import { CLICKS, WALLS } from "./tape-clicks.ts"
import { LINES } from "./tape-lines.ts"
import { SEEDS } from "./tape-seeds.ts"
import { GEAR } from "./tape-gear.ts"
import { HAIR as HAIR_SHAPES } from "./tape-hair.ts"
import { CLOTH } from "./tape-cloth.ts"
import { SKIN } from "./tape-skin.ts"
import { TROUSERS } from "./tape-trousers.ts"

const sa = (lv: Level, a: number, on: string, ...d: Array<string>): Array<Shape> => d.map((x) => ({ lv, on: on.split(" "), d: x, a }))
const c = (a: string, b: string, d: number): readonly [ReadonlyArray<string>, ReadonlyArray<string>, number] => [a.split(" "), b.split(" "), d]
const ws = (on: string, x: number, y: number, rx: number, ry: number, color: RGB, a: number, late = false): Wash => ({ on: on.split(" "), x, y, rx, ry, color, a, late })
const SKINTONE = { color: "#fcf1ec", kind: "skin" as const }
const HAIR = "#cfa5a0", JACK = "#738c8b", TOP = "#4c4853", AMBER = "#cfa46c", BONE = "#e8e4df", STEEL = "#a9acb8"

const TEAL: Iris = { deep: [24, 58, 66], mid: [70, 140, 144], light: [152, 212, 194], glow: [226, 244, 206], ring: [18, 44, 52] }

/** Marks over the line art; `fly` is the colour of the loose hairs. */
export const tapeOver = (fly: string) => (g: CanvasRenderingContext2D): void => {
  const st = (d: string, w: number, s: string): void => { g.beginPath(); curve(d).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = w; g.strokeStyle = s; g.lineCap = "round"; g.stroke() }
  const dot = (x: number, y: number, a: number, b: number, s: string): void => { g.beginPath(); g.ellipse(x, y, a, b, -0.2, 0, 7); g.fillStyle = s; g.fill() }
  for (const [d, w] of [["262,206 236,232 222,250", 0.8], ["420,48 396,60 372,78", 0.8], ["226,360 216,390 218,416", 0.8], ["590,60 612,72 632,90", 0.7]] as const) st(d, w, fly)
}

export const TAPE: Art = {
  head: 390, keyline: ["buckS", "clipS", "buckle", "earr"],
  src: "/tape.png", w: 1024, h: 1536, seeds: SEEDS, lines: LINES, clicks: { at: CLICKS, walls: WALLS },
  walls: ["588,356 594,340 602,312", "228,1345 222,1384"],
  force: [
    { label: "face", d: "540,326! 562,338! 600,312! 598,336! 590,354! 560,384! 536,400! 520,380!", over: ["neck"] },
    { label: "handR", d: "696,320! 712,310! 728,304! 764,326! 796,336! 768,342! 732,348! 724,366! 723,394! 720,380! 713,364! 705,350! 700,338!", over: ["bg", "cup", "hairB", "hairF", "pad"] },
    { label: "hairB", d: "634,322! 648,322! 652,350! 640,366! 634,366!", over: ["earr", "neck", "bg"] },
    { label: "hairB", d: "376,398! 398,404! 398,408.6! 390,410.4! 382,412.4! 377,414!", over: ["armL"] },
    { label: "hairB", d: "644,326! 664,326! 664,352! 644,352!", over: ["earr"] },
    { label: "dev", d: "290,1390! 304,1352! 346,1350! 338,1380! 320,1404! 296,1407! 278,1400! 276,1391!", over: ["pocket", "pants", "devP"] },
    { label: "bg", d: "674,334! 702,316! 708,342! 690,350!", over: ["cup"] },
    { label: "dev", d: "258,1388! 300,1393! 304,1407! 258,1403!", over: ["pocket", "pants"] },
    { label: "devP", d: "230,1335! 222,1386! 276,1392! 290,1382! 294,1330!", over: ["devF", "dev"] },
  ],
  defs: {
    bg: { color: "#ffffff", kind: "flat", z: 0 },
    hairF: { color: HAIR, kind: "hair", z: 7, rim: 2.6 }, hairB: { color: "#a88089", kind: "hair", z: 1, rim: 2.6 },
    face: { ...SKINTONE, z: 5 }, neck: { ...SKINTONE, z: 1 }, ear: { ...SKINTONE, z: 4 }, armL: { ...SKINTONE, z: 4 }, armR: { ...SKINTONE, z: 2, rim: 2.4 }, handR: { ...SKINTONE, z: 9, rim: 2.4 }, handL: { ...SKINTONE, z: 8, rim: 2.4 },
    band: { color: BONE, kind: "pale", z: 8 }, hinge: { color: STEEL, kind: "metal", z: 9 }, pad: { color: "#514c58", kind: "dark", z: 8 }, cup: { color: BONE, kind: "pale", z: 8 }, disc: { color: AMBER, kind: "cloth", z: 8 }, earr: { color: "#d0ae72", kind: "metal", z: 6 },
    turtle: { color: TOP, kind: "dark", z: 4 }, top: { color: TOP, kind: "dark", z: 3, rim: 2.8 }, trimT: { color: "#67626f", kind: "dark", z: 4 }, strap: { color: AMBER, kind: "cloth", z: 5 }, buckS: { color: STEEL, kind: "metal", z: 6 }, clipS: { color: STEEL, kind: "metal", z: 8 },
    jackL: { color: JACK, kind: "cloth", z: 6, rim: 2.8 }, jackR: { color: JACK, kind: "cloth", z: 5, rim: 2.8 }, trimL: { color: BONE, kind: "pale", z: 7 }, trimR: { color: BONE, kind: "pale", z: 6 }, snap: { color: STEEL, kind: "metal", z: 8 }, flap: { color: "#7f9c9a", kind: "cloth", z: 7, rim: 2.8 }, tab: { color: "#b4bd7c", kind: "cloth", z: 7 }, lining: { color: "#ad8a76", kind: "cloth", z: 1 }, cuffL: { color: "#55525e", kind: "dark", z: 7 }, cuffR: { color: "#55525e", kind: "dark", z: 6 },
    belt: { color: "#55494a", kind: "dark", z: 4 }, loopB: { color: "#9c9385", kind: "cloth", z: 5 }, buckle: { color: STEEL, kind: "metal", z: 6 }, beltT: { color: "#b4bd7c", kind: "cloth", z: 4 }, pants: { color: "#a8a093", kind: "cloth", z: 2, rim: 2.8 }, pocket: { color: "#b3ab9d", kind: "cloth", z: 3 }, tabP: { color: "#57525c", kind: "dark", z: 3 },
    dev: { color: AMBER, kind: "cloth", z: 6 }, devH: { color: "#514c58", kind: "dark", z: 5 }, devF: { color: BONE, kind: "pale", z: 6 }, devP: { color: "#55525e", kind: "dark", z: 6 }, devW: { color: "#3b3842", kind: "dark", z: 6 }, cass: { color: "#efe3cf", kind: "pale", z: 6 }, reel: { color: "#3b3842", kind: "dark", z: 6 }, btn: { color: "#d8d3cb", kind: "pale", z: 7 }, knob: { color: STEEL, kind: "metal", z: 8 }, lug: { color: "#514c58", kind: "dark", z: 7 },
  },
  grads: [
    { on: ["hairF"], a: [430, 150], b: [250, 440], to: [148, 116, 142], k: 0.72 }, { on: ["hairB"], a: [480, 320], b: [460, 470], to: [116, 94, 122], k: 0.7 }, { on: ["top", "turtle"], a: [520, 440], b: [600, 960], to: [66, 60, 74], k: 0.5 }, { on: ["jackL"], a: [200, 560], b: [180, 1080], to: [88, 112, 122], k: 0.7 }, { on: ["jackR"], a: [850, 540], b: [900, 1040], to: [88, 112, 122], k: 0.7 },
    { on: ["pants"], a: [480, 1020], b: [520, 1536], to: [132, 124, 124], k: 0.75 }, { on: ["strap"], a: [640, 560], b: [440, 1080], to: [190, 144, 98], k: 0.6 }, { on: ["dev"], a: [80, 1180], b: [280, 1400], to: [190, 144, 98], k: 0.6 }, { on: ["devF"], a: [80, 1200], b: [240, 1390], to: [214, 206, 204], k: 0.6 }, { on: ["disc"], a: [670, 200], b: [720, 300], to: [190, 144, 98], k: 0.6 }, { on: ["lining"], a: [260, 740], b: [360, 1010], to: [140, 108, 98], k: 0.6 },
  ],
  casts: [
    c("hairF", "face ear neck", 11), c("hairF", "hairB", 10), c("face", "neck", 38), c("band", "hairF", 9), c("cup pad", "hairF hairB face neck", 9), c("handR", "cup disc pad hairB", 9), c("earr", "neck armL hairB", 5), c("turtle", "top", 8), c("hairF hairB", "armL", 6), c("armL", "top trimT", 5),
    c("trimL", "jackL lining", 15), c("trimT", "top", 3), c("strap", "top armR pants belt", 8), c("buckS", "top strap", 4), c("top", "belt pants", 9), c("top", "armR jackR trimR", 15), c("belt", "pants", 10), c("loopB buckle", "belt pants", 5), c("beltT", "pants", 8), c("pocket", "pants tabP", 8), c("tabP", "pants", 4), c("trimR", "jackR", 5), c("jackR", "trimR", 4),
    c("cuffR", "jackR", 9), c("handR", "cuffR", 3), c("flap", "jackL jackR tab", 8), c("tab", "jackL jackR", 4), c("jackL", "cuffL", 13), c("cuffL", "handL", 13), c("handL", "dev devF devW cass", 10), c("dev devF", "pants pocket", 18), c("clipS", "pants strap dev lug", 5), c("lug", "dev", 4), c("knob", "devP", 8), c("btn", "devF", 3), c("snap", "jackL pocket dev devF devP buckle", 2.5), c("jackL", "devH dev", 12), c("devW", "cass", 4), c("jackL", "pants belt", 10),
  ],
  shapes: [
    ...HAIR_SHAPES,

    ...SKIN,
    ...sa("sheen", 0.9, "armL", "330,480! 366,440 400,428! 376,460 346,500!"), ...sa("hi", 0.7, "armL", "348,470! 352,467 354,473 350,476"),

    ...CLOTH,
    ...TROUSERS,
    ...GEAR,
  ],
  soft: [],
  washes: [
    ws("armL", 356, 470, 60, 60, [248, 206, 188], 0.5), ws("armL", 450, 600, 60, 50, [248, 206, 190], 0.35), ws("handL", 250, 1060, 60, 50, [248, 204, 188], 0.4), ws("handL", 170, 1200, 60, 30, [244, 184, 170], 0.6), ws("handR", 760, 350, 60, 40, [248, 204, 188], 0.4), ws("handR", 730, 280, 40, 40, [244, 184, 170], 0.5), ws("ear", 410, 358, 24, 24, [244, 176, 158], 0.6), ws("armR", 712, 560, 36, 30, [248, 206, 190], 0.4),
    ws("face", 428, 326, 44, 24, [250, 196, 176], 0.62, true), ws("face", 548, 268, 44, 24, [250, 196, 176], 0.55, true), ws("face", 480, 296, 20, 16, [250, 206, 190], 0.4, true), ws("face", 520, 360, 40, 20, [250, 214, 198], 0.35, true),
    ws("hairF", 476, 262, 44, 24, [246, 212, 200], 0.5, true), ws("hairF", 384, 262, 26, 40, [246, 212, 200], 0.4, true), ws("hairF", 580, 290, 24, 24, [246, 212, 200], 0.4, true),
    ws("hairF", 400, 90, 130, 70, [226, 190, 178], 0.4), ws("hairF", 170, 310, 70, 60, [150, 132, 176], 0.45), ws("hairF", 300, 440, 60, 50, [140, 120, 166], 0.5), ws("hairB", 650, 450, 40, 50, [130, 112, 160], 0.5),
  ],
  noink: [],
  eyes: [
    { lash: ["s68"], lid: ["s86", "s83"], iris: ["s82", "s75"], crease: ["s65", "s67"], tips: ["s87@1", "s64@0", "s68@1"], color: TEAL },
    { lash: ["s114"], lid: ["s132", "s118"], iris: ["s119", "s115"], crease: ["s105", "s102"], tips: ["s129@0", "s114@0"], color: TEAL },
  ],
  face: (g) => {
    const path = (d: string): void => { g.beginPath(); loop(d).forEach(([x, y]: P2, i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath() }
    const fill = (d: string, s: string | CanvasGradient): void => { path(d); g.fillStyle = s; g.fill() }
    const st = (d: string, w: number, s: string): void => { g.beginPath(); curve(d).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = w; g.strokeStyle = s; g.lineCap = "round"; g.stroke() }
    for (let i = 0; i < 4; i++) { st(`${418 + i * 8},${321 - i * 1.4} ${413 + i * 8},${332 - i * 1.4}`, 1.1, "rgba(232,140,118,.5)"); st(`${540 + i * 8},${263 - i * 2} ${535 + i * 8},${274 - i * 2}`, 1.1, "rgba(232,140,118,.5)") }
    fill("478,284! 483,281 486,287 481,297! 477,291", "#fffcf7")
    fill("487,339! 498,329 514,322 536,315! 526,326 511,335 498,340!", "#94474a"); fill("494,333! 508,326 528,320! 516,328 500,335!", "#f6ece8"); fill("496,342! 512,338 524,330! 518,342 504,346!", "rgba(236,150,138,.4)")
    // prints on the player
    fill("112,1240! 226,1246! 224,1254! 110,1248!", "#b87567"); g.save(); g.translate(142, 1264); g.rotate(0.05); g.fillStyle = "#4c4853"; g.font = "800 9px 'Avenir Next Condensed', 'Arial Narrow', sans-serif"; g.fillText("SIDE A", 4, 8); g.restore()
    fill("70,1326! 98,1328! 94,1350! 66,1346!", "#b87567")
    g.strokeStyle = "rgba(76,72,83,.6)"; g.lineWidth = 1; for (let i = 0; i < 9; i++) { const a = -2.5 + i * 0.5; g.beginPath(); g.moveTo(285 + Math.cos(a) * 30, 1213 + Math.sin(a) * 30); g.lineTo(285 + Math.cos(a) * 34, 1213 + Math.sin(a) * 34); g.strokeStyle = "rgba(232,228,223,.6)"; g.stroke() }
    g.fillStyle = "#b7c95a"; g.beginPath(); g.arc(283, 1322, 4, 0, 7); g.fill(); g.fillStyle = "rgba(232,228,223,.75)"; g.font = "700 8px 'Avenir Next', sans-serif"; g.save(); g.translate(252, 1352); g.rotate(0.07); g.fillText("VOL", 0, 0); g.restore()
    // a printed line down the sleeve and a back-print corner
    g.save(); g.translate(252, 664); g.rotate(0.42); g.font = "800 15px 'Avenir Next Condensed', 'Arial Narrow', sans-serif"; g.fillStyle = "rgba(238,234,226,.9)"; g.fillText("LOW TIDE", 0, 6); g.font = "600 6.5px 'Avenir Next', sans-serif"; g.fillText("RECORD EVERYTHING", 1, 16); g.restore()
  },
  folders: FOLDERS,
  over: tapeOver("rgba(96,70,84,.8)"),
  back: (g) => {
    // sound: arcs with a glow, and three bars, in the references' floating-graphic manner
    g.lineCap = "round"; g.shadowColor = "rgba(96,206,206,.75)"; g.shadowBlur = 16
    for (const [r, a, w] of [[74, 1, 7], [102, 0.85, 6], [130, 0.6, 5]] as const) { g.globalAlpha = a; g.strokeStyle = "#8fd8d6"; g.lineWidth = w; g.beginPath(); g.arc(720, 230, r, -0.95, -0.15); g.stroke() }
    g.globalAlpha = 1; g.shadowBlur = 0
    g.fillStyle = "#f1cd84"; g.shadowColor = "rgba(246,214,140,.8)"; g.shadowBlur = 14; for (const [x, y, w, h, t] of [[92, 150, 22, 62, -0.5], [136, 120, 18, 44, -0.2], [66, 206, 18, 40, -0.8]] as const) { g.save(); g.translate(x, y); g.rotate(t); g.fillRect(-w / 2, -h / 2, w, h); g.restore() }
    g.shadowBlur = 0
    g.strokeStyle = "rgba(120,208,214,.85)"; g.lineWidth = 2; for (const [x, y, r] of [[900, 330, 7], [930, 360, 4], [880, 380, 3]] as const) { g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke() }
    g.fillStyle = "#f1cd84"; for (const [x, y, s] of [[940, 250, 12], [70, 420, 10]] as const) { g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283 - 1.571, q = i % 2 ? s * 0.34 : s; g.lineTo(x + Math.cos(a) * q * 0.8, y + Math.sin(a) * q) } g.fill() }
  },
  front: () => undefined,
}
