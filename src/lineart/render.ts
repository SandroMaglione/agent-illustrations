/** Line art in, splash cel out: the same Style numbers as src/cel, applied to flooded regions. */
import { curve, loop } from "../cel/path.ts"
import { SPLASH, tones } from "../cel/style.ts"
import type { Kind, Mat, Style } from "../cel/style.ts"
import { rng, smooth } from "../geo.ts"
import type { P2 } from "../geo.ts"
import { blur, flood } from "./flood.ts"
import { loadInk } from "./main.ts"
import { FORCE, NOINK, PAINT } from "./paint.ts"
import { SEEDS } from "./seeds.ts"

type RGB = readonly [number, number, number]
const parse = (c: string): RGB => { const m = c.match(/[\d.]+/g)!.map(Number); return [m[0]!, m[1]!, m[2]!] }
type Def = { mat: Mat; auto: number; smear: number; hint: number; soft: number; group: string }
const D = (base: string, kind: Kind, group: string, auto: number, smear: number, hint = 0, soft = 3): Def => ({ mat: { base, kind }, auto, smear, hint, soft, group })

export const DEFS: Readonly<Record<string, Def>> = {
  bg: D("#faf8f9", "paint", "bg", 0, 0), cloth: D("#d3d1e0", "cloth", "cloth", 0, 0, 0, 5),
  hairF: D("#e39aa8", "hair", "hair", 5, 9, 0, 2), hairB: D("#d98c9f", "hair", "hairB", 9, 11, 0.6, 2), fur: D("#e39aa8", "hair", "fur", 6, 6, 0, 2), earIn: D("#f6cfc8", "skin", "earIn", 0, 7, 0.4, 2),
  face: D("#fdeee4", "skin", "face", 0, 0, 0, 2), neck: D("#fdeee4", "skin", "neck", 3, 4, 0.5, 2), arm: D("#fdeee4", "skin", "arm", 6, 0, 0.5, 2), hand: D("#fdeee4", "skin", "arm", 4, 4, 0, 1.6),
  choker: D("#3a3d48", "cloth", "choker", 3, 3), bell: D("#e7b23e", "hard", "bell", 8, 0, 0, 1), ribbon: D("#2f8f8b", "cloth", "ribbon", 6, 9, 0, 2),
  collar: D("#f7f4f1", "cloth", "collar", 3, 0, 0, 2), blouse: D("#e9e5ee", "cloth", "blouse", 7, 0, 0), puff: D("#6878ac", "cloth", "puff", 14, 8, 0.5),
  sleeve: D("#6878ac", "cloth", "sleeve", 8, 11, 0.5), frill: D("#f5f2ef", "cloth", "frill", 6, 11, 0.3, 2), bodice: D("#5767a0", "cloth", "bodice", 14, 0, 0), corset: D("#3f4766", "cloth", "corset", 9, 7, 0.3),
  apron: D("#f7f4f1", "cloth", "apron", 9, 0, 0.8), skirt: D("#5767a0", "cloth", "skirt", 12, 5, 0),
  tights: D("#6a6474", "cloth", "tights", 26, 0, 0, 5), tightsN: D("#6a6474", "cloth", "tightsN", 22, 0, 0, 5), shoe: D("#34353d", "hard", "shoe", 9, 4, 0, 1.5), shoeTip: D("#4a4b55", "hard", "shoe", 6, 4, 0, 1.5),
  plate: D("#f7f6f8", "hard", "plate", 8, 0, 0, 1.5), sponge: D("#f3d79b", "cloth", "cake", 7, 5, 0.3, 1.5), berry: D("#d9444c", "hard", "berry", 6, 3, 0, 1.5), steel: D("#a5aab5", "hard", "steel", 2, 0),
}
/** caster groups -> receivers, offset in sketch pixels */
const CASTS: ReadonlyArray<readonly [ReadonlyArray<string>, ReadonlyArray<string>, number, number]> = [
  [["hairF"], ["face"], 6, 14], [["face"], ["neck", "choker"], 6, 26], [["face", "hairF"], ["hairB"], 10, 14], [["hairF"], ["blouse", "puff", "ribbon", "choker"], 4, 9], [["fur", "hairF"], ["ribbon"], 3, 4],
  [["collar", "ribbon", "bell"], ["blouse", "bodice"], 4, 9], [["ribbon", "bell"], ["collar"], 3, 7], [["bodice"], ["corset"], 3, 6], [["corset", "bodice"], ["apron"], 2, 7], [["apron"], ["frill"], 2, 4], [["frill", "apron"], ["skirt"], 5, 12],
  [["skirt", "frill"], ["tights", "tightsN"], 7, 26], [["tightsN"], ["cloth"], 34, 14], [["skirt", "frill", "hairB"], ["cloth"], 12, 22], [["shoe", "shoeTip"], ["cloth"], 18, 12],
  [["puff", "plate", "frill"], ["arm"], 4, 12], [["arm", "frill"], ["sleeve"], 7, 8], [["hand", "plate"], ["sleeve", "hairB", "frill", "arm"], 6, 12], [["plate"], ["hand"], 2, 5], [["sponge"], ["plate"], 6, 4], [["ribbon"], ["skirt", "tights", "hairB", "corset", "frill"], 6, 9], [["sleeve", "frill"], ["hairB", "skirt"], 8, 10],
]
const NOLINE = new Set(["arm|hand", "bg|cloth", "face|neck"])

