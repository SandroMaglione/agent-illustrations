import type { Iris } from "../tools/eyes.ts"
import type { Art } from "./engine.ts"
import { CLICKS, WALLS } from "./rig-clicks.ts"
import { CLOTH } from "./rig-cloth.ts"
import { GEAR } from "./rig-gear.ts"
import { HAIR as HAIR_SHAPES } from "./rig-hair.ts"
import { LINES } from "./rig-lines.ts"
import { SKIN } from "./rig-skin.ts"

const c = (a: string, b: string, d: number, deep?: number): readonly [ReadonlyArray<string>, ReadonlyArray<string>, number, number?] => (deep ? [a.split(" "), b.split(" "), d, deep] : [a.split(" "), b.split(" "), d])
const SK = { color: "#fcf1ec", kind: "skin" as const }, HAIR = "#cdd6dc", BONE = "#e6e1da", COAL = "#504f5b", ORANGE = "#cf8452", STEEL = "#a9acb8", BRASS = "#c2a06c"
const AMBER: Iris = { deep: [92, 44, 32], mid: [204, 118, 52], light: [246, 196, 108], glow: [255, 240, 194], ring: [72, 34, 28] }

export const RIG: Art = {
  head: 600, 
  src: "/rig.png", w: 1086, h: 1448, seeds: [], lines: LINES, clicks: { at: CLICKS, walls: WALLS }, walls: [], force: [],
  defs: {
    bg: { color: "#ffffff", kind: "flat", z: 0 },
    hairF: { color: HAIR, kind: "hair", z: 7, rim: 3 }, hairB: { color: "#8c9aab", kind: "hair", z: 1, rim: 3 }, braid: { color: "#8f9cac", kind: "hair", z: 3, rim: 3 }, tie: { color: ORANGE, kind: "cloth", z: 4 }, brow: { color: "#6d7a8c", kind: "hair", z: 5 },
    face: { ...SK, z: 5 }, ear: { ...SK, z: 6 }, neck: { ...SK, z: 1 }, mouth: { color: "#b0605f", kind: "flat", z: 5 }, teethM: { color: "#f8f1ee", kind: "skin", z: 5 },
    strap: { color: "#77645c", kind: "leather", z: 8 }, buckIn: { color: "#5f5050", kind: "cloth", z: 8 }, screw: { color: BRASS, kind: "metal", z: 11 }, buckle: { color: BRASS, kind: "metal", z: 9 }, bridge: { color: "#5b4f50", kind: "leather", z: 9 }, frame: { color: COAL, kind: "plastic", z: 10 }, rim: { color: BRASS, kind: "metal", z: 11 }, lens: { color: "#bf8656", kind: "glass", z: 10 }, hw: { color: STEEL, kind: "metal", z: 11 },
    collar: { color: "#74818e", kind: "cloth", z: 8 }, trim: { color: ORANGE, kind: "cloth", z: 9, rim: 3 }, btn: { color: BRASS, kind: "metal", z: 10 }, colIn: { color: "#46444f", kind: "dark", z: 2 },
    jack: { color: "#8592a0", kind: "cloth", z: 4, rim: 3 }, cap: { color: "#98a4b0", kind: "cloth", z: 7, rim: 3 }, patch: { color: "#5e5d6a", kind: "dark", z: 7, rim: 3 }, sleeve: { color: "#909da9", kind: "cloth", z: 6, rim: 3 }, stripe: { color: "#bd7844", kind: "cloth", z: 6 }, seam: { color: "#b9bec4", kind: "cloth", z: 6 }, inner: { color: "#45444f", kind: "dark", z: 5 },
    band: { color: "#b5713f", kind: "cloth", z: 4 }, panel: { color: "#9eaab5", kind: "cloth", z: 4 }, tape: { color: "#3f3e49", kind: "dark", z: 5 }, zip: { color: BRASS, kind: "metal", z: 6 }, pull: { color: STEEL, kind: "metal", z: 8 },
  },
  grads: [
    { on: ["hairF"], a: [600, 150], b: [330, 620], to: [124, 126, 158], k: 0.55 }, { on: ["hairF"], a: [780, 330], b: [960, 560], to: [104, 108, 142], k: 0.75 }, { on: ["hairB"], a: [300, 400], b: [330, 720], to: [98, 98, 132], k: 0.6 }, { on: ["braid"], a: [130, 560], b: [260, 790], to: [84, 86, 120], k: 0.75 },
    { on: ["cap", "sleeve"], a: [140, 860], b: [400, 1448], to: [92, 100, 122], k: 0.5 }, { on: ["jack", "panel"], a: [520, 940], b: [900, 1448], to: [88, 96, 118], k: 0.5 }, { on: ["patch", "inner"], a: [200, 860], b: [330, 1448], to: [68, 64, 82], k: 0.6 }, { on: ["collar"], a: [300, 760], b: [620, 940], to: [62, 66, 84], k: 0.6 }, { on: ["lens"], a: [520, 80], b: [600, 190], to: [214, 172, 120], k: 0.7 }, { on: ["lens"], a: [790, 110], b: [850, 230], to: [214, 172, 120], k: 0.7 }, { on: ["strap"], a: [400, 180], b: [330, 360], to: [94, 76, 78], k: 0.6 }, { on: ["mouth"], a: [620, 655], b: [635, 730], to: [216, 128, 118], k: 0.9 },
  ],
  /* key light: upper left, a little in front. Nothing in this file may contradict it */
  light: { fall: [0.64, 0.77], up: 0.58 },
  focus: { x: 610, y: 540, rx: 300, ry: 260, dim: 0.16 },
  forms: [
    { on: ["frame", "strap", "buckle", "pull", "btn", "tie"], by: "patch", turn: 0.3 }, { on: ["hw", "rim", "screw", "zip"], by: "patch" }, { on: ["collar", "trim", "colIn"], by: "part", turn: 0.2 }, { on: ["cap", "patch"], by: "mass", turn: 0.34 }, { on: ["sleeve", "stripe"], by: "patch", turn: 0.3 }, { on: ["inner"], by: "part", turn: 0.3 }, { on: ["jack", "panel", "band", "tape", "zip", "seam"], by: "mass", turn: 0.2 }, { on: ["braid"], by: "patch", turn: 0.3 }, { on: ["hairB"], by: "part", turn: 0.4 }, { on: ["lens"], by: "part", turn: 1 }, { on: ["ear", "neck"], by: "part", turn: 0.3 },
  ],
  inherits: [[["btn"], ["collar"]], [["trim"], ["collar", "colIn"]], [["seam", "stripe"], ["sleeve", "inner"]], [["seam"], ["jack", "panel"]], [["zip"], ["tape", "panel", "jack"]]],
  bevels: [{ on: ["frame"], w: 18, lit: 0 }, { on: ["frame"], w: 8, lit: 0.9, deep: true }, { on: ["hw"], w: 13, lit: 0 }, { on: ["hw"], w: 5, lit: 0.95, deep: true }, { on: ["buckle"], w: 7, lit: 0.95, deep: true }, { on: ["rim"], w: 6, lit: 0.9, deep: true }, { on: ["btn"], w: 11, lit: 0.95 }, { on: ["bridge"], w: 7, lit: 0.6 }, { on: ["strap"], w: 9, lit: 0.6 }, { on: ["trim"], w: 7, lit: 0.6 }, { on: ["tie"], w: 8, lit: 0.8 }],
  casts: [
    c("hairF", "face ear neck", 40, 0.2), c("hairF", "brow", 14), c("hairF", "hairB", 26, 0.5), c("ear", "hairB neck face", 14, 0.5), c("face ear", "neck", 70), c("hairB", "neck face", 20), c("strap", "hairF hairB", 76, 0.5), c("buckle", "strap hairF buckIn", 24, 0.6), c("frame rim", "hairF bridge", 120, 0.5), c("frame", "strap", 40, 0.5), c("hw", "strap", 26, 0.5), c("hw", "hairF", 84, 0.5), c("rim", "lens", 20, 0.4), c("rim", "frame", 5), c("hw screw", "frame", 8, 0.5), c("tie", "braid hairB", 16, 0.5), c("braid", "collar", 20), c("teethM", "mouth", 24, 0.5), c("face", "mouth", 8),
    c("face hairB neck", "trim collar colIn", 46, 0.4), c("trim collar", "colIn jack panel tape", 40, 0.45), c("collar", "cap sleeve", 34, 0.4), c("trim", "collar", 7), c("btn", "collar", 10, 0.5), c("cap", "sleeve inner seam stripe", 36, 0.5), c("cap sleeve inner", "jack panel seam band", 170, 0.36), c("sleeve", "inner seam", 8), c("seam", "inner", 7), c("pull", "panel zip tape trim seam band jack", 22, 0.5), c("tape zip", "panel band jack seam", 13, 0.5), c("seam", "band panel", 5), c("trim", "panel", 16, 0.4),
  ],
  shapes: [...HAIR_SHAPES, ...SKIN, ...GEAR, ...CLOTH],
  soft: [], noink: [],
  eyes: [
    { lash: ["s238[.5..1]", "s260", "s276", "s297[0..0.96]"], lid: ["s308"], iris: ["s282", "s278"], crease: ["s230"], tips: ["s238@0", "s297@1"], color: AMBER, lean: 17, slit: 0.42, blush: 0.3 },
    { lash: ["s351[.5..1]", "s349", "s343[0..0.6]"], lid: ["s361[.3..1]", "s401", "s381"], iris: ["s361[0..0.22]", "s346"], crease: ["s339"], tips: ["s365@0"], color: AMBER, lean: 12, slit: 0.42, blush: 0.25, cheek: 0.45, flick: ["s365", "s367", "s343", "s358", "s354[0..0.5]", "s368"] },
  ],
  washes: [{ on: ["ear"], x: 345, y: 500, rx: 50, ry: 80, color: [244, 166, 150], a: 0.35 }],
  face: (g) => { g.fillStyle = "#f6cfc9"; g.beginPath(); g.moveTo(688, 604); g.lineTo(700, 600); g.lineTo(703, 613); g.lineTo(692, 620); g.fill() },
  over: () => undefined, back: (g) => {
    // floating marks: a gauge behind the shoulder, three speed bars, sparks
    g.lineCap = "round"; g.shadowColor = "rgba(96,206,214,.75)"; g.shadowBlur = 16; g.strokeStyle = "#8fd8de"
    for (const [r, a, w] of [[72, 1, 6], [96, 0.85, 4.5]] as const) { g.globalAlpha = a; g.lineWidth = w; g.beginPath(); g.arc(985, 800, r, -2.6, 0.3); g.stroke() }
    g.lineWidth = 4; for (let i = 0; i < 11; i++) { const t = -2.6 + i * 0.29; g.globalAlpha = 0.9; g.beginPath(); g.moveTo(985 + Math.cos(t) * 62, 800 + Math.sin(t) * 50); g.lineTo(985 + Math.cos(t) * (i % 5 ? 57 : 61), 800 + Math.sin(t) * (i % 5 ? 57 : 61)); g.stroke() }
    g.globalAlpha = 1; g.strokeStyle = "#f0b87a"; g.shadowColor = "rgba(246,190,120,.8)"; g.beginPath(); g.moveTo(985, 800); g.lineTo(1014, 762); g.stroke()
    g.fillStyle = "#f0b87a"; for (const [x, y, w, h, t] of [[92, 210, 24, 74, -0.62], [140, 148, 20, 54, -0.42], [62, 292, 20, 48, -0.86]] as const) { g.save(); g.translate(x, y); g.rotate(t); g.fillRect(-w / 2, -h / 2, w, h); g.restore() }
    g.shadowBlur = 0; for (const [x, y, s] of [[1000, 250, 16], [60, 520, 12], [984, 560, 9]] as const) { g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283 - 1.571, q = i % 2 ? s * 0.34 : s; g.lineTo(x + Math.cos(a) * q * 0.8, y + Math.sin(a) * q) } g.fill() }
    g.strokeStyle = "rgba(120,208,214,.85)"; g.lineWidth = 2.4; for (const [x, y, r] of [[60, 420, 8], [92, 400, 4], [1010, 330, 6]] as const) { g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke() }
  }, front: () => undefined,
}
