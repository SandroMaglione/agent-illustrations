import { curve, loop } from "../cel/path.ts"
import { ONI as OLD } from "../clean/oni.ts"
import { rng } from "../geo.ts"
import type { P2 } from "../geo.ts"
import type { Art, Level, Shape, Wash } from "./engine.ts"
import type { RGB } from "./tones.ts"

const sh = (lv: Level, on: string, ...d: Array<string>): Array<Shape> => d.map((x) => ({ lv, on: on.split(" "), d: x, a: 1 }))
const sa = (lv: Level, a: number, on: string, ...d: Array<string>): Array<Shape> => d.map((x) => ({ lv, on: on.split(" "), d: x, a }))
const c = (a: string, b: string, d: number, deep = 0): readonly [ReadonlyArray<string>, ReadonlyArray<string>, number, number] => [a.split(" "), b.split(" "), d, deep]
const ws = (stage: Wash["stage"], on: string, x: number, y: number, rx: number, ry: number, color: RGB, a: number, mode: Wash["mode"] = "mix"): Wash => ({ stage, on: on.split(" "), x, y, rx, ry, color, a, mode })

/**
 * Hair highlight: one band that wraps the skull, cut into uneven trapezoids. Sides follow the
 * strands, gaps fall between clumps, and some pieces are missing.
 */
const band = (pts: string, dir: (x: number, y: number) => P2, hgt: number, seed: string, o: { min?: number; max?: number; skip?: number; taper?: boolean } = {}): Array<string> => {
  const p = curve(pts, 24)
  const r = rng(seed)
  const len: Array<number> = [0]
  for (let i = 1; i < p.length; i++) len.push(len[i - 1]! + Math.hypot(p[i]![0] - p[i - 1]![0], p[i]![1] - p[i - 1]![1]))
  const total = len[len.length - 1]!
  const at = (s: number): P2 => { let i = 1; while (i < p.length - 1 && len[i]! < s) i++; const u = (s - len[i - 1]!) / Math.max(0.001, len[i]! - len[i - 1]!); return [p[i - 1]![0] + (p[i]![0] - p[i - 1]![0]) * u, p[i - 1]![1] + (p[i]![1] - p[i - 1]![1]) * u] }
  const out: Array<string> = []
  let s = 1
  while (s < total - 2) {
    const w = Math.min(total - s - 1, (o.min ?? 7) + r() ** 1.6 * ((o.max ?? 26) - (o.min ?? 7)))
    const mid = (s + w / 2) / total
    const k = o.taper === false ? 1 : Math.min(1, Math.min(mid, 1 - mid) * 3.4 + 0.3)
    if (r() > (o.skip ?? 0.1) && w > 2.5) {
      const a = at(s), b = at(s + w), m = at(s + w / 2)
      const da = dir(a[0], a[1]), db = dir(b[0], b[1])
      // one side of the band is a clean arc, the other is ragged
      const ua = hgt * k * 0.42, ub = hgt * k * 0.42, la = hgt * k * (0.3 + r() * 0.85), lb = hgt * k * (0.3 + r() * 0.85)
      const f = (q: P2, d2: P2, t: number): string => `${(q[0] + d2[0] * t).toFixed(1)},${(q[1] + d2[1] * t).toFixed(1)}`
      const lm = Math.min(la, lb) * (0.55 + r() * 0.35)
      out.push(`${f(a, da, -ua)}! ${f(b, db, -ub)}! ${f(b, db, lb)}! ${f(m, dir(m[0], m[1]), lm)} ${f(a, da, la)}!`)
    }
    s += w + 0.8 + r() ** 3 * 5
  }
  return out
}
const crown = (x: number, y: number): P2 => { const l = Math.hypot(x - 318, y - 62) || 1; return [(x - 318) / l, (y - 62) / l] }
const down = (slope: number) => (): P2 => { const l = Math.hypot(slope, 1); return [slope / l, 1 / l] }

const FIG = "hairF hairL hairR hairD hornL hornR skin neck hood lapel top jackF zip rib arm arm2 cuff jackB belt shorts cig filter gold gem"
void FIG