/** Smooth ink along its own direction: broken pencil becomes one stroke without getting fatter. */
const flow = (ink: Float32Array, w: number, h: number, k: number): Float32Array => {
  const b = blur(ink, w, h, 0.5 * k, 2)
  const N = w * h
  let xx: Float32Array = new Float32Array(N), xy: Float32Array = new Float32Array(N), yy: Float32Array = new Float32Array(N)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    const gx = b[i + 1]! - b[i - 1]!, gy = b[i + w]! - b[i - w]!
    xx[i] = gx * gx; xy[i] = gx * gy; yy[i] = gy * gy
  }
  xx = blur(xx, w, h, 1.6 * k, 2); xy = blur(xy, w, h, 1.6 * k, 2); yy = blur(yy, w, h, 1.6 * k, 2)
  const at = (x: number, y: number): number => {
    const X = Math.max(0, Math.min(w - 2, x)), Y = Math.max(0, Math.min(h - 2, y))
    const i = X | 0, j = Y | 0, u = X - i, v = Y - j, q = j * w + i
    return (ink[q]! * (1 - u) + ink[q + 1]! * u) * (1 - v) + (ink[q + w]! * (1 - u) + ink[q + w + 1]! * u) * v
  }
  const out = new Float32Array(N)
  const R = Math.round(4.5 * k)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (b[i]! < 0.03) continue
    let sum = ink[i]! * 1, wt = 1
    for (const dir of [1, -1]) {
      let px = x, py = y, tx = 0, ty = 0
      for (let t = 1; t <= R; t++) {
        const j = (Math.max(0, Math.min(h - 1, Math.round(py))) * w) + Math.max(0, Math.min(w - 1, Math.round(px)))
        const a = Math.atan2(2 * xy[j]!, xx[j]! - yy[j]!) / 2 + Math.PI / 2
        let cx = Math.cos(a), cy = Math.sin(a)
        if (t === 1) { cx *= dir; cy *= dir } else if (cx * tx + cy * ty < 0) { cx = -cx; cy = -cy }
        tx = cx; ty = cy
        px += cx; py += cy
        const g = 1 - t / (R + 1)
        sum += at(px, py) * g; wt += g
      }
    }
    out[i] = sum / wt
  }
  return out
}

