/** Maren, the headphones line art again, from zero with docs/process.md. Regions and line numbers are tape's. */
import type { Art } from "./engine.ts"
import { BROWS, drawFace, drawLights, drawPrints, NOINK } from "./maren-face.ts"
import { SHADOWS } from "./maren-shadows.ts"
import { CLICKS, WALLS } from "./tape-clicks.ts"
import { LINES } from "./tape-lines.ts"

const P = (color: string, kind: Art["defs"][string]["kind"], z: number): Art["defs"][string] => ({ color, kind, z })
const c = (a: string, b: string, d: number, deep?: number): readonly [ReadonlyArray<string>, ReadonlyArray<string>, number, number?] => (deep ? [a.split(" "), b.split(" "), d, deep] : [a.split(" "), b.split(" "), d])
const SKIN = "#fdeee6", HAIR = "#58b88f", JACK = "#3a7478", TOP = "#2a2836", AMBER = "#dd913e", BONE = "#f6f0e8", STEEL = "#b3bccb", KHAKI = "#b2a289", LIME = "#a8bd4a"
export const ART: Art = {
  head: 390, src: "/tape.png", w: 1024, h: 1536, seeds: [], lines: LINES, clicks: { at: CLICKS, walls: WALLS, move: [{ label: "lining", d: "250,748! 312,750! 316,800! 298,818! 252,762!", over: ["trimL"] }] }, walls: [], force: [],
  defs: {
    bg: P("#ffffff", "flat", 0),
    hairF: P(HAIR, "hair", 7), hairB: P("#3f8f7c", "hair", 1), face: P(SKIN, "skin", 5), neck: P(SKIN, "skin", 1), ear: P(SKIN, "skin", 4), armL: P(SKIN, "skin", 4), armR: P(SKIN, "skin", 2), handR: P(SKIN, "skin", 9), handL: P(SKIN, "skin", 8),
    band: P(BONE, "plastic", 8), hinge: P(STEEL, "metal", 9), pad: P("#2d2b38", "leather", 8), cup: P(BONE, "plastic", 8.5), disc: P(AMBER, "plastic", 8.6), earr: P("#dfb04e", "metal", 6),
    turtle: P(TOP, "cloth", 4), top: P(TOP, "cloth", 3), trimT: P("#403e4c", "cloth", 4), strap: P(AMBER, "leather", 5), buckS: P(STEEL, "metal", 6), clipS: P(STEEL, "metal", 8),
    jackL: P(JACK, "cloth", 6), jackR: P(JACK, "cloth", 5), trimL: P(BONE, "pale", 7), trimR: P(BONE, "pale", 6), snap: P(STEEL, "metal", 8), flap: P("#4a878a", "cloth", 7), tab: P(LIME, "cloth", 6.8), lining: P("#8a4a38", "cloth", 1), cuffL: P("#34323f", "cloth", 7), cuffR: P("#34323f", "cloth", 6),
    belt: P("#3a2f33", "leather", 4), loopB: P("#8b8172", "cloth", 5), buckle: P(STEEL, "metal", 6), beltT: P(LIME, "cloth", 4), pants: P(KHAKI, "cloth", 2), pocket: P("#bfaf96", "cloth", 3), tabP: P("#3a3844", "cloth", 2.8),
    dev: P(AMBER, "cloth", 6), devH: P("#2d2b38", "leather", 5), devF: P(BONE, "plastic", 6.2), devP: P("#34323f", "plastic", 6.2), devW: P("#23212c", "dark", 6.3), cass: P("#f2e2c4", "plastic", 6.4), reel: P("#23212c", "dark", 6.5), btn: P("#d8d3cb", "plastic", 7), knob: P(STEEL, "metal", 8), lug: P("#2d2b38", "leather", 7),
  },
  grads: [
    { on: ["hairF"], a: [460, 90], b: [240, 440], to: [40, 132, 128], k: 0.5 }, { on: ["jackL", "jackR"], a: [300, 520], b: [520, 1060], to: [34, 74, 96], k: 0.5 }, { on: ["pants"], a: [420, 980], b: [640, 1540], to: [168, 146, 138], k: 0.55 }, { on: ["strap", "dev"], a: [600, 560], b: [300, 1400], to: [214, 116, 46], k: 0.6 }, { on: ["disc"], a: [670, 200], b: [730, 300], to: [214, 116, 46], k: 0.6 }, { on: ["armL", "handL", "handR"], a: [330, 430], b: [470, 660], to: [250, 218, 206], k: 0.5 }, { on: ["devF", "cass"], a: [80, 1200], b: [250, 1390], to: [232, 214, 200], k: 0.5 },
  ],
  light: { fall: [0.8, 0.6], up: 0.5 }, focus: { x: 490, y: 260, rx: 230, ry: 230, dim: 0.06 },
  field: "/wip/maren-field.bin", formed: "band pad cup disc earr loopB devP devW cass btn knob lug".split(" "), meshCasts: "pad cup disc band devP devF btn knob hairB".split(" "),
  shadows: SHADOWS, scatter: ["armL", "armR", "handL", "handR", "neck"], inherits: [[["snap"], ["jackL", "dev", "devF", "devP", "pocket", "buckle"]], [["reel"], ["cass"]]], print: ["cass", "reel"],
  softWedges: true,
  hair: [{ on: ["hairF"], root: [500, 80], tip: 14, shade: 0, streaks: false }, { on: ["hairB"], root: [500, 120], tip: 10, shade: 0, streaks: false }],
  forms: [
    { on: ["pad", "cup", "disc", "band", "hinge", "devH", "lug", "knob"], by: "patch", turn: 0.3 }, { on: ["top", "turtle", "pants", "armL", "armR", "handL", "handR", "neck", "hairF", "hairB", "strap", "belt"], by: "part", turn: 0.36 }, { on: ["jackL", "jackR", "flap", "tab", "trimL", "trimR", "lining", "cuffL", "cuffR", "pocket", "tabP", "beltT", "loopB", "trimT"], by: "patch", turn: 0.36 },
    { on: ["dev", "devF", "devP", "cass", "btn"], by: "patch", turn: 0.2, most: 0.03 }, { on: ["buckS", "clipS", "buckle", "snap", "earr", "hinge"], by: "patch" },
  ],
  solids: [{ on: ["armL"], ball: "402,506,96" }, { on: ["knob"], ball: "284,1211,20" }],
  depth: { armR: 0.3, hairB: 0.25, lining: 0.1, trimR: 0.2, cuffR: 0.1 },
  values: { dark: ["top", "turtle", "trimT", "cuffL", "cuffR", "pad", "belt", "tabP", "devP", "devW", "reel", "lining"], mid: ["jackL", "jackR", "flap", "hairF", "strap", "dev", "pants"], light: ["face", "armL", "handL", "handR", "cup", "trimL", "devF", "cass"] },
  apart: [["hairF", "face", 60], ["hairF", "jackL jackR", 30], ["jackL jackR", "top", 35], ["top", "armL", 150], ["pants", "jackL", 60], ["pants", "belt", 80], ["dev", "pants", 12], ["dev", "devF", 50], ["strap", "top", 70], ["cuffL", "handL", 120]],
  casts: [
    c("hairF", "face ear", 15, 0.25), c("hairF", "hairB", 6, 0.5), c("band", "hairF", 6), c("cup pad", "hairF hairB neck", 6, 0.5), c("handR", "cup disc pad hairB", 14, 0.5), c("disc", "cup", 5, 0.5), c("cup", "pad", 6, 0.5), c("hinge", "cup band pad", 4), c("earr", "neck hairB armL", 6, 0.5), c("turtle", "top trimT", 6, 0.5), c("trimT", "top armL", 4), c("strap", "top belt pants armR", 6, 0.5), c("buckS", "strap top", 6, 0.5), c("trimL", "jackL lining", 6, 0.5), c("flap", "jackL jackR tab", 6, 0.5), c("tab", "jackL jackR", 6, 0.5), c("cuffR", "jackR handR", 4), c("cuffL", "handL", 6, 0.5),
    c("handL", "dev devF devW cass devH", 16, 0.5), c("dev devF", "pants pocket", 6, 0.5), c("clipS", "strap pants dev lug", 6, 0.5), c("lug", "dev pants", 6, 0.5), c("knob", "devP", 8, 0.5), c("btn", "devF", 5, 0.5), c("devF devP", "dev", 3), c("devF", "devW cass", 7, 0.5), c("belt", "pants", 6, 0.5), c("loopB buckle", "belt pants", 6, 0.5), c("beltT", "pants", 6, 0.5), c("pocket", "pants tabP", 6, 0.5), c("tabP", "pants", 6, 0.5), c("snap", "jackL dev devF devP pocket buckle", 4, 0.5), c("top", "belt", 6), c("jackL", "trimL", 2),
  ],
  bevels: [{ on: ["dev", "devF", "devP"], w: 3.4, lit: 0.8 }, { on: ["cup", "band", "pad"], w: 3.4, lit: 0.6 }, { on: ["strap", "belt", "trimL", "cuffL", "cuffR", "flap", "pocket"], w: 3, lit: 0.5 }, { on: ["btn"], w: 2.4, lit: 0.7 }],
  shapes: [], soft: [], brows: BROWS,
  washes: [{ on: ["face"], x: 556, y: 282, rx: 34, ry: 17, color: [250, 176, 166], a: 0.42, late: true }, { on: ["face"], x: 424, y: 326, rx: 26, ry: 14, color: [250, 176, 166], a: 0.36, late: true }, { on: ["ear"], x: 410, y: 355, rx: 26, ry: 30, color: [246, 160, 148], a: 0.4 }, { on: ["handL"], x: 170, y: 1196, rx: 40, ry: 24, color: [250, 176, 160], a: 0.4 }, { on: ["handR"], x: 704, y: 258, rx: 36, ry: 30, color: [250, 176, 160], a: 0.4 }],
  noink: NOINK, face: (g) => { drawFace(g); drawPrints(g) }, over: drawLights, back: () => undefined, front: () => undefined,
}