export const ONI2: Art = {
  src: "/oni.png", w: 736, h: 1104, seeds: OLD.seeds, walls: OLD.walls,
  force: [
    ...OLD.force.filter((f) => f.label !== "chain"),
    { label: "jackF", d: "196,722! 220,700! 224,760! 190,812! 168,806!", over: ["chain", "zip"] },
    { label: "chain", d: "204,720! 212,716 208,736 201,752 195,768 190,783 185,797 182,806! 173,804 175,790 180,776 185,760 190,745 196,731!", over: ["jackF"] },
    { label: "zip", d: "195,730! 204,728! 200,738! 151,828! 140,825!", over: ["jackF"] },
    { label: "patch", d: "404,690! 430,690! 428,724! 406,742! 396,734!", over: ["arm"] },
    { label: "maw", d: "346,679! 366,682! 400,690! 414,694! 402,734! 378,728! 352,722! 336,717!", over: ["patch"] },
    { label: "fang", d: "344,676! 367,679! 356,692!", over: ["maw"] }, { label: "fang", d: "400,688! 416,692! 400,701!", over: ["maw"] },
    { label: "skin", d: "436,236! 470,236! 472,272! 440,270!", over: ["hairF"] },
    { label: "skin", d: "540,186! 572,171! 571,190! 560,222! 540,240!", over: ["bg", "kan", "hairF"] },
    { label: "kan", d: "40,141! 160,141! 160,150! 40,150!", over: ["bg"] },
  ],
  background: ["bg", "kan", "sign", "smoke"], halo: ["gem", "gold"],
  defs: {
    // light group: face and hair. Mid: jacket. Dark: hood, knit, denim, each a clear step apart.
    bg: { color: "#4e6068", kind: "flat", z: 0 }, kan: { color: "#c3a78e", kind: "flat", z: 0 }, sign: { color: "#d8d2c4", kind: "flat", z: 0 }, smoke: { color: "#6b808a", kind: "flat", z: 0 },
    skin: { color: "#fbe3d3", kind: "skin", z: 5, vol: 0.16, rim: 3 }, neck: { color: "#fbe3d3", kind: "skin", z: 3 }, eyeW: { color: "#f1ebe8", kind: "flat", z: 4 }, brow: { color: "#b3a7b8", kind: "hair", z: 6 },
    hairF: { color: "#d3cbc8", kind: "hair", z: 6, vol: 0.62, rim: 5.2, strand: (x, y) => Math.atan2(y - 62, x - 318) * 26 }, hairL: { color: "#d0c7c6", kind: "hair", z: 2, vol: 0.3, strand: (x, y) => (x - Math.max(0, y - 400) * 0.34) / 3 },
    hairR: { color: "#cbc2c5", kind: "hair", z: 4, vol: 0.3, strand: (x, y) => (x - y * 0.16) / 3 }, hairD: { color: "#c8bfc4", kind: "hair", z: 1, vol: 0.3, rim: 5.2, strand: (x) => x / 3 },
    hornL: { color: "#b4383d", kind: "horn", z: 7, vol: 0.4, rim: 5.2 }, hornR: { color: "#b4383d", kind: "horn", z: 7, vol: 0.4 },
    cig: { color: "#f1ebe2", kind: "cloth", z: 8 }, filter: { color: "#c98f55", kind: "cloth", z: 8 }, ember: { color: "#e8672a", kind: "flat", z: 8 },
    gold: { color: "#c79a45", kind: "metal", z: 8 }, gem: { color: "#3fa79b", kind: "gem", z: 8 },
    hood: { color: "#474c5d", kind: "cloth", z: 7, vol: 0.55, rim: 5.4 }, hoodIn: { color: "#363a48", kind: "cloth", z: 1 }, lapel: { color: "#474c5d", kind: "cloth", z: 6, vol: 0.4 },
    top: { color: "#8c3240", kind: "cloth", z: 3, vol: 0.5 }, rib: { color: "#363a48", kind: "knit", z: 3, vol: 0.4 }, cuff: { color: "#363a48", kind: "knit", z: 4, vol: 0.6 },
    jackF: { color: "#d3a046", kind: "nylon", z: 4, vol: 0.4 }, arm: { color: "#d8a548", kind: "nylon", z: 6, vol: 0.5, rim: 5.2 }, arm2: { color: "#d3a046", kind: "nylon", z: 5, vol: 0.5 }, jackB: { color: "#cf9b43", kind: "nylon", z: 3, vol: 0.25, rim: 5.4 },
    zip: { color: "#a9adb5", kind: "metal", z: 5 }, chain: { color: "#b4b8bf", kind: "metal", z: 6 }, strap: { color: "#474c5d", kind: "cloth", z: 7 }, belt: { color: "#363a48", kind: "cloth", z: 4 }, stud: { color: "#c79a45", kind: "metal", z: 5 },
    patch: { color: "#e4ddcf", kind: "nylon", z: 6 }, maw: { color: "#8c3240", kind: "nylon", z: 6 }, fang: { color: "#f0ebe0", kind: "nylon", z: 6 }, patchK: { color: "#9c3440", kind: "nylon", z: 3 },
    shorts: { color: "#6b7788", kind: "denim", z: 1, vol: 0.5, rim: 5.4 }, flap: { color: "#6b7788", kind: "denim", z: 2 },
  },
  grads: [
    { on: ["hairF"], a: [330, 120], b: [470, 250], mul: [0.93, 0.93, 0.97], k: 1 }, { on: ["hairL"], a: [250, 300], b: [260, 540], mul: [0.82, 0.83, 0.93], k: 1 }, { on: ["hairR"], a: [520, 260], b: [520, 425], mul: [0.84, 0.85, 0.94], k: 1 }, { on: ["hairD"], a: [610, 620], b: [610, 792], mul: [0.82, 0.83, 0.94], k: 1 },
    { on: ["hornL"], a: [216, 200], b: [160, 108], mul: [0.42, 0.36, 0.5], k: 1 }, { on: ["hornR"], a: [376, 180], b: [314, 74], mul: [0.42, 0.36, 0.5], k: 1 },
    { on: ["hood"], a: [430, 440], b: [640, 630], mul: [0.82, 0.83, 0.92], k: 1 }, { on: ["arm", "patch"], a: [350, 560], b: [400, 960], mul: [0.95, 0.9, 0.9], k: 1 }, { on: ["jackF"], a: [290, 600], b: [140, 1050], mul: [0.93, 0.87, 0.9], k: 1 }, { on: ["jackB"], a: [500, 600], b: [560, 880], mul: [0.9, 0.86, 0.94], k: 1 },
    { on: ["shorts", "flap"], a: [420, 900], b: [560, 1066], mul: [0.82, 0.84, 0.95], k: 1 }, { on: ["cuff", "rib"], a: [160, 900], b: [240, 1066], mul: [0.85, 0.86, 0.96], k: 1 }, { on: ["top"], a: [200, 600], b: [190, 730], mul: [0.84, 0.82, 0.92], k: 1 },
    { on: ["bg"], a: [100, 0], b: [600, 1104], mul: [0.6, 0.63, 0.76], k: 1 }, { on: ["kan"], a: [100, 60], b: [500, 660], mul: [0.82, 0.83, 0.9], k: 1 }, { on: ["smoke"], a: [640, 780], b: [520, 920], mul: [0.74, 0.76, 0.86], k: 1 },
  ],
  casts: [
    c("hairF", "skin", 10), c("hairF skin", "eyeW", 8), c("hornL", "hairL hairF skin", 10), c("hornR", "hairF skin", 11), c("hairF", "hairL", 8), c("skin", "hairR", 12), c("gold gem", "hairR", 5), c("hairR", "neck", 14), c("cig filter", "hairL", 6), c("cig filter", "skin", 3),
    c("hairL", "lapel top", 13), c("hairL hairR", "hoodIn", 26), c("hairR hairL", "hood", 5), c("hood", "arm jackB patch patchK", 24, 0.3), c("hood", "hairD jackF", 24, 0.4), c("hood", "lapel", 9), c("lapel", "top jackF", 13, 0.2),
    c("arm", "jackB patchK belt stud", 17, 0.2), c("arm", "shorts", 26, 0.25), c("jackB", "shorts", 16, 0.3), c("belt", "jackB", 6), c("jackB", "hairD", 9), c("arm", "arm2", 5), c("arm2", "cuff", 9), c("arm2 cuff", "shorts jackF", 14, 0.2), c("cuff", "rib", 8), c("strap", "arm", 4), c("chain", "jackF", 4), c("flap", "shorts", 6), c("stud", "belt", 2.5), c("hairD", "jackB", 3),
  ],
  shapes: [
    /* ---- face: 12 to 18 percent in shade, and every shape has a reason ---- */
    ...sh("s1", "skin", "340,190! 420,170! 425,200 404,216 374,219 350,211!", "472,268! 456,282 446,300! 452,310 444,334 428,356 402,378 374,399 352,412! 374,411 398,397 425,371 454,341! 472,306!", "336,286! 350,270 372,255 398,246 424,243! 400,250 376,260 356,274 346,296!", "242,279! 258,278 280,288 296,308! 278,294 258,286!", "292,344! 300,348 299,352! 294,350", "318,391! 326,394 336,401! 326,401"),
    ...sh("s2", "skin", "472,292! 462,308 458,326 440,352 420,372 402,392 425,371 454,341! 472,306!"), ...sh("s3", "skin", "462,324! 456,338 440,358 420,378! 426,371 454,341!"),
    ...sh("s1", "skin", "484,240! 500,228 526,214 553,201! 545,216 526,228 516,244 498,252 486,262 476,280! 470,270"), ...sh("s2", "skin", "500,227! 514,219 531,212! 533,222 518,235 504,237!", "478,262! 488,252 500,252! 494,262 484,272!"), ...sh("s3", "skin", "504,229! 515,222 526,217! 518,230 509,235!"),
    ...sh("s1", "neck", "380,330 490,300 494,440 380,460"), ...sh("s2", "neck", "396,398! 425,371 454,341 472,308! 474,344 462,366 440,384 420,404 404,438 398,446!", "472,330! 474,380 482,424! 466,424 464,384"), ...sh("s3", "neck", "398,402! 420,380 440,362! 428,386 408,408 400,426!"),

    /* ---- horns: two hard planes ---- */
    ...sh("s1", "hornL", "244,162! 236,180 222,192 204,192 188,180 174,158 164,132! 160,152 178,188 202,214 236,230!"), ...sh("s2", "hornL", "244,166! 238,186 228,198 216,202! 224,216 238,222 242,206!"),
    ...sh("s1", "hornR", "313,70! 328,104 348,140 370,172 386,200! 404,194 422,180! 372,122"), ...sh("s2", "hornR", "420,180! 404,164 388,150! 394,172 396,196! 410,190"),

    /* ---- hair front: shadow masses with strand-pointed ends ---- */
    ...sh("s1", "hairF", "553,177! 549,158 540,134 526,108! 527,132 520,124! 520,146 508,130! 508,152 494,132! 498,166 478,140! 484,180 462,154! 468,190 480,212! 512,194",
      "420,180! 396,152 372,124 350,96! 374,112 398,136! 404,132 424,156! 430,150 452,182! 458,178 474,214! 452,208 432,196",
      "243,159! 246,140 258,118 282,96! 266,122 262,136! 268,132 264,158 256,178 246,190!", "336,66! 372,66 408,80 434,101! 402,94 366,80!", "224,150! 232,132 244,114! 238,132 234,154!",
      "281,247! 266,247 262,226 262,200 268,168! 272,196 275,222!", "317,241! 298,243 294,222 294,196 298,168! 303,200 309,222!", "346,235! 328,238 322,214 317,184 316,158! 326,190 334,212!", "253,247! 246,226 242,204 243,186! 248,208 254,228!",
      "440,213! 450,222 464,232 446,232!", "424,184! 444,202 470,220 446,212!"),
    ...sh("s2", "hairF", "281,247! 273,247 270,224 271,196! 275,222!", "317,241! 307,242 303,220 302,196! 309,222!", "346,235! 337,237 331,216 325,188! 334,212!", "553,177! 548,158 540,140! 538,158 530,150! 528,168 516,160! 514,184 496,178! 496,194 482,210! 512,194", "420,180! 404,162 388,144! 404,154 424,172! 436,180 448,196! 434,192", "244,160! 248,150 256,142! 258,162 248,182!"),
    ...sh("s3", "hairF", "281,247! 276,247 274,232! 278,236", "317,241! 311,242 308,228! 313,232", "346,235! 341,236 337,222! 341,226", "552,177! 546,164 540,166 528,180 506,188! 512,194"),
    // strands radiate from the parting, so the ring runs across them: a circle round the parting
    ...sh("lt", "hairF", ...band("246,152 262,144 284,140 309,140", down(-0.04), 18, "a1", { min: 7, max: 17, skip: 0 }), ...band("438,38 455,60 461,88 456,116 444,142 428,166", crown, 25, "a9", { min: 9, max: 26, skip: 0.05 }), ...band("222,138 232,122 246,106", crown, 16, "a3", { min: 5, max: 12, skip: 0 })),
    ...sa("lt", 0.7, "hairF", "250,72! 276,52 306,36 336,26! 322,42 300,58 282,74!", "350,28! 384,21 412,24 436,34! 408,34 380,38 360,48!", "350,60! 392,62 424,74! 400,74 376,72!"),
    ...sh("hi", "hairF", ...band("268,141 296,139", down(-0.04), 8, "h3", { min: 4, max: 10, skip: 0.1 }), ...band("452,58 459,86 455,114", crown, 11, "h5", { min: 6, max: 15, skip: 0.15 })),

    /* ---- side hair ---- */
    ...sh("s1", "hairL", "258,318! 266,348 282,372 302,388 332,405 352,416 372,411 398,398! 400,450 386,456! 378,440 372,460! 360,436 350,468! 340,430 326,474! 316,424 300,470! 296,414 280,446! 280,400 268,424! 264,372",
      "206,486! 214,512 226,532 250,536 280,529! 256,522 240,508 232,484! 226,506 216,500!", "252,470! 264,490 284,498 304,490! 284,484 270,470 262,444! 258,462", "216,300! 222,350 220,420 216,470! 211,420 212,350", "238,320! 243,370 243,420! 237,400 235,350", "222,232! 222,270 218,300! 214,266"),
    ...sh("s2", "hairL", "262,336! 270,356 284,374 302,388! 296,396 284,390 272,400! 266,372", "330,404! 352,416 372,411 398,398! 399,446 388,448! 382,430 374,444! 364,424 352,440! 342,416", "222,520! 240,534 262,534! 246,526 236,514!"),
    ...sh("s3", "hairL", "352,416! 372,411 398,398! 399,436 388,430! 380,420 368,426!"),
    ...sa("lt", 0.8, "hairL", ...band("201,352 216,347 232,345 250,348", down(0), 15, "b2", { min: 5, max: 12, taper: false })),
    ...sh("s1", "hairR", "470,306! 500,312 522,270 548,246 560,240! 562,276 558,330! 552,290 546,352! 540,300 534,384! 528,312 520,366! 514,322 510,414! 502,340 496,400! 494,424 478,424! 472,380", "580,330! 590,414 570,416! 572,380 568,350!"),
    ...sh("s2", "hairR", "470,306! 496,312 512,286 532,260! 530,290 522,318! 516,300 508,346! 500,322 494,376! 490,350 488,424 478,424! 472,370", "586,384! 590,414 578,416!"), ...sh("s3", "hairR", "470,312! 480,320 484,360 486,424! 478,424! 472,370"),
    ...sa("lt", 0.75, "hairR", ...band("540,330 556,334 576,340", down(0.16), 14, "c4", { min: 5, max: 10, taper: false })),
    ...sh("s1", "hairD", "584,615! 640,630! 644,690 648,740! 640,756 632,752! 636,706 630,684! 626,726 620,668! 614,712 608,660! 606,740 600,790 588,792! 592,726 590,690!"), ...sh("s2", "hairD", "584,615! 640,630! 638,662! 632,644 626,676! 618,646 608,688! 602,642 594,668! 586,646"), ...sa("lt", 0.7, "hairD", ...band("578,716 592,712 606,712", down(0), 13, "d1", { min: 4, max: 9, taper: false })),
    ...sh("s1", "brow", "322,266! 336,266 352,254 366,240! 354,264 336,272!", "262,262! 274,266 282,280! 270,276"),

    /* ---- hood: one long turn, two notches where the folds bite ---- */
    ...sh("s1", "hood", "352,540! 394,520 440,510 478,516! 490,522 508,534 514,548! 520,532 524,514! 528,536 534,556 566,566 604,568! 634,562 650,546! 640,530 646,508 670,480! 660,504 650,526 666,534 682,522! 692,540 701,560! 690,600 636,631! 560,606 480,566 440,544 398,536!",
      "350,515! 440,482 530,469 640,460 688,437! 690,452 640,472 540,481 460,492 398,510!", "688,372! 704,384 708,404 692,424! 694,408 690,394 680,390 664,396! 682,386"),
    ...sh("s2", "hood", "446,546! 520,590 636,631! 690,596 700,566! 690,580 640,602 580,596 520,574!"), ...sh("s3", "hood", "560,602! 600,618 636,631! 672,608! 636,616 600,610!"),
    ...sa("lt", 0.8, "hood", "336,488! 400,456 470,440 560,433 640,426 690,414! 660,436 560,444 470,452 400,474 344,506!", "352,534! 400,514 452,496 492,494! 452,508 404,526!"),
    ...sh("s1", "hoodIn", "560,310 720,350 700,400 570,425", "220,470 350,470 340,540 220,590"), ...sh("s2", "hoodIn", "578,356! 620,372 660,397! 620,408 588,414!", "228,574! 240,534 290,526! 262,556!"), ...sh("s3", "hoodIn", "582,391! 600,399 612,411! 588,414!"),
    ...sh("s1", "lapel", "339,541! 322,538 300,552 272,574 240,590 224,602! 300,584!"), ...sh("s1", "top", "300,584! 262,596 236,618 218,646 208,676! 198,690 180,704 170,700! 182,718 196,731! 226,690 270,630!"), ...sh("s2", "top", "300,584! 262,594 240,608! 248,620 262,622!"),

    /* ---- sleeve: terminator as one long curve, notched by real folds ---- */
    ...sh("s1", "arm patch maw fang", "436,543! 452,574 458,622 452,668! 446,700 448,726 436,752! 424,776 404,800 378,822! 372,838 396,846 430,838! 412,862 388,880 352,892! 336,906 352,912 366,906! 340,930 312,944! 330,960 346,966! 384,956 414,920 430,892 462,874 478,858! 474,800 474,768 468,744 480,640 468,572!"),
    ...sh("s1", "arm", "204,812! 234,836 264,862 287,893! 266,882 250,874! 254,892 232,868 214,842!", "220,856! 232,900 262,934 296,956! 320,964 300,958! 262,946 232,912", "276,704! 292,716 310,714! 290,730 262,750 236,766 216,776! 240,746 262,722", "308,640! 296,672 284,704! 286,676 296,652"),
    ...sh("s1", "arm", "476,778! 440,800 400,812 356,838! 400,836 452,818 478,800!", "230,792! 222,806 232,822 252,836 286,850 320,862! 290,838 256,822 238,806!", "346,640! 326,676 306,700 300,740! 312,716 330,690", "398,556! 372,574 352,602 340,630! 358,604 376,584", "250,872! 282,902 322,918 366,918! 330,930 290,922 262,902", "226,876! 244,912 272,936 304,948! 280,948 248,930"),
    ...sh("s2", "arm", "468,800! 440,812 416,824 392,846! 420,842 452,826 474,812!", "300,862! 276,846 254,838! 262,850 280,860"),
    ...sh("s2", "arm patch", "462,566! 476,600 477,650 470,700 468,744 474,768! 464,756 462,716 466,660 466,606", "432,892! 414,922 390,950 346,966! 372,944 396,914 410,894!", "474,772! 448,794 418,812 394,822! 430,818 458,804 476,790!"),
    ...sa("lt", 0.85, "arm", "342,586! 366,560 396,546 424,548! 404,560 382,580 362,606 346,632! 332,650 326,630", "208,800! 226,778 260,754 306,738! 296,758 266,774 240,792 222,806!", "236,774! 262,756 300,744 330,742! 304,756 270,768 246,784!"),
    ...sh("s1", "arm2", "206,930! 230,960 262,984 296,994 322,990! 344,982 368,964! 352,990 320,998 300,1004 262,996 228,972!", "199,884! 206,910 206,940! 198,916"), ...sh("s2", "arm2", "300,1000! 326,994 350,984! 340,996 310,1000!"), ...sa("lt", 0.7, "arm2", "204,876! 216,900 232,926 250,946! 232,938 214,914!"),
    ...sh("s1", "cuff", "308,1000! 292,1014 262,1014 236,1006! 226,1000 216,988! 222,1010 206,1014! 182,1004 168,984! 172,1012 160,1022 138,1024! 120,1010 108,990! 112,1012 130,1034 150,1046 190,1050 236,1062 272,1054 296,1024!", "168,896! 150,926 150,952 160,976! 160,952 164,924", "136,920! 124,946 126,976! 132,950"), ...sh("s2", "cuff", "306,1004! 290,1026 262,1042 220,1042! 196,1038 176,1044! 206,1058 240,1062 276,1050!"), ...sa("lt", 0.8, "cuff", "144,900! 164,886 188,880! 176,894 160,904!", "186,924! 206,956 236,986! 214,978 194,952!", "112,944! 122,930 132,922! 122,944 116,960!"),
    ...sh("s1", "rib", "66,990! 84,986 92,1066! 74,1066!"), ...sh("s1", "jackF", "96,1000! 126,1034 160,1048 200,1056 260,1058 300,1030! 320,1000 320,1066! 98,1066!", "256,726! 236,752 212,778! 222,754 240,734", "330,580! 318,600 306,634! 310,604", "196,842! 176,866 158,884! 168,862", "150,884! 128,904 104,926! 116,900 134,886"), ...sa("lt", 0.7, "jackF", "276,618! 250,664 216,722! 226,726 262,674 290,622!", "168,800! 140,846 112,896! 124,898 154,850 182,806!"),
    ...sh("s1", "jackB patchK", "570,616! 584,616 576,700! 568,720! 566,670", "562,760! 568,820 566,836! 520,862 480,876! 530,846 554,820!"), ...sh("s1", "belt", "552,724! 578,704! 574,746 566,758!"), ...sh("s1", "strap", "222,806! 312,850 316,836! 268,818"),
    ...sh("s1", "shorts", "492,926! 520,956 540,996 548,1034 548,1066! 608,1066! 600,1026 566,974 530,936!", "362,979! 420,983 472,992 504,998! 476,1008 440,1004 416,1010! 400,1000", "430,893! 478,880! 494,904! 466,910 440,924 412,934!", "312,1000! 344,990 372,988! 350,1010 342,1040 340,1066! 316,1066!", "414,971! 490,973 527,957! 520,976 486,982 424,980!"), ...sh("s2", "shorts", "556,978! 586,1014 606,1066! 590,1066! 580,1020", "430,893! 478,880! 486,892 452,902 420,920!"), ...sa("lt", 0.6, "shorts", "366,1006! 400,1012 452,1014 500,1012! 470,1028 420,1034 380,1030!"),
    ...sh("s1", "cig", "232,428! 310,390! 312,394! 236,436!"), ...sh("s1", "gold", "478,300! 496,304 514,296! 508,310 490,308!"), ...sh("s2", "gold", "494,306! 508,304 514,300! 508,311"), ...sh("s1", "gem", "507,338! 526,338 518,344 512,344 512,356 506,357!"), ...sh("s1", "stud", "496,776! 508,772 515,762! 516,776 504,782", "532,764! 544,760 550,748! 552,762 540,768"),
    ...sh("s1", "chain", "208,724! 212,718 206,740 198,758 190,780 184,806! 180,806 188,778 196,754"), ...sh("s1", "patchK", "520,690! 536,690 532,724! 520,724!"),

    /* ---- speculars: only where the material has them ---- */
    ...sh("hi", "hornL", "162,118! 167,140 178,160 194,174! 182,164 170,146!"), ...sh("hi", "hornR", "316,92! 321,118 332,146! 325,134 317,110!"), ...sh("hi", "gold", "479,292! 483,284 488,280! 485,290 482,297!"), ...sh("hi", "gem", "500,326! 503,323 503,333 500,333!", "489,338! 495,335 497,338!"), ...sh("hi", "stud", "493,759! 498,753 504,753! 498,759!", "529,745! 534,739 540,739! 534,745!"), ...sh("hi", "chain", "196,733! 199,730 199,735!", "187,757! 190,754 190,759!", "181,780! 184,777 184,782!"), ...sh("hi", "zip", "182,752! 186,747 187,751!", "150,812! 154,807 155,811!", "118,872! 122,867 123,871!"),
    ...sh("hi", "skin", "294,336! 298,332 300,337 297,341!"),
  ],
  lost: [[476, 160, 24], [420, 522, 30], [620, 568, 34], [212, 668, 22], [236, 1006, 22], [552, 1040, 28], [440, 300, 16], [300, 470, 14], [520, 380, 18], [610, 712, 18]],
  washes: [
    // blood under the skin, light through the ear, colour from the hair's warm side
    ws("flat", "skin", 566, 182, 50, 40, [236, 128, 110], 0.4), ws("late", "skin", 362, 336, 44, 26, [238, 128, 108], 0.36), ws("late", "skin", 290, 342, 18, 16, [236, 120, 104], 0.4), ws("late", "skin", 268, 336, 24, 18, [238, 128, 108], 0.24), ws("late", "skin", 344, 404, 26, 14, [236, 140, 120], 0.22),
    // eye make-up
    ws("late", "skin", 428, 260, 40, 24, [170, 44, 58], 0.62), ws("late", "skin", 386, 256, 46, 16, [176, 60, 66], 0.3), ws("late", "skin", 232, 282, 30, 16, [170, 44, 58], 0.6), ws("late", "skin", 266, 284, 26, 10, [176, 60, 66], 0.3), ws("late", "skin", 392, 314, 34, 9, [214, 96, 88], 0.22),
    // skin glowing through the fringe tips
    ws("late", "hairF", 262, 246, 30, 26, [240, 188, 168], 0.34), ws("late", "hairF", 302, 242, 30, 26, [240, 188, 168], 0.34), ws("late", "hairF", 336, 236, 26, 26, [240, 188, 168], 0.34),
    // warm key on the crown side, cold fill at the far side
    ws("flat", "hairF", 300, 80, 190, 130, [255, 230, 196], 0.42), ws("flat", "hairL", 205, 330, 60, 130, [255, 232, 200], 0.24), ws("flat", "arm", 350, 590, 110, 90, [255, 214, 130], 0.34), ws("flat", "jackF", 220, 720, 120, 120, [255, 214, 130], 0.26), ws("flat", "top", 178, 640, 60, 60, [214, 92, 84], 0.4), ws("flat", "hood", 400, 470, 130, 50, [140, 130, 126], 0.42), ws("flat", "shorts", 440, 1010, 120, 70, [140, 148, 160], 0.3), ws("flat", "cuff", 190, 920, 70, 50, [84, 84, 96], 0.42),
    ws("late", "hairR hairD", 560, 420, 130, 120, [150, 160, 214], 0.3), ws("late", "jackB shorts", 580, 860, 160, 220, [96, 96, 168], 0.26), ws("late", "hood", 660, 590, 120, 90, [72, 80, 112], 0.26), ws("late", "cuff", 250, 1050, 90, 50, [70, 78, 130], 0.36),
    // ember warms what is near it
    ws("late", "hairL cig", 227, 430, 34, 34, [255, 140, 70], 0.5, "screen"),
  ],
  prints: [
    { on: ["hood"], draw: (g) => { g.save(); g.translate(560, 541); g.rotate(0.34); g.fillStyle = "#d8d2c4"; g.font = "800 15px 'Avenir Next Condensed', 'Arial Narrow', sans-serif"; g.fillText("NIGHT SHIFT", 0, 0); g.font = "600 6.5px 'Avenir Next', sans-serif"; g.fillStyle = "rgba(216,210,196,.75)"; g.fillText("DIV.04 / OUTER RING", 1, 10); g.restore(); g.fillStyle = "#c3dd45"; g.beginPath(); g.moveTo(543, 528); g.lineTo(551, 531); g.lineTo(548, 549); g.lineTo(540, 546); g.fill() } },
    { on: ["strap"], draw: (g) => { g.fillStyle = "#c3dd45"; g.beginPath(); g.moveTo(286, 818); g.lineTo(300, 825); g.lineTo(295, 838); g.lineTo(281, 831); g.fill() } },
    { on: ["belt"], draw: (g) => { g.fillStyle = "#c3dd45"; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(474 + i * 4.6, 757 - i * 1.4); g.lineTo(476.4 + i * 4.6, 756 - i * 1.4); g.lineTo(476.4 + i * 4.6, 782 - i * 2); g.lineTo(474 + i * 4.6, 783 - i * 2); g.fill() } } },
    { on: ["arm"], draw: (g) => { g.save(); g.translate(300, 872); g.rotate(0.42); g.font = "800 13px 'Avenir Next Condensed', 'Arial Narrow', sans-serif"; g.fillStyle = "rgba(60,40,44,.82)"; g.fillText("ONI-04", 0, 0); g.font = "600 5.6px 'Avenir Next', sans-serif"; g.fillText("KEEP CLEAR OF HORNS", 0, 9); g.restore(); g.strokeStyle = "rgba(92,58,40,.6)"; g.lineWidth = 0.9; g.setLineDash([3, 2.4]); for (const d of ["436,548 466,580 474,640 464,740", "330,640 300,700 222,772"]) { g.beginPath(); curve(d).forEach(([x, y], i) => (i ? g.lineTo(x - 5, y + 2) : g.moveTo(x - 5, y + 2))); g.stroke() } g.setLineDash([]) } },
    { on: ["shorts", "flap"], draw: (g) => { g.strokeStyle = "rgba(206,186,150,.75)"; g.lineWidth = 0.9; g.setLineDash([3, 2]); for (const d of ["416,944 426,962 490,964 518,950", "495,972 520,1000 540,1040 548,1066", "366,983 430,986 500,1001"]) { g.beginPath(); curve(d).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke() } g.setLineDash([]) } },
    { on: ["jackB"], draw: (g) => { g.save(); g.translate(492, 846); g.rotate(-0.42); g.font = "700 8px 'Avenir Next', sans-serif"; g.fillStyle = "rgba(60,40,44,.75)"; g.fillText("CAUTION", 0, 0); g.restore() } },
    { on: ["cuff", "rib"], draw: (g) => { g.strokeStyle = "rgba(14,15,22,.5)"; g.lineWidth = 1; for (let i = 0; i < 24; i++) { const x = 112 + i * 8.6; g.beginPath(); curve(`${x + 34 - i * 1.2},${886 + Math.abs(i - 9) * 2} ${x - 8 + i * 0.7},${960} ${x + 6 + i * 0.4},${1030 + i} ${x + 24 - i * 0.4},1066`).forEach(([a, b], j) => (j ? g.lineTo(a, b) : g.moveTo(a, b))); g.stroke() } } },
  ],
  face: (g) => {
    const path = (d: string): void => { g.beginPath(); loop(d).forEach(([x, y]: P2, i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath() }
    const fill = (d: string, s: string | CanvasGradient): void => { path(d); g.fillStyle = s; g.fill() }
    const stroke = (d: string, w: number, s: string): void => { g.beginPath(); curve(d).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = w; g.strokeStyle = s; g.lineCap = "round"; g.stroke() }
    fill("308,381! 316,379 328,381 327,387 319,391 311,388", "rgba(190,70,78,.62)")
    for (let i = 0; i < 3; i++) stroke(`${354 + i * 9},${333 - i * 1.6} ${349 + i * 9},${343 - i * 1.6}`, 1.3, "rgba(206,84,72,.5)")
    // 1 whites, 2 lid shadow
    fill("346,306! 357,286 372,272 388,266 422,264! 421,278 415,292 409,303 398,306 384,309 366,309!", "#f0e8e4"); fill("346,306! 357,286 372,272 388,266 422,264! 422,276 400,274 382,281 366,291 354,305!", "#b3a3b8")
    fill("249,293! 264,296 280,299 292,308 299,320! 294,327 284,328 272,325 262,320 255,311", "#eee5e2"); fill("249,293! 264,296 280,299 292,308 299,320! 288,312 272,306 260,306 254,307!", "#b0a0b6")
    const eye = (clip: string, cx: number, cy: number, rx: number, ry: number, tilt: number): void => {
      g.save(); path(clip); g.clip(); g.translate(cx, cy); g.rotate(tilt)
      const el = (x: number, y: number, a: number, b: number): void => { g.beginPath(); g.ellipse(x, y, a, b, 0, 0, 7) }
      // 3 base and top-down dark: the iris melts into the lid
      const q = g.createLinearGradient(0, -ry, 0, ry)
      for (const [a, s] of [[0, "#2c0d20"], [0.2, "#5e1626"], [0.42, "#b04a22"], [0.64, "#e08e2c"], [0.86, "#f3c552"], [1, "#e7e07c"]] as const) q.addColorStop(a, s)
      el(0, 0, rx, ry); g.fillStyle = q; g.fill()
      // 4 outer ring
      g.lineWidth = rx * 0.14; g.strokeStyle = "rgba(60,14,30,.85)"; el(0, 0, rx * 0.95, ry * 0.96); g.stroke()
      // 5 fibres, few and uneven
      for (const [a, l] of [[0.5, 0.8], [0.9, 0.7], [1.25, 0.86], [1.7, 0.74], [2.05, 0.84], [2.5, 0.7], [2.9, 0.8]] as const) { g.lineWidth = 0.9; g.strokeStyle = "rgba(255,226,130,.55)"; g.beginPath(); g.moveTo(Math.cos(a) * rx * 0.42, Math.sin(a) * ry * 0.42); g.lineTo(Math.cos(a) * rx * l, Math.sin(a) * ry * l); g.stroke() }
      // 6 lower pool, shifted toward green, with a thin cyan lip
      g.fillStyle = "rgba(226,238,130,.75)"; el(rx * 0.08, ry * 0.62, rx * 0.52, ry * 0.24); g.fill()
      g.strokeStyle = "rgba(150,232,214,.85)"; g.lineWidth = 1; g.beginPath(); g.ellipse(0, 0, rx * 0.8, ry * 0.82, 0, 0.5, 2.3); g.stroke()
      // 7 pupil
      const pq = g.createLinearGradient(0, -ry * 0.8, 0, ry * 0.5); pq.addColorStop(0, "#160710"); pq.addColorStop(0.8, "#2a0a18"); pq.addColorStop(1, "rgba(70,20,24,.0)")
      g.fillStyle = pq; el(rx * 0.02, -ry * 0.1, rx * 0.2, ry * 0.66); g.fill()
      // 8 lid shadow over everything
      g.fillStyle = "rgba(34,10,36,.6)"; el(0, -ry * 1.04, rx * 1.4, ry * 0.5); g.fill()
      g.restore()
    }
    eye("370,277! 382,270 394,265 422,264! 421,278 416,292 409,302 398,306 386,303 378,294", 398, 284, 25.5, 24, 0.06)
    eye("261,297! 276,299 286,303 295,312 298,320! 290,327 281,326 273,318 266,308", 281, 311, 17.5, 17.5, 0.3)
    stroke("371,277 375,288 381,297 388,303 398,306 408,303", 1.7, "#3a0e1e"); stroke("262,297 266,308 273,318 281,326 289,327 296,320", 1.6, "#3a0e1e")
    // wet lower lids
    stroke("368,311 384,311 400,308", 1.1, "rgba(255,236,226,.85)"); stroke("270,329 280,331 290,330", 0.9, "rgba(255,236,226,.75)")
  },
  over: (g) => {
    const stroke = (d: string, w: number, s: string): void => { g.beginPath(); curve(d).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = w; g.strokeStyle = s; g.lineCap = "round"; g.stroke() }
    const dot = (x: number, y: number, a: number, b: number, r: number, s: string): void => { g.beginPath(); g.ellipse(x, y, a, b, r, 0, 7); g.fillStyle = s; g.fill() }
    const rr = (x: number, y: number, w: number, hh: number, r: number, rot: number): void => { g.save(); g.translate(x, y); g.rotate(rot); g.beginPath(); g.roundRect(-w / 2, -hh / 2, w, hh, r); g.fillStyle = "#fffaf2"; g.fill(); g.restore() }
    // eye lights sit above the line
    rr(383, 277, 9, 7, 2.6, -0.3); dot(410, 295, 2, 1.6, 0, "rgba(255,250,240,.95)"); rr(271, 304, 6, 5, 2, 0.1); dot(289, 320, 1.4, 1.2, 0, "rgba(255,250,240,.9)")
    // lash: warm where it leaves the eye, and a lit top edge
    g.globalCompositeOperation = "lighten"
    stroke("346,306 350,294 357,283", 2.6, "#6e2418"); stroke("424,252 436,250 446,250", 3, "#6e2418"); stroke("226,284 238,284", 2.4, "#6e2418"); stroke("360,271 378,259 398,252 420,250", 1.3, "#7c3034"); stroke("374,261 392,254 408,252", 0.8, "#d08a76"); stroke("244,283 262,285 278,292", 1.1, "#7c3034")
    // solid blacks of the neck wedge go warm
    g.globalCompositeOperation = "source-over"
    stroke("317,391 325,391.5", 1, "rgba(255,224,210,.9)");
    // flyaways
    for (const [d, w] of [["236,82 222,98 212,116", 0.9], ["300,34 286,42 274,52", 0.8], ["520,86 532,104 540,124", 0.9], ["198,520 194,536 196,548", 0.9], ["646,724 650,742 646,758", 0.9], ["470,44 484,54 494,66", 0.7], ["200,300 196,316 196,334", 0.8]] as const) stroke(d, w, "rgba(52,42,62,.85)")
    // horn roots, closed with the same pen as the rest
    stroke("345,199 360,203 384,199 404,190 418,181", 1.5, "#4a1622"); stroke("232,229 238,218 241,206", 1.2, "#4a1622")
    // horn rings
    for (const d of ["240,172 234,192 224,212", "228,164 220,184 208,202", "214,156 206,172 196,186", "338,184 360,186 384,180 404,168", "331,164 350,166 370,160 386,148", "326,144 340,146 356,140 368,130"]) { stroke(d, 1.3, "rgba(58,12,30,.7)") }
  },
  backdrop: (g) => {
    const r = rng("bk")
    // halftone falling off from the light
    g.fillStyle = "rgba(30,34,48,.34)"
    for (let j = 0; j < 150; j++) for (let i = 0; i < 100; i++) { const x = i * 7.6 + (j % 2) * 3.8, y = j * 7.4; const v = Math.max(0, (x / 736) * 0.55 + (y / 1104) * 0.75 - 0.42); const s = Math.sqrt(v) * 4.1; if (s > 0.5) { g.beginPath(); g.arc(x, y, s, 0, 7); g.fill() } }
    // worn print on the type
    g.fillStyle = "rgba(60,66,74,.5)"
    for (let i = 0; i < 260; i++) { const x = r() * 736, y = r() * 660, s = r() ** 3 * 3.2; g.beginPath(); g.arc(x, y, s + 0.3, 0, 7); g.fill() }
    // graphic layer: thin, small, technical
    g.fillStyle = "#c3dd45"; g.fillRect(24, 1079, 44, 6); g.fillRect(594, 742, 4, 4)
    g.fillStyle = "rgba(226,222,212,.85)"; g.font = "800 11px 'Avenir Next Condensed', 'Arial Narrow', sans-serif"; g.fillText("OUTER RING  /  NIGHT SHIFT  /  DIV.04", 76, 1086)
    g.font = "600 6.4px 'Avenir Next', sans-serif"; g.fillStyle = "rgba(226,222,212,.6)"; g.fillText("SMOKING PERMITTED IN MARKED AREAS ONLY", 76, 1096)
    for (let i = 0, x = 600; x < 700; i++) { const wd = 1 + Math.floor(r() * 4); if (i % 2 === 0) { g.fillStyle = "rgba(226,222,212,.85)"; g.fillRect(x, 1077, wd, 18) } x += wd }
    g.fillStyle = "rgba(226,222,212,.16)"; for (let i = -2; i < 30; i++) { g.beginPath(); g.moveTo(700 + i * 12, 560); g.lineTo(706 + i * 12, 560); g.lineTo(696 + i * 12, 580); g.lineTo(690 + i * 12, 580); g.fill() }
    g.strokeStyle = "rgba(226,222,212,.28)"; g.lineWidth = 1; g.beginPath(); g.arc(388, 300, 318, 3.4, 5.9); g.stroke(); g.beginPath(); g.arc(388, 300, 326, 3.7, 4.6); g.stroke()
  },
  effects: (g) => {
    // smoke: flat, hard-edged, pale, in two steps
    const ribbon = (d: string, wd: (t: number) => number, s: string): void => {
      const p = curve(d, 20)
      const a: Array<P2> = [], b: Array<P2> = []
      p.forEach((q, i) => { const m = p[Math.max(0, i - 1)]!, n = p[Math.min(p.length - 1, i + 1)]!; const l = Math.hypot(n[0] - m[0], n[1] - m[1]) || 1; const t = i / (p.length - 1), hh = wd(t) / 2; a.push([q[0] - ((n[1] - m[1]) / l) * hh, q[1] + ((n[0] - m[0]) / l) * hh]); b.push([q[0] + ((n[1] - m[1]) / l) * hh, q[1] - ((n[0] - m[0]) / l) * hh]) })
      g.beginPath();[...a, ...b.reverse()].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = s; g.fill()
    }
    ribbon("226,426 212,396 216,360 186,324 176,284 136,254 112,214 112,170", (t) => 2 + 26 * Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 1.4 * (0.55 + 0.45 * Math.sin(t * 19)), "rgba(232,230,228,.42)")
    ribbon("225,424 206,396 202,360 168,328 158,290 124,268", (t) => 1 + 10 * Math.sin(Math.PI * t) * (0.6 + 0.4 * Math.sin(t * 23 + 1)), "rgba(255,252,246,.55)")
    const glow = (x: number, y: number, rr: number, s: string, a: number): void => { const q = g.createRadialGradient(x, y, 0, x, y, rr); q.addColorStop(0, s.replace("A", String(a))); q.addColorStop(1, s.replace("A", "0")); g.fillStyle = q; g.fillRect(x - rr, y - rr, rr * 2, rr * 2) }
    g.globalCompositeOperation = "lighter"
    glow(227, 431, 26, "rgba(255,110,40,A)", 0.5); glow(227, 431, 8, "rgba(255,210,130,A)", 0.9); glow(398, 296, 30, "rgba(255,150,50,A)", 0.14); glow(281, 318, 22, "rgba(255,150,50,A)", 0.12)
    // sparks and dust, sparse, only against the dark and the light's path
    const r = rng("dust")
    for (let i = 0; i < 26; i++) { const x = r() * 736, y = 40 + r() ** 0.8 * 1000, s = 0.5 + r() ** 3 * 2; g.fillStyle = `rgba(255,232,196,${0.12 + r() * 0.4})`; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill() }
    for (const [x, y, s] of [[214, 408, 1.4], [240, 396, 1], [204, 440, 1.2], [196, 386, 0.9], [250, 452, 0.9]] as const) { g.fillStyle = "rgba(255,150,70,.95)"; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill() }
    g.globalCompositeOperation = "source-over"
  },
}