export const renderSketch = async (ctx: CanvasRenderingContext2D, o: { k: number; style?: Style; step?: number }): Promise<void> => {
  const k = o.k
  const s = o.style ?? SPLASH
  const step = o.step ?? 9
  const { ink, w, h } = await loadInk("/sketch.png", k)
  const N = w * h
  const raw = flood(ink, w, h, SEEDS, k)
  const names = raw.names
  // majority smoothing: every colour edge becomes one clean curve
  const best = new Float32Array(N).fill(-1)
  const map = new Uint8Array(N)
  for (let n = 1; n < names.length; n++) {
    const m = new Float32Array(N)
    for (let i = 0; i < N; i++) m[i] = raw.map[i] === n ? 1 : 0
    const b = blur(m, w, h, 0.75 * k, 2)
    for (let i = 0; i < N; i++) if (b[i]! > best[i]!) { best[i] = b[i]!; map[i] = n }
  }
  {
    const c = document.createElement("canvas")
    c.width = w; c.height = h
    const g = c.getContext("2d", { willReadFrequently: true })!
    for (const f of FORCE) {
      const n = names.indexOf(f.label)
      const ok = f.over?.map((o) => names.indexOf(o))
      g.clearRect(0, 0, w, h)
      g.beginPath()
      loop(f.d).forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)))
      g.fill()
      const d = g.getImageData(0, 0, w, h).data
      for (let i = 0; i < N; i++) if (d[i * 4 + 3]! > 127 && (!ok || ok.includes(map[i]!))) map[i] = n
    }
  }
  const idx = (n: string): number => names.indexOf(n)
  const defOf = names.map((n) => DEFS[n])
  const groupIn = (gs: ReadonlyArray<string>): Uint8Array => { const t = new Uint8Array(names.length); gs.forEach((g) => { const i = idx(g); if (i > 0) t[i] = 1 }); return t }

  // authored forms arrive as canvases
  const layer = (kind: "shade" | "deep" | "light"): Float32Array => {
    const c = document.createElement("canvas")
    c.width = w; c.height = h
    const g = c.getContext("2d")!
    const out = new Float32Array(N)
    for (const f of PAINT.filter((q) => q.kind === kind)) {
      const ok = groupIn(f.on)
      g.clearRect(0, 0, w, h)
      g.beginPath()
      loop(f.d).forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)))
      g.fill()
      const d = g.getImageData(0, 0, w, h).data
      for (let i = 0; i < N; i++) if (d[i * 4 + 3]! > 100 && ok[map[i]!]) out[i] = 1
    }
    return out
  }
  const authored = layer("shade"), deepA = layer("deep"), light = layer("light")

  const [lx, ly] = [-s.light.dir[0], -s.light.dir[1]]
  const shade = new Float32Array(N)
  if (step >= 3) {
    const casts = CASTS.map(([a, b, dx, dy]) => ({ a: groupIn(a), b: groupIn(b), dx: Math.round(dx * k), dy: Math.round(dy * k) }))
    // broad grey marks in the sketch are the artist's own shadow notes
    const wide = blur(ink, w, h, 3 * k, 2)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x
      const n = map[i]!
      const d = defOf[n]
      if (!d || d.mat.kind === "paint") continue
      let v = authored[i]!
      if (!v && d.auto) {
        const X = x + Math.round(lx * d.auto * k * s.light.auto), Y = y + Math.round(ly * d.auto * k * s.light.auto)
        const m = X < 0 || Y < 0 || X >= w || Y >= h ? n : map[Y * w + X]!
        if (defOf[m]?.group !== d.group) v = 1
      }
      if (!v) for (const c of casts) if (c.b[n]) {
        const X = x - c.dx, Y = y - c.dy
        if (X >= 0 && Y >= 0 && X < w && c.a[map[Y * w + X]!]) { v = 1; break }
      }
      if (!v && d.smear) {
        const W = d.smear * k
        for (let t = 2; t < W; t += 1) {
          const X = x - Math.round(lx * t), Y = y - Math.round(ly * t)
          if (X < 0 || Y < 0 || X >= w) break
          const j = Y * w + X
          if (ink[j]! > 0.28 + 0.5 * (t / W) && defOf[map[j]!]?.group === d.group) { v = 1; break }
        }
      }
      if (!v && d.hint && wide[i]! > 0.17 - 0.06 * d.hint && ink[i]! < 0.4) v = d.hint > 0.45 ? 1 : 0.6
      shade[i] = v
    }
  }
  const shS = blur(shade, w, h, 1.6 * k, 2)
  const shSoft = blur(shade, w, h, 3 * k, 2)
  const shBand = blur(shade, w, h, 3.4 * k, 1)
  const deep = blur(deepA, w, h, 1.3 * k, 2)
  const hi = blur(light, w, h, 0.6 * k, 1)

  // vertical extent per label, for the hair and cloth gradients
  const y0 = new Float32Array(names.length).fill(1e9), y1 = new Float32Array(names.length)
  for (let i = 0; i < N; i++) { const n = map[i]!, y = (i / w) | 0; if (y < y0[n]!) y0[n] = y; if (y > y1[n]!) y1[n] = y }
  const T = names.map((n, i) => { const d = defOf[i]; if (!d) return null; const t = tones(d.mat, s); void n; return { base: parse(t.base), top: parse(t.top), low: parse(t.low), shade: parse(t.shade), deep: parse(t.deep), band: parse(t.band), rim: parse(t.rim), hi: parse(t.hi) } })
  const r = rng("paper")
  const grainF = new Float32Array(N)
  for (let i = 0; i < N; i++) grainF[i] = r() - 0.5
  const grain = blur(grainF, w, h, 1, 1)
  const out = new ImageData(w, h)
  const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
  for (let i = 0; i < N; i++) {
    const n = map[i]!
    const t = T[n]!
    const d = defOf[n]!
    const y = (i / w) | 0
    const v = (y - y0[n]!) / Math.max(1, y1[n]! - y0[n]!)
    let c: RGB = step < 5 ? t.base : v < 0.5 ? mix(t.top, t.base, v * 2) : mix(t.base, t.low, v * 2 - 1)
    if (step >= 5 && (names[n] === "hairB" || names[n] === "hairF")) c = mix(c, [150, 108, 168], smooth(620, 1260, y / k) * 0.6)
    const cloth = d.mat.kind === "cloth" && d.soft >= 3 && step >= 4
    const a = cloth ? smooth(0.28, 0.72, shSoft[i]!) : smooth(0.42, 0.58, shS[i]!)
    if (d.mat.kind === "skin" && step >= 4) c = mix(c, t.band, smooth(0.2, 0.3, shBand[i]!))
    let sc = t.shade
    if (names[n] === "hairB" || names[n] === "hairF") sc = mix(sc, [84, 62, 120], smooth(620, 1260, y / k) * 0.55)
    c = mix(c, sc, a)
    if (step >= 3) c = mix(c, t.deep, smooth(0.42, 0.58, deep[i]!))
    if (step >= 5) c = mix(c, t.hi, 0.62 * smooth(0.4, 0.6, hi[i]!))
    const gr = step >= 5 ? grain[i]! * (d.mat.kind === "skin" ? 5 : d.mat.kind === "paint" ? 2 : 13) : 0
    out.data[i * 4] = c[0] + gr; out.data[i * 4 + 1] = c[1] + gr; out.data[i * 4 + 2] = c[2] + gr; out.data[i * 4 + 3] = 255
  }
  const col = document.createElement("canvas")
  col.width = w; col.height = h
  const cg = col.getContext("2d")!
  cg.putImageData(out, 0, 0)
  if (step >= 5) { cg.save(); cg.scale(k, k); facePaint(cg); cg.restore() }

  // ---- ink: the sketch's own strokes, cleaned, plus an outline from the regions
  const line = new Float32Array(N)
  if (step >= 2) {
    const sharp = flow(ink, w, h, k)
    const c = document.createElement("canvas")
    c.width = w; c.height = h
    const g = c.getContext("2d")!
    g.fillStyle = "#000"
    for (const q of NOINK) { g.beginPath(); loop(q).forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k))); g.fill() }
    const hide = g.getImageData(0, 0, w, h).data
    for (let i = 0; i < N; i++) {
      const nm = names[map[i]!]!
      if (nm === "bg" || nm === "cloth" || hide[i * 4 + 3]! > 100) continue
      line[i] = nm.startsWith("tights") ? smooth(0.5, 0.75, sharp[i]!) : nm.startsWith("hair") ? smooth(0.13, 0.36, sharp[i]!) : smooth(0.19, 0.42, sharp[i]!)
    }
    for (let n = 1; n < names.length; n++) {
      const nm = names[n]!
      if (nm === "bg" || nm === "cloth") continue
      const m = new Float32Array(N)
      for (let i = 0; i < N; i++) m[i] = map[i] === n || NOLINE.has([names[map[i]!]!, nm].sort().join("|")) ? 1 : 0
      const b = blur(m, w, h, 1.1 * k, 2)
      for (let i = 0; i < N; i++) { const e = 1 - Math.abs(b[i]! - 0.5) * 2; if (e > 0.5) line[i] = Math.max(line[i]!, smooth(0.55, 0.85, e) * 0.9) }
    }
    if (step >= 3 - 1) {
      const m = new Float32Array(N)
      for (let i = 0; i < N; i++) { const nm = names[map[i]!]!; m[i] = nm === "bg" || nm === "cloth" ? 0 : 1 }
      const b = blur(m, w, h, 2 * k, 2)
      for (let i = 0; i < N; i++) { const e = 1 - Math.abs(b[i]! - 0.5) * 2; line[i] = Math.max(line[i]!, smooth(0.5, 0.72, e)) }
    }
    // ink pooling
    const p = blur(line, w, h, 1.1 * k, 2)
    for (let i = 0; i < N; i++) { const nm = names[map[i]!]!; if (nm !== "bg" && nm !== "cloth") line[i] = Math.max(line[i]!, smooth(0.72, 0.84, p[i]!)) }
  }
  // halo: plate, cake and hands stay readable over hair and sleeve
  const inkC = new ImageData(w, h)
  let halo: Float32Array | null = null
  const hg = groupIn(["plate", "sponge", "hand"])
  if (step >= 5 && s.sep > 0) {
    const m = new Float32Array(N)
    for (let i = 0; i < N; i++) m[i] = hg[map[i]!] ? 1 : 0
    halo = blur(m, w, h, 2.6 * k, 2)
  }
  for (let i = 0; i < N; i++) {
    const nm = names[map[i]!]!
    let a = line[i]!, v = 13
    if (halo && !hg[map[i]!] && nm !== "bg" && nm !== "cloth" && nm !== "arm") {
      const q = smooth(0.1, 0.16, halo[i]!) * (1 - smooth(0.24, 0.32, halo[i]!))
      if (q > 0) { v = v * (1 - q) + 245 * q; a = Math.max(a * (1 - q), q) }
    }
    const soft = nm === "bg" || nm === "cloth"
    inkC.data[i * 4] = soft ? 96 : v; inkC.data[i * 4 + 1] = soft ? 90 : v - 1; inkC.data[i * 4 + 2] = soft ? 120 : v + 3; inkC.data[i * 4 + 3] = a * 255
  }
  const ic = document.createElement("canvas")
  ic.width = w; ic.height = h
  ic.getContext("2d")!.putImageData(inkC, 0, 0)
  cg.drawImage(ic, 0, 0)
  if (step >= 5) { cg.save(); cg.scale(k, k); faceOver(cg); cg.restore() }
  ctx.drawImage(col, 0, 0)
}

