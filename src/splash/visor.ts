import type { Art } from "./engine.ts"
import { CLICKS, WALLS } from "./visor-clicks.ts"
import { LINES } from "./visor-lines.ts"
import { painted } from "../bold/eye.ts"
import { BROWS, DETAILS, NOINK } from "./visor-face.ts"
import { SHADOWS } from "./visor-shadows.ts"
import { SHAPES } from "./visor-shapes.ts"
import { TONES } from "./visor-tones.ts"

const c = (a: string, b: string, d: number, deep?: number): readonly [ReadonlyArray<string>, ReadonlyArray<string>, number, number?] => (deep ? [a.split(" "), b.split(" "), d, deep] : [a.split(" "), b.split(" "), d])
const SKIN = "#fdeee6", CORAL = "#c83b43", NAVY = "#191d3c", CREAM = "#fbf7f0", SKY = "#647fc6", SUN = "#f0ba4e", STEEL = "#b6bfce", GOLD = "#dfb04e", TAN = "#b78a58", HAIR = "#e9c884"
const P = (color: string, kind: Art["defs"][string]["kind"], z: number): Art["defs"][string] => ({ color, kind, z })
export const ART: Art = {
  head: 205, src: "/visor.png", w: 1024, h: 1536, seeds: [], lines: LINES, clicks: { at: CLICKS, walls: WALLS, move: [{ label: "hairF", d: "574.6,186! 575,195! 573,205! 568.4,217! 566.4,232! 567.6,246! 572.6,256! 570.2,246! 569.4,236! 571.6,222! 577,207! 580.4,194! 582,186!", over: ["face", "ear"] }, { label: "hairB", d: "574,183! 582,178! 594,177.6! 587,183! 581,191! 577,196!", over: ["face", "ear"] }] }, walls: [],
  force: [],
  defs: {
    bg: P("#ffffff", "flat", 0),
    hairF: P(HAIR, "hair", 12), hairB: P("#ad8a68", "hair", 2), bun: P(HAIR, "hair", 5), tail: P("#dfbb80", "hair", 2),
    face: P(SKIN, "skin", 9), ear: P(SKIN, "skin", 10), neck: P(SKIN, "skin", 4), chest: P(SKIN, "skin", 4), armL: P(SKIN, "skin", 9), armR: P(SKIN, "skin", 6), handL: P(SKIN, "skin", 20), handR: P(SKIN, "skin", 20),
    visor: P("#9edbe0", "glass", 15), visorIn: P("#6fa9bd", "glass", 13), band: P(NAVY, "plastic", 14), bandBuck: P(STEEL, "metal", 15), disc: P(CORAL, "plastic", 16), clip: P(GOLD, "metal", 14), pin: P(GOLD, "metal", 13), tassel: P(CORAL, "cloth", 13), earr: P(GOLD, "metal", 13), choker: P(NAVY, "leather", 5),
    collar: P(CORAL, "cloth", 8), snap: P(GOLD, "metal", 14), trim: P(NAVY, "leather", 7), lapel: P(CREAM, "pale", 13), star: P(GOLD, "metal", 14), jack: P(CORAL, "cloth", 8), lining: P("#23284a", "dark", 3), jstrap: P(NAVY, "leather", 10), jbuck: P(STEEL, "metal", 11),
    bust: P(CREAM, "pale", 6), bodice: P(CREAM, "pale", 5), waist: P(NAVY, "leather", 7),
    armbS: P(NAVY, "leather", 11), armbB: P(STEEL, "metal", 12), sleeveL: P(CORAL, "cloth", 10), cuffL: P(CREAM, "pale", 12), sleeveR: P(CORAL, "cloth", 5), cuffR: P(CREAM, "pale", 7), wristL: P(NAVY, "leather", 21), wristR: P(NAVY, "leather", 21),
    belt: P(TAN, "leather", 9), beltB: P(GOLD, "metal", 11), hip: P(SKY, "cloth", 5), coat: P(CORAL, "cloth", 4),
    fruitA: P("#e67c1e", "peel", 12), fruitB: P("#e67c1e", "peel", 14), fruitC: P("#e67c1e", "peel", 14), leaf: P("#4b9147", "leaf", 16), stem: P("#8a8a4a", "leaf", 17),
    rimB: P(SUN, "plastic", 10), crateIn: P("#8a6a58", "dark", 8), frame: P(SUN, "plastic", 18), panel: P("#f5dca0", "plastic", 17), slot: P("#2a2844", "dark", 16), corner: P("#222a52", "plastic", 19), rivet: P(STEEL, "metal", 20), lock: P(GOLD, "metal", 20), side: P("#f0cd84", "plastic", 17), sideF: P(SUN, "plastic", 18),
    ribbon: P(CORAL, "cloth", 7), sash: P(CREAM, "pale", 9), strapT: P(NAVY, "leather", 8), gear: P(STEEL, "metal", 9), flap: P(CREAM, "pale", 12), pouch: P(TAN, "leather", 10), pstrap: P(NAVY, "leather", 13), pbuck: P(GOLD, "metal", 14),
    legL: P("#617bc2", "cloth", 4), legR: P(SKY, "cloth", 6), ankL: P(NAVY, "leather", 6), ankR: P(NAVY, "leather", 8), sock: P(CREAM, "pale", 5), sole: P("#e9e3dc", "pale", 8), shoe: P(CREAM, "pale", 7), shoeA: P(CORAL, "leather", 9), shoeD: P(GOLD, "metal", 10), tongue: P(SKY, "cloth", 8), lace: P(NAVY, "cloth", 9),
  },
  grads: [
    { on: ["visor"], a: [400, 160], b: [500, 80], to: [222, 246, 240], k: 0.7 }, { on: ["jack", "collar", "sleeveL"], a: [420, 300], b: [520, 540], to: [196, 52, 78], k: 0.5 }, { on: ["legR", "hip"], a: [520, 820], b: [600, 1340], to: [88, 112, 190], k: 0.6 }, { on: ["legL"], a: [430, 900], b: [300, 1260], to: [84, 106, 184], k: 0.5 }, { on: ["fruitA", "fruitB", "fruitC"], a: [400, 600], b: [560, 740], to: [222, 84, 30], k: 0.6 }, { on: ["frame", "panel", "side"], a: [250, 700], b: [740, 820], to: [246, 186, 90], k: 0.45 }, { on: ["armL", "armR"], a: [470, 330], b: [300, 620], to: [250, 218, 206], k: 0.5 }, { on: ["ribbon"], a: [390, 800], b: [340, 960], to: [206, 66, 104], k: 0.5 },
  ],
  light: { fall: [0.8, 0.6], up: 0.5 },
  focus: { x: 520, y: 200, rx: 150, ry: 150, dim: 0.06 },
  hair: [
    { on: ["hairF"], root: [560, 110], tip: -4, shade: 0 },
    { on: ["hairB"], root: [560, 120], tip: -6, shade: 0 }, { on: ["bun"], root: [610, 105], tip: -3, shade: 0 }, { on: ["tail"], root: [600, 270], tip: -10, shade: 0 },
  ],
  forms: [
    { on: ["armL"], by: "part", turn: 0.34, to: [1, 0.35] }, { on: ["armR"], by: "part", turn: 0.4, to: [1, 0.1] }, { on: ["handL", "handR"], by: "patch", turn: 0.34 }, { on: ["neck"], by: "part", turn: 0.45 }, { on: ["ear"], by: "patch", turn: 0.4 },
    { on: ["legR"], by: "part", turn: 0.34, to: [1, 0.1] }, { on: ["legL"], by: "part", turn: 0.4, to: [1, 0.6] }, { on: ["sleeveL", "sleeveR", "cuffL", "cuffR", "jack", "collar", "lapel", "waist", "belt", "ribbon", "sash", "coat", "hip", "pouch", "flap", "tongue"], by: "patch", turn: 0.36 },
    { on: ["bust"], by: "part", turn: 0.36 }, { on: ["bodice"], by: "part", turn: 0.3, to: [1, 0.2] }, { on: ["fruitA", "fruitB", "fruitC"], by: "part", turn: 1 },
    { on: ["band", "disc", "armbS", "wristL", "wristR", "ankL", "ankR", "strapT", "pstrap", "jstrap", "choker", "trim", "tassel", "leaf", "stem", "lace", "sock", "visorIn"], by: "patch", turn: 0.36 }, { on: ["visor"], by: "part", turn: 0.14 },
    { on: ["frame", "corner", "sideF", "rimB"], by: "patch", turn: 0.26, most: 0.04 }, { on: ["panel", "side"], by: "part", turn: 1 }, { on: ["shoe", "shoeA", "sole"], by: "patch", turn: 0.36 },
    { on: ["bandBuck", "clip", "pin", "earr", "snap", "star", "jbuck", "armbB", "beltB", "rivet", "lock", "gear", "pbuck", "shoeD"], by: "patch" },
  ],
  depth: { tail: 0.45, armR: 0.35, handR: 0.15, sleeveR: 0.34, cuffR: 0.28, wristR: 0.3, coat: 0.35, legL: 0.3, ankL: 0.3, hairB: 0.25, bun: 0.2, lining: 0.2, rimB: 0.3, ribbon: 0.2 },
  field: "/wip/visor-field.bin", shadows: SHADOWS,
  formed: "ear neck armL armR handL handR visor visorIn band disc choker collar trim lapel jack lining jstrap bust bodice waist armbS sleeveL cuffL sleeveR cuffR wristL wristR belt hip coat fruitA fruitB fruitC leaf stem rimB crateIn frame panel corner side sideF ribbon sash strapT flap pouch pstrap legL legR ankL ankR sole".split(" "),
  meshCasts: "crateIn rimB legL legR hip sash strapT flap pouch pstrap ribbon gear coat armL armR ankL ankR frame side panel waist belt handR handL".split(" "),
  solids: [
    { on: ["armL"], ball: "486,352,46" }, { on: ["armL"], tube: "484,360,44 466,390,32 452,412,29" }, { on: ["armL"], tube: "372,540 345,578 312,612" }, { on: ["armbS"], tube: "476,368 450,408" }, { on: ["wristL"], tube: "320,596 298,626" },
    { on: ["armR"], ball: "655,400,34" }, { on: ["armR"], tube: "688,575 712,628 736,664" }, { on: ["wristR"], tube: "728,650 752,690" }, { on: ["neck"], tube: "572,286 562,326" },
    { on: ["legR"], tube: "540,840 552,960 566,1060 572,1160 606,1290 618,1368" }, { on: ["legL"], tube: "448,900 430,1000 395,1060 335,1130 312,1200 306,1256" }, { on: ["ankL"], tube: "286,1258 276,1296" }, { on: ["ankR"], tube: "628,1350 636,1392" },
    { on: ["bust"], ball: "630,440,56" }, { on: ["fruitB"], ball: "425,712,84" }, { on: ["fruitA"], ball: "512,648,74" }, { on: ["fruitC"], ball: "590,737,82" }, { on: ["bun"], ball: "614,62,58" },
  ],
  values: {
    dark: ["band", "choker", "trim", "lining", "jstrap", "waist", "armbS", "wristL", "wristR", "corner", "slot", "strapT", "pstrap", "ankL", "ankR", "lace"],
    mid: ["collar", "jack", "sleeveL", "sleeveR", "ribbon", "legL", "legR", "hip", "pouch", "fruitA", "fruitB", "fruitC"],
    light: ["face", "armL", "armR", "handL", "handR", "bust", "lapel", "cuffL", "shoe", "sock", "frame", "panel", "side"],
  },
  apart: [["hairF", "face", 65], ["hairF tail bun", "jack sleeveL", 70], ["jack sleeveL", "armL", 90], ["jack", "bust lapel", 100], ["jack sleeveL collar", "legR legL", 18], ["fruitA fruitB fruitC", "frame panel side", 45], ["fruitA fruitB fruitC", "hip legR", 12], ["fruitA fruitB fruitC", "leaf", 15], ["waist", "jack", 25], ["legR legL", "pouch", 8], ["legR", "strapT", 45], ["frame panel", "handL handR", 25]],
  print: ["flap", "visor"], scatter: ["bust", "armL", "armR", "handL", "handR", "neck", "chest"],
  inherits: [[["snap"], ["collar", "jack", "waist", "cuffL"]], [["star"], ["lapel"]], [["rivet"], ["corner"]]],
  bevels: [{ on: ["visor"], w: 2.2, lit: 0.9 }, { on: ["frame", "sideF", "corner", "rimB"], w: 2.2, lit: 0.8 }, { on: ["waist", "belt", "armbS", "strapT", "wristL", "wristR", "ankR", "ankL", "pouch"], w: 1.8, lit: 0.5 }, { on: ["flap", "lapel", "cuffL", "sash"], w: 1.8, lit: 0.6 }, { on: ["sole"], w: 2, lit: 0.6 }],
  casts: [
    c("hairF", "face ear neck", 9, 0.25), c("hairF", "hairB", 12, 0.5), c("visor band", "hairF", 13, 0.5), c("visor", "face visorIn", 10), c("disc bandBuck", "band hairF", 5, 0.5), c("bun clip pin", "hairF hairB", 10, 0.5), c("ear", "hairB neck", 6, 0.5), c("earr", "neck hairB", 5, 0.5), c("face", "neck choker collar", 26, 0.4), c("face hairB", "collar", 12), c("hairB tail", "collar jack armR", 10),
    c("collar", "jack chest trim lapel", 12, 0.5), c("lapel", "jack bust jstrap chest bodice", 14, 0.5), c("trim", "chest armL jack", 4), c("jack", "bodice bust waist lining trim", 12, 0.5), c("armL", "jack sleeveL", 8, 0.5), c("armbS armbB", "armL sleeveL", 5, 0.5), c("armbB", "armbS", 3, 0.5), c("sleeveL", "armL cuffL", 10, 0.5), c("cuffL", "armL", 12, 0.5), c("sleeveR", "cuffR armR", 10, 0.5), c("cuffR", "armR", 14, 0.5), c("wristL", "handL armL", 4, 0.5), c("wristR", "handR armR", 4, 0.5), c("jstrap jbuck", "jack", 4, 0.5), c("bust", "bodice", 10, 0.5), c("bodice", "waist trim", 4), c("waist", "belt hip coat", 6), c("beltB", "belt waist hip", 5, 0.5), c("belt", "hip", 7, 0.5), c("snap star", "collar jack waist lapel", 2.4),
    c("leaf stem", "hip crateIn", 10, 0.45), c("stem", "fruitA fruitB fruitC", 3), c("fruitB fruitC", "fruitA", 14, 0.5), c("fruitA fruitB fruitC", "crateIn hip rimB", 14, 0.5), c("frame corner sideF", "panel side", 5, 0.5), c("lock", "frame panel", 6, 0.5), c("rivet", "corner frame", 2), c("corner", "frame", 4, 0.5), c("handL handR", "corner side slot sideF", 8, 0.5), c("frame corner side sideF", "legR legL ribbon sash hip coat", 34, 0.45), c("slot", "panel", 1),
    c("sash", "legR legL strapT", 8, 0.5), c("ribbon", "legL", 6), c("strapT", "legR legL", 5, 0.5), c("flap", "pouch pstrap", 8, 0.5), c("pouch flap", "legR", 10, 0.45), c("pstrap pbuck", "pouch legR", 4, 0.5), c("gear", "legR coat", 5, 0.5), c("coat", "legR", 6), c("legR", "legL", 26, 0.4), c("ankL", "sock legL", 4, 0.5), c("ankR", "sock legR", 4, 0.5), c("legL legR", "ankL ankR sock", 5), c("shoeA shoeD", "shoe sock sole tongue", 4, 0.5), c("shoe tongue", "sole", 3), c("sock", "tongue", 3), c("lace", "tongue shoe", 3, 0.5),
  ],
  tones: TONES, brows: BROWS,
  shapes: SHAPES, soft: [], washes: [{ on: ["ear"], x: 595, y: 205, rx: 16, ry: 22, color: [246, 160, 148], a: 0.4 }, { on: ["face"], x: 553, y: 226, rx: 18, ry: 9, color: [250, 176, 166], a: 0.42, late: true }, { on: ["face"], x: 494, y: 258, rx: 12, ry: 7, color: [250, 176, 166], a: 0.36, late: true }],
  folders: [["Hair back", "hairB", "fine"], ["Ponytail and bun", "tail bun", "fine"], ["Shoes", "ankL ankR sock sole shoe shoeA shoeD tongue lace"], ["Trousers", "hip legL legR"], ["Skin", "neck chest armL armR handL handR"], ["Bodice", "bodice bust waist"], ["Jacket", "coat lining jack collar trim lapel sleeveR cuffR sleeveL cuffL armbS armbB jstrap jbuck snap star"], ["Belt and pouch", "belt beltB ribbon sash strapT gear pouch flap pstrap pbuck"], ["Crate", "crateIn rimB side sideF panel slot frame corner rivet lock"], ["Fruit", "fruitA fruitB fruitC leaf stem"], ["Jewellery", "choker earr"], ["Face", "face ear", "fine"], ["Hair front", "hairF", "fine"], ["Visor", "visorIn band bandBuck clip pin tassel visor disc"], ["Wristbands", "wristL wristR"]],
  noink: NOINK, ...painted(DETAILS),
  back: () => undefined, front: () => undefined,
}
