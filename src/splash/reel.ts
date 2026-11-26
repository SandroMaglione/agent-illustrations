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
  head: 330, src: "/reel.png", w: 1086, h: 1448, seeds: [], lines: LINES, clicks: { at: CLICKS, walls: WALLS, move: [{ label: "face", d: "697,238! 690,214! 720,232! 750,256! 775,284! 766,300! 760,330! 765,352! 745,372! 725,410! 705,445! 696,451! 670,463! 652,437! 668,425! 684,400! 694,360! 698,300!", over: ["hairB", "hairF", "neck"] }, { label: "face", d: "520,244! 552,222! 590,212! 620,207! 660,208! 676,214! 681,236! 676,262! 600,262! 540,262!", over: ["hairF"] }, { label: "hairF", d: "679,236! 696,236! 698,300! 694,360! 684,400! 668,425! 650,438! 632,442! 646,428! 624,421! 645,405! 660,380! 672,340! 678,290!", over: ["face", "hairB", "neck"] }] }, walls: [], force: [],
  defs: {
    bg: { color: "#ffffff", kind: "flat", z: 0 },
    hairB: { color: "#a49dbc", kind: "hair", rim: 0.4, z: 2 },
    hairF: { color: "#b7b0cc", kind: "hair", rim: 0.4, z: 14 },
    face: { color: "#fdeee6", kind: "skin", z: 9 },
    ear: { color: "#fdeee6", kind: "skin", z: 10 },
    neck: { color: "#fdeee6", kind: "skin", z: 4 },
    collar: { color: "#f5f2ee", kind: "pale", z: 8 },
    collarIn: { color: "#d8d4d2", kind: "pale", z: 6 },
    scarf: { color: "#d8343f", kind: "cloth", rim: 0.15, z: 10 },
    shirt: { color: "#f5f2ee", kind: "pale", z: 5 },
    coat: { color: "#2f2e38", kind: "cloth", rim: 0, z: 6 },
    lapel: { color: "#8e2233", kind: "cloth", rim: 0.15, z: 7 },
    lapelT: { color: "#1e1d24", kind: "cloth", z: 8 },
    trim: { color: "#8e2233", kind: "cloth", rim: 0.15, z: 8 },
    sleeveL: { color: "#2f2e38", kind: "cloth", rim: 0, z: 9 },
    sleeveR: { color: "#2f2e38", kind: "cloth", rim: 0, z: 5 },
    cuff: { color: "#8e2233", kind: "cloth", rim: 0.15, z: 10 },
    btn: { color: "#d8b25a", kind: "metal", z: 12 },
    armL: { color: "#fdeee6", kind: "skin", rim: 0, z: 11 },
    handL: { color: "#fdeee6", kind: "skin", z: 13 },
    handR: { color: "#fdeee6", kind: "skin", z: 16 },
    armR: { color: "#fdeee6", kind: "skin", rim: 0, z: 15 },
    film: { color: "#c48a3a", kind: "plastic", z: 12, rim: 0 },
    sash: { color: "#8e2233", kind: "cloth", rim: 0.15, z: 8 },
    skirt: { color: "#2f2e38", kind: "cloth", rim: 0, z: 4 },
    clip: { color: "#b7bcc6", kind: "metal", z: 14 },
  },
  light: { fall: [0.78, 0.62], up: 0.5 }, focus: { x: 580, y: 300, rx: 220, ry: 220, dim: 0.06 },
  // values: { dark: [], mid: [], light: [] }, apart: [["hairF", "face", 65]],          the value plan: gate.ts and finish.ts
  // field: "/wip/reel-field.bin", formed: [], meshCasts: [],                        after form.ts --field: what the mesh shades and casts by itself
  shadows: SHADOWS,
  grads: [{ on: ["hairF", "hairB"], a: [600, 80], b: [520, 560], to: [150, 140, 178], k: 0.5 }, { on: ["coat", "skirt", "sleeveL", "sleeveR"], a: [500, 700], b: [700, 1440], to: [34, 32, 44], k: 0.5 }],
  hair: [{ on: ["hairF"], root: [620, 90], tip: 8, shade: 0, streaks: false }, { on: ["hairB"], root: [700, 160], tip: 8, shade: 0, streaks: false }],
  forms: [
    { on: ["ear"], by: "part", turn: 0.4 }, { on: ["sash", "cuff", "collarIn"], by: "patch", turn: 0.36 },
    { on: ["lapelT", "trim", "film"], by: "patch", turn: 0.3 }, { on: ["btn", "clip"], by: "patch" },
  ],
  solids: [{ on: ["armL"], tube: "150,280,36 123,400,40 97,520,47 89,640,58 85,780,55" }, { on: ["armL"], tube: "90,830,40 180,790,45 260,740,45" }, { on: ["armR"], tube: "700,880,42 760,1000,46 840,1150,46 885,1260,40" }, { on: ["armR"], tube: "928,980,34 912,1120,36 895,1255,34" }],
  depth: { hairB: 0.25, sleeveR: 0.15, collarIn: 0.2, skirt: 0.1 },
  scatter: ["neck"], flatShade: ["armL", "armR", "handL", "handR", "face", "neck"], print: ["film", "clip"], inkGain: 1.8,
  values: { dark: ["coat", "sleeveL", "sleeveR", "skirt", "lapelT"], mid: ["lapel", "cuff", "trim", "sash", "scarf", "film", "clip"], light: ["face", "neck", "armL", "armR", "handL", "handR", "shirt", "collar", "hairF", "hairB"] },
  apart: [["hairF", "coat", 100], ["face", "hairF", 30], ["lapel", "coat", 40], ["shirt", "coat", 120], ["armL armR", "coat sleeveL sleeveR", 120], ["scarf", "shirt", 80]],
  casts: [
    c("hairF", "face ear neck", 8, 0.25), c("hairF", "hairB", 8, 0.5), c("hairB", "neck collar collarIn shirt", 14, 0.5), c("ear", "hairB", 5),
    c("collar", "neck shirt collarIn", 10, 0.5), c("scarf", "shirt collar", 10, 0.5), c("lapel lapelT", "coat shirt", 10, 0.5), c("film", "hairB hairF coat lapel shirt sleeveL", 14, 0.5), c("handR", "lapel shirt scarf coat film", 16, 0.5), c("armR", "coat lapel", 18, 0.5), c("handL", "film", 6),
    c("sleeveL", "coat", 12, 0.5), c("cuff", "armL armR sleeveL sleeveR", 6, 0.5), c("sleeveR", "coat", 10, 0.5), c("btn", "coat", 4, 0.5), c("trim", "sleeveL", 3), c("sash", "coat skirt", 10, 0.5), c("clip", "sash skirt coat", 12, 0.5), c("coat", "skirt", 10, 0.5),
  ],
  bevels: [{ on: ["btn", "clip"], w: 1.6, lit: 0.95 }, { on: ["lapelT", "trim", "cuff", "sash"], w: 1.8, lit: 0.5 }],
  washes: [{ on: ["face"], x: 588, y: 330, rx: 26, ry: 13, color: [250, 176, 166], a: 0.32, late: true }, { on: ["ear"], x: 790, y: 330, rx: 18, ry: 24, color: [246, 160, 148], a: 0.35 }],
  shapes: SHAPES, soft: [], noink: [],
  // ...painted([...eyeDetails("Eyes", EYE, LOOK), ...eyeLights("Highlights", EYE, LOOK)]),   instead of face and over: the eye kit, each piece a layer (bold/eye.ts)
  // folders: [["Hair back", "hairB", "fine"], ["Face", "face", "fine"]], lineGroups: [],            the layered file (docs/layers.md)
  ...painted(DETAILS), brows: BROWS, back: () => undefined, front: () => undefined,
}