/* ---------- the few things a sketch leaves blank: irises, mouth, blush ---------- */
const path = (g: CanvasRenderingContext2D, p: ReadonlyArray<P2>): void => { g.beginPath(); p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath() }
const fillP = (g: CanvasRenderingContext2D, d: string, c: string | CanvasGradient): void => { path(g, loop(d)); g.fillStyle = c; g.fill() }
const iris = (g: CanvasRenderingContext2D, d: string, x: number, y0: number, y1: number, rx: number): void => {
  const gr = g.createLinearGradient(0, y0, 0, y1)
  for (const [a, c] of [[0, "#123a3d"], [0.38, "#1f7774"], [0.7, "#55c2a4"], [1, "#dcf3ae"]] as const) gr.addColorStop(a, c)
  g.save()
  path(g, loop(d)); g.clip()
  g.fillStyle = gr
  g.fillRect(x - 30, y0 - 10, 60, y1 - y0 + 20)
  g.fillStyle = "#0d2327"
  g.beginPath(); g.ellipse(x, y0 + (y1 - y0) * 0.36, rx * 0.36, (y1 - y0) * 0.34, 0, 0, 7); g.fill()
  g.fillStyle = "rgba(235,250,190,.7)"
  g.beginPath(); g.ellipse(x + 1, y1 - 3, rx * 0.6, 4.2, 0, 0, 7); g.fill()
  g.fillStyle = "rgba(8,26,32,.5)"
  g.fillRect(x - 30, y0 - 6, 60, 11)
  g.restore()
}
const facePaint = (g: CanvasRenderingContext2D): void => {
  for (const [x, y, rr] of [[449, 360, 30], [556, 378, 27]] as const) {
    const gr = g.createRadialGradient(x, y, 0, x, y, rr)
    gr.addColorStop(0, "rgba(246,140,112,.42)"); gr.addColorStop(1, "rgba(246,140,112,0)")
    g.fillStyle = gr
    g.fillRect(x - rr, y - rr, rr * 2, rr * 2)
    g.strokeStyle = "rgba(226,104,84,.5)"; g.lineWidth = 1.2; g.lineCap = "round"
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * 6 + 1.5, y - 7); g.lineTo(x + i * 6 - 1.5, y + 7); g.stroke() }
  }
  fillP(g, "422,325! 436,316 455,313 472,316 484,324! 478,334 464,337 448,338 432,336", "#f7f5f6")
  fillP(g, "540,336! 552,328 566,331 578,342 584,354! 570,360 556,356 540,350", "#f7f5f6")
  fillP(g, "422,325! 436,314 455,311 474,314 486,324! 470,321 452,318 436,321", "#c4bac8")
  fillP(g, "540,336! 552,326 568,329 580,340 586,352! 572,342 560,336 548,335", "#c4bac8")
  iris(g, "431,315 448,310 466,313 467,328 462,337 449,338 436,337 431,327", 449, 311, 338, 18)
  iris(g, "537,333 551,326 566,331 567,346 561,358 549,355 539,350", 552, 328, 357, 15)
  fillP(g, "478,394! 481,387 486,393! 493,385 501,388 512,388 518,395 513,408 499,413 485,409 479,402", "#8f3b40")
  fillP(g, "483,408! 488,401 500,399 511,404! 507,411 498,413 489,411", "#e88d88")
}
const faceOver = (g: CanvasRenderingContext2D): void => {
  g.fillStyle = "#fff"
  for (const [x, y, a, b] of [[441, 318, 4.4, 4], [456, 332, 2, 1.7], [545, 337, 3.8, 3.6], [558, 351, 1.8, 1.5]] as const) { g.beginPath(); g.ellipse(x, y, a, b, 0, 0, 7); g.fill() }
  g.beginPath(); g.ellipse(512, 352, 2.2, 3.2, -0.3, 0, 7); g.fill()
  const lash = (d: string, x0: number, x1: number): void => {
    const gr = g.createLinearGradient(x0, 0, x1, 0)
    gr.addColorStop(0, "#6b2016"); gr.addColorStop(0.25, "#140c0e"); gr.addColorStop(0.78, "#140c0e"); gr.addColorStop(1, "#6b2016")
    fillP(g, d, gr)
  }
  lash("408,318! 418,315 430,308 452,304.5 472,308 490,322! 474,316 454,312.5 434,315 424,321 418,330! 417,322", 408, 490)
  lash("534,337! 542,328 556,324 572,328 584,339 592,352! 594,356 588,366! 586,354 576,341 562,333 548,332", 534, 594)
  lash("424,303! 438,297 456,295 474,299! 456,298 438,300", 424, 474)
  g.strokeStyle = "#1a1014"; g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = 1.5
  const st = (d: string): void => { g.beginPath(); curve(d).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke() }
  st("477,396 481,386 486,393! 493,385 501,388 512,388 519,395")
  g.lineWidth = 1
  st("519,395 513,408 499,413 485,409 478,397")
  g.fillStyle = "#1a1014"
  g.beginPath(); g.ellipse(515, 358, 1.3, 1.6, 0, 0, 7); g.fill()
}
