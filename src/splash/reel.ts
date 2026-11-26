import type { Art } from "./engine.ts"
import { painted } from "../bold/eye.ts"
import { BROWS, DETAILS } from "./reel-face.ts"

const c = (a: string, b: string, d: number, deep?: number): readonly [ReadonlyArray<string>, ReadonlyArray<string>, number, number?] => (deep ? [a.split(" "), b.split(" "), d, deep] : [a.split(" "), b.split(" "), d])
import { CLICKS, WALLS } from "./reel-clicks.ts"
import { LINES } from "./reel-lines.ts"
import { SHADOWS } from "./reel-shadows.ts"
import { SHAPES } from "./reel-shapes.ts"

/** Head height crown to chin in line-art px, and the parts: colour, material, height in the stack (higher casts on lower). */
export const ART: Art = {
  head: 320, src: "/reel.png", w: 1086, h: 1448, seeds: [], lines: LINES, clicks: { at: CLICKS, walls: WALLS, move: [{ label: "hairF", d: "679,236! 696,236! 698,300! 694,360! 684,400! 668,425! 650,438! 632,442! 646,428! 624,421! 645,405! 660,380! 672,340! 678,290!", over: ["face"] }] }, walls: [], force: [],
  defs: {
    bg: { color: "#ffffff", kind: "flat", z: 0 },
    hairB: { color: "#363e62", kind: "hair", z: 2, rim: 1 },
    hairF: { color: "#434c76", kind: "hair", z: 14 },
    face: { color: "#fdeee6", kind: "skin", z: 9 },
    ear: { color: "#fdeee6", kind: "skin", z: 10 },
    neck: { color: "#fdeee6", kind: "skin", z: 4, deep: 1.2 },
    collar: { color: "#f4f1ea", kind: "pale", z: 8 },
    collarIn: { color: "#c9c4bd", kind: "pale", z: 6 },
    scarf: { color: "#c8463d", kind: "cloth", z: 10 },
    shirt: { color: "#f4f1ea", kind: "pale", z: 5 },
    coat: { color: "#937d63", kind: "cloth", z: 6 },
    lapel: { color: "#d9c9a8", kind: "cloth", z: 7 },
    lapelT: { color: "#6a2d2b", kind: "cloth", z: 8 },
    trim: { color: "#6a2d2b", kind: "cloth", z: 8 },
    sleeveL: { color: "#937d63", kind: "cloth", z: 9 },
    sleeveR: { color: "#87715a", kind: "cloth", z: 5, deep: 1.4 },
    cuff: { color: "#d9c9a8", kind: "cloth", z: 10 },
    btn: { color: "#d8b25a", kind: "metal", z: 12 },
    armL: { color: "#fdeee6", kind: "skin", z: 11 },
    handL: { color: "#fdeee6", kind: "skin", z: 13 },
    handR: { color: "#fdeee6", kind: "skin", z: 16 },
    armR: { color: "#fdeee6", kind: "skin", z: 15 },
    film: { color: "#b08245", kind: "plastic", z: 12, rim: 0 },
    sash: { color: "#6a2d2b", kind: "cloth", z: 8 },
    skirt: { color: "#87715a", kind: "cloth", z: 4 },
    clip: { color: "#b7bcc6", kind: "metal", z: 14 },
  },
  light: { fall: [0.78, 0.62], up: 0.5 }, focus: { x: 560, y: 320, rx: 210, ry: 210, dim: 0.06 },
  // values: { dark: [], mid: [], light: [] }, apart: [["hairF", "face", 65]],          the value plan: gate.ts and finish.ts
  // field: "/wip/reel-field.bin", formed: [], meshCasts: [],                        after form.ts --field: what the mesh shades and casts by itself
  shadows: SHADOWS,
  grads: [{ on: ["hairF", "hairB"], a: [640, 120], b: [520, 520], to: [24, 30, 58], k: 0.5 }, { on: ["coat", "skirt", "sleeveL", "sleeveR"], a: [400, 700], b: [700, 1440], to: [104, 70, 56], k: 0.5 }, { on: ["armL", "handL"], a: [200, 300], b: [120, 820], to: [250, 222, 210], k: 0.4 }],
  hair: [{ on: ["hairF"], root: [640, 120], tip: 10, shade: 0, streaks: false }, { on: ["hairB"], root: [680, 160], tip: 8, shade: 0, streaks: false }],
  forms: [
    { on: ["ear"], by: "part", turn: 0.4 }, { on: ["armL", "armR"], by: "part", turn: 0.36 }, { on: ["handL", "handR"], by: "patch", turn: 0.36 },
    { on: ["coat", "skirt", "sleeveL", "sleeveR", "collarIn", "lapel", "sash"], by: "patch", turn: 0.36 },
    { on: ["lapelT", "trim", "cuff", "film"], by: "patch", turn: 0.3 }, { on: ["btn", "clip"], by: "patch" },
  ],
  solids: [{ on: ["armL"], tube: "250,700 150,770 70,830" }, { on: ["armL"], tube: "70,830 110,560 165,290" }, { on: ["armR"], tube: "700,800 800,1060 885,1280" }, ],
  depth: { hairB: 0.25, sleeveR: 0.15, collarIn: 0.2, skirt: 0.1 },
  scatter: ["armL", "armR", "handL", "handR", "neck"], print: ["film", "clip"], inkGain: 1.8,
  values: { dark: ["hairF", "hairB", "sash", "lapelT"], mid: ["film", "coat", "sleeveL", "sleeveR", "skirt", "scarf"], light: ["face", "neck", "clip", "armL", "armR", "handL", "handR", "shirt", "collar", "lapel", "cuff"] },
  apart: [["hairF", "face", 110], ["coat", "lapel", 50], ["coat", "shirt", 70], ["scarf", "collar", 70], ["hairB", "coat", 40], ["armL", "coat sleeveL", 70], ["sash", "coat", 30]],
  casts: [
    c("hairF", "ear neck", 8, 0.25), c("hairF", "hairB", 8, 0.5), c("hairB", "neck collar collarIn shirt", 14, 0.5), c("ear", "hairB", 5),
    c("collar", "neck shirt collarIn", 10, 0.5), c("scarf", "shirt collar", 10, 0.5), c("lapel lapelT", "coat shirt", 10, 0.5), c("film", "hairB hairF coat lapel shirt sleeveL", 14, 0.5), c("handR", "lapel shirt scarf coat film", 16, 0.5), c("armR", "coat lapel", 18, 0.5), c("handL", "film", 6),
    c("sleeveL", "armL coat", 12, 0.5), c("cuff", "armL armR sleeveL sleeveR", 6, 0.5), c("sleeveR", "coat", 10, 0.5), c("btn", "coat", 4, 0.5), c("trim", "sleeveL", 3), c("sash", "coat skirt", 10, 0.5), c("clip", "sash skirt coat", 12, 0.5), c("coat", "skirt", 10, 0.5),
  ],
  bevels: [{ on: ["btn", "clip"], w: 1.6, lit: 0.95 }, { on: ["lapelT", "trim", "cuff", "sash"], w: 1.8, lit: 0.5 }, { on: ["film"], w: 1.6, lit: 0.6 }],
  washes: [{ on: ["hairB"], x: 904, y: 390, rx: 14, ry: 60, color: [168, 128, 236], a: 0.8, late: true }, { on: ["hairB"], x: 850, y: 478, rx: 50, ry: 12, color: [168, 128, 236], a: 0.75, late: true }, { on: ["face"], x: 590, y: 330, rx: 26, ry: 14, color: [250, 176, 166], a: 0.3, late: true }, { on: ["ear"], x: 797, y: 320, rx: 18, ry: 24, color: [246, 160, 148], a: 0.35 }],
  shapes: SHAPES, soft: [], noink: [],
  // ...painted([...eyeDetails("Eyes", EYE, LOOK), ...eyeLights("Highlights", EYE, LOOK)]),   instead of face and over: the eye kit, each piece a layer (bold/eye.ts)
  // folders: [["Hair back", "hairB", "fine"], ["Face", "face", "fine"]], lineGroups: [],            the layered file (docs/layers.md)
  ...painted(DETAILS), brows: BROWS, back: () => undefined, front: () => undefined,
}
