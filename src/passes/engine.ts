/**
 * Line art -> finished illustration in named passes. Every pass adds one decision and can be
 * looked at on its own. Steps and numbers: docs/rendering-steps.md.
 */
import { loop } from "../cel/path.ts"
import { noise1, rng, smooth } from "../geo.ts"
import { blur, flood } from "../lineart/flood.ts"
import { loadInk } from "../lineart/main.ts"
import { curveless } from "../lineart/poly.ts"
import type { Seed } from "../lineart/seeds.ts"
import { EDGE, GRAIN, mix, tone } from "./tones.ts"
import type { Kind, RGB } from "./tones.ts"

export type Def = { color: string; kind: Kind; z: number; vol?: number; rim?: number; strand?: (x: number, y: number) => number }
export type Level = "s1" | "s2" | "s3" | "lt" | "hi"
export type Shape = { lv: Level; on: ReadonlyArray<string>; d: string; a: number }
export type Wash = { stage: "flat" | "late"; on: ReadonlyArray<string>; x: number; y: number; rx: number; ry: number; color: RGB; a: number; mode: "mix" | "mul" | "screen" }
export type Art = {
  src: string; w: number; h: number
  seeds: ReadonlyArray<Seed>; walls: ReadonlyArray<string>; force: ReadonlyArray<{ label: string; d: string; over?: ReadonlyArray<string> }>
  defs: Readonly<Record<string, Def>>; background: ReadonlyArray<string>
  grads: ReadonlyArray<{ on: ReadonlyArray<string>; a: readonly [number, number]; b: readonly [number, number]; mul: RGB; k: number }>
  casts: ReadonlyArray<readonly [ReadonlyArray<string>, ReadonlyArray<string>, number, number]>
  shapes: ReadonlyArray<Shape>; lost: ReadonlyArray<readonly [number, number, number]>; washes: ReadonlyArray<Wash>
  halo: ReadonlyArray<string>
  /** Printed marks: drawn on the flats, so every later light falls across them. */
  prints: ReadonlyArray<{ on: ReadonlyArray<string>; draw: (g: CanvasRenderingContext2D) => void }>
  face: (g: CanvasRenderingContext2D) => void
  over: (g: CanvasRenderingContext2D) => void
  backdrop: (g: CanvasRenderingContext2D) => void
  effects: (g: CanvasRenderingContext2D) => void
}
export const LIGHT = [-0.62, -0.6, 0.505] as const
const L2 = Math.hypot(LIGHT[0], LIGHT[1])
export const FALL: readonly [number, number] = [-LIGHT[0] / L2, -LIGHT[1] / L2]

export const PASSES = ["Line art", "Value plan", "Flats", "Gradients and prints", "Rough light", "Contact", "Form and cast shadow", "Edges", "Deep shadow", "Light planes and rim", "Material highlights", "Face and eyes", "Colour line", "Backdrop", "Effects and finish"] as const
export type Stats = Record<string, { area: number; s1: number; s2: number; lt: number; hi: number }>

const vote = (wall: Float32Array, w: number, h: number) => (seed: Uint8Array): void => {
  const seen = new Uint8Array(w * h)
  const stack = new Int32Array(w * h)
  for (let s0 = 0; s0 < seed.length; s0++) {
    if (seen[s0] || wall[s0]! > 0.4) continue
    let top = 0, read = 0
    const count = new Map<number, number>()
    stack[top++] = s0; seen[s0] = 1
    while (read < top) {
      const i = stack[read++]!
      if (seed[i]) count.set(seed[i]!, (count.get(seed[i]!) ?? 0) + 1)
      const x = i % w
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < seed.length && !seen[j] && wall[j]! <= 0.4) { seen[j] = 1; stack[top++] = j }
    }
    if (count.size < 2) continue
    let total = 0, best = 0, bn = 0
    for (const [n, c] of count) { total += c; if (c > best) { best = c; bn = n } }
    if (best / total > 0.72) for (let q = 0; q < top; q++) if (seed[stack[q]!]) seed[stack[q]!] = bn
  }
}

export type View = "normal" | "grey" | "masks" | "regions"
export const render = async (art: Art, k: number, upto: number, view: View = "normal"): Promise<{ canvas: HTMLCanvasElement; stats: Stats }> => {
  const { ink, w, h } = await loadInk(art.src, k)
  const N = w * h
  const mk = (): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } => { const c = document.createElement("canvas"); c.width = w; c.height = h; return { c, g: c.getContext("2d", { willReadFrequently: true })! } }
  const tmp = mk()
  const trace = (g: CanvasRenderingContext2D, d: string): void => { g.beginPath(); loop(d).forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k))); g.closePath() }

  /* ---------- 0. regions ---------- */
  const wall = Float32Array.from(ink)
  tmp.g.lineWidth = 2 * k; tmp.g.lineCap = "round"
  for (const q of art.walls) { tmp.g.beginPath(); curveless(q).forEach(([x, y], i) => (i ? tmp.g.lineTo(x * k, y * k) : tmp.g.moveTo(x * k, y * k))); tmp.g.stroke() }
  const wd = tmp.g.getImageData(0, 0, w, h).data
  for (let i = 0; i < N; i++) if (wd[i * 4 + 3]! > 100) wall[i] = 1
  const { names, map } = flood(wall, w, h, art.seeds, k, vote(wall, w, h))
  for (const f of art.force) {
    let n = names.indexOf(f.label)
    if (n < 0) { names.push(f.label); n = names.length - 1 }
    const ok = f.over?.map((o) => names.indexOf(o))
    tmp.g.clearRect(0, 0, w, h); trace(tmp.g, f.d); tmp.g.fill()
    const d = tmp.g.getImageData(0, 0, w, h).data
    for (let i = 0; i < N; i++) if (d[i * 4 + 3]! > 127 && (!ok || ok.includes(map[i]!))) map[i] = n
  }
  const defs = names.map((n) => art.defs[n] ?? null)
  const tones = defs.map((d) => (d ? tone(d.color, d.kind) : null))
  const set = (gs: ReadonlyArray<string>): Uint8Array => { const t = new Uint8Array(names.length); for (const g of gs) { const i = names.indexOf(g); if (i > 0) t[i] = 1 } return t }
  const isBg = set(art.background)
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N)

  /* ---------- 1. value plan / 2. flats ---------- */
  for (let i = 0; i < N; i++) {
    const t = tones[map[i]!]
    if (!t) { R[i] = G[i] = B[i] = 255; continue }
    if (upto === 1) { const v = Math.round(Math.max(0, (t.l * 1.16 - 0.16) * 255)); R[i] = G[i] = B[i] = v } else { R[i] = t.base[0]; G[i] = t.base[1]; B[i] = t.base[2] }
    if (upto === 0) R[i] = G[i] = B[i] = 255
    if (view === "regions") { const a = map[i]! * 137.5; R[i] = 165 + 85 * Math.cos((a * Math.PI) / 180); G[i] = 165 + 85 * Math.cos(((a + 120) * Math.PI) / 180); B[i] = 165 + 85 * Math.cos(((a + 240) * Math.PI) / 180) }
  }
  const mul = (i: number, c: RGB, a: number): void => { R[i] = R[i]! * (1 + (c[0] - 1) * a); G[i] = G[i]! * (1 + (c[1] - 1) * a); B[i] = B[i]! * (1 + (c[2] - 1) * a) }
  const to = (i: number, c: RGB, a: number): void => { R[i] = R[i]! + (c[0] - R[i]!) * a; G[i] = G[i]! + (c[1] - G[i]!) * a; B[i] = B[i]! + (c[2] - B[i]!) * a }
  const wash = (stage: Wash["stage"]): void => {
    for (const q of art.washes) if (q.stage === stage) {
      const ok = set(q.on)
      for (let y = Math.max(0, Math.floor((q.y - q.ry) * k)); y < Math.min(h, (q.y + q.ry) * k); y++) for (let x = Math.max(0, Math.floor((q.x - q.rx) * k)); x < Math.min(w, (q.x + q.rx) * k); x++) {
        const i = y * w + x
        if (!ok[map[i]!]) continue
        const r = Math.hypot((x / k - q.x) / q.rx, (y / k - q.y) / q.ry)
        if (r >= 1) continue
        const a = q.a * (1 - smooth(0, 1, r))
        if (q.mode === "mix") to(i, q.color, a)
        else if (q.mode === "mul") mul(i, [q.color[0] / 255, q.color[1] / 255, q.color[2] / 255], a)
        else { R[i] = 255 - (255 - R[i]!) * (1 - (q.color[0] / 255) * a); G[i] = 255 - (255 - G[i]!) * (1 - (q.color[1] / 255) * a); B[i] = 255 - (255 - B[i]!) * (1 - (q.color[2] / 255) * a) }
      }
    }
  }

  /* ---------- 3. gradients and prints ---------- */
  if (upto >= 3) {
    for (const q of art.grads) {
      const ok = set(q.on)
      const l2 = (q.b[0] - q.a[0]) ** 2 + (q.b[1] - q.a[1]) ** 2
      for (let i = 0; i < N; i++) if (ok[map[i]!]) {
        const u = (((i % w) / k - q.a[0]) * (q.b[0] - q.a[0]) + (((i / w) | 0) / k - q.a[1]) * (q.b[1] - q.a[1])) / l2
        mul(i, q.mul, Math.max(0, Math.min(1, u)) * q.k)
      }
    }
    wash("flat")
    for (const p of art.prints) {
      const ok = set(p.on)
      tmp.g.clearRect(0, 0, w, h)
      tmp.g.save(); tmp.g.scale(k, k); p.draw(tmp.g); tmp.g.restore()
      const d = tmp.g.getImageData(0, 0, w, h).data
      for (let i = 0; i < N; i++) { const a = d[i * 4 + 3]!; if (a && ok[map[i]!]) to(i, [d[i * 4]!, d[i * 4 + 1]!, d[i * 4 + 2]!], a / 255) }
    }
    const sn = noise1("strand")
    for (let i = 0; i < N; i++) { const f = defs[map[i]!]?.strand; if (f) { const v = 1 + 0.018 * sn(f((i % w) / k, ((i / w) | 0) / k)); R[i]! *= v; G[i]! *= v; B[i]! *= v } }
  }

  /* ---------- 4. rough light: big soft volumes only ---------- */
  if (upto >= 4) {
    const q = 4
    const lw = Math.ceil(art.w / q), lh = Math.ceil(art.h / q)
    const lm = new Uint8Array(lw * lh), z = new Float32Array(lw * lh)
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) lm[y * lw + x] = map[Math.min(h - 1, Math.round((y + 0.5) * q * k)) * w + Math.min(w - 1, Math.round((x + 0.5) * q * k))]!
    for (let it = 0; it < 500; it++) for (let y = 1; y < lh - 1; y++) for (let x = 1 + ((y + it) & 1); x < lw - 1; x += 2) {
      const i = y * lw + x
      if (!defs[lm[i]!]?.vol) continue
      const n = lm[i]!
      const g = (j: number): number => (lm[j] === n ? z[j]! : 0)
      z[i] = z[i]! + 1.8 * ((g(i - 1) + g(i + 1) + g(i - lw) + g(i + lw) + 1) / 4.004 - z[i]!)
    }
    const hgt = Float32Array.from(z, (v) => Math.sqrt(Math.max(0, v) * 2))
    let nd = new Float32Array(lw * lh).fill(0)
    for (let y = 1; y < lh - 1; y++) for (let x = 1; x < lw - 1; x++) {
      const i = y * lw + x, n = lm[i]!
      const v = defs[n]?.vol ?? 0
      if (!v) continue
      const at = (j: number): number => (lm[j] === n ? hgt[j]! : 0)
      const nx = -(at(i + 1) - at(i - 1)) / 2, ny = -(at(i + lw) - at(i - lw)) / 2
      nd[i] = ((nx * LIGHT[0] + ny * LIGHT[1] + LIGHT[2]) / Math.hypot(nx, ny, 1) - LIGHT[2])
    }
    // very low frequency: this pass may never show a line
    for (let pass = 0; pass < 26; pass++) {
      const o = new Float32Array(nd)
      for (let y = 1; y < lh - 1; y++) for (let x = 1; x < lw - 1; x++) {
        const i = y * lw + x
        let s = nd[i]!, c = 1
        for (const j of [i - 1, i + 1, i - lw, i + lw]) if (lm[j] === lm[i]) { s += nd[j]!; c++ }
        o[i] = s / c
      }
      nd = o
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, n = map[i]!
      const d = defs[n], t = tones[n]
      if (!d?.vol || !t) continue
      const X = Math.max(0, Math.min(lw - 1.01, x / k / q - 0.5)), Y = Math.max(0, Math.min(lh - 1.01, y / k / q - 0.5))
      const a = X | 0, b = Y | 0, u = X - a, v = Y - b, p = b * lw + a
      let s = 0, wt = 1e-6
      for (const [o, f] of [[p, (1 - u) * (1 - v)], [p + 1, u * (1 - v)], [p + lw, (1 - u) * v], [p + lw + 1, u * v]] as const) if (lm[o] === n) { s += nd[o]! * f; wt += f }
      const e = (s / wt) * d.vol
      if (e < 0) mul(i, t.s1, Math.min(0.5, -e * 0.75))
      else to(i, t.lt, Math.min(0.42, e * 0.62))
    }
  }

  /* ---------- 5. contact: forms that overlap darken each other, with no direction ---------- */
  if (upto >= 5) {
    const zs = [...new Set(defs.flatMap((d) => (d ? [d.z] : [])))].sort((a, b) => a - b)
    const zOf = defs.map((d) => d?.z ?? -1)
    for (const level of zs.slice(0, -1)) {
      if (level <= 0) continue
      const m = new Float32Array(N)
      let any = false
      for (let i = 0; i < N; i++) if (zOf[map[i]!]! > level) { m[i] = 1; any = true }
      if (!any) continue
      const b = blur(m, w, h, 3.4 * k, 2)
      for (let i = 0; i < N; i++) if (zOf[map[i]!] === level) {
        const d = defs[map[i]!]!
        if (d.kind === "flat") continue
        mul(i, tones[map[i]!]!.s1, 0.55 * smooth(0.04, 0.5, b[i]!))
      }
    }
  }

  /* ---------- shape masks ---------- */
  const mask = (lv: ReadonlyArray<Level>): Float32Array => {
    const out = new Float32Array(N)
    const groups = new Map<string, Array<Shape>>()
    for (const s of art.shapes) if (lv.includes(s.lv)) { const key = `${s.on.join(" ")}|${s.a}`; groups.set(key, [...(groups.get(key) ?? []), s]) }
    for (const g of groups.values()) {
      const ok = set(g[0]!.on)
      tmp.g.clearRect(0, 0, w, h); tmp.g.fillStyle = "#000"
      for (const s of g) { trace(tmp.g, s.d); tmp.g.fill() }
      const d = tmp.g.getImageData(0, 0, w, h).data
      for (let i = 0; i < N; i++) if (d[i * 4 + 3]! && ok[map[i]!]) out[i] = Math.max(out[i]!, (d[i * 4 + 3]! / 255) * g[0]!.a)
    }
    return out
  }
  const m1 = upto >= 6 ? mask(["s1", "s2", "s3"]) : new Float32Array(N)
  const m2 = upto >= 6 ? mask(["s2", "s3"]) : new Float32Array(N)
  const m3 = upto >= 8 ? mask(["s3"]) : new Float32Array(N)
  if (upto >= 6) {
    const casts = art.casts.map(([a, b, d, deep]) => ({ a: set(a), b: set(b), dx: FALL[0] * d * k, dy: FALL[1] * d * k, deep }))
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, n = map[i]!
      for (const c of casts) if (c.b[n]) for (let t = 0.06; t <= 1.001; t += 0.118) {
        const X = Math.round(x - c.dx * t), Y = Math.round(y - c.dy * t)
        if (X < 0 || Y < 0 || X >= w || Y >= h) break
        if (c.a[map[Y * w + X]!]) { m1[i] = 1; if (t < c.deep) m2[i] = 1; break }
      }
    }
  }
  /** Softening that never crosses into another region. */
  const soften = (m: Float32Array, r: number): Float32Array => blur(m, w, h, Math.max(1, r * k), 2)
  let e1 = m1, e2 = m2, e3 = m3
  if (upto >= 6) {
    const kinds = defs.map((d) => (d ? EDGE[d.kind] : 0.5))
    if (upto >= 7) {
      // 7. edges: one width per material, and a few places where the edge is allowed to get lost
      const hard = soften(m1, 0.5), mid = soften(m1, 1.9), soft = soften(m1, 7)
      const reg = new Float32Array(N)
      const lost = new Float32Array(N)
      for (const [x, y, r] of art.lost) for (let yy = Math.max(0, Math.floor((y - r) * k)); yy < Math.min(h, (y + r) * k); yy++) for (let xx = Math.max(0, Math.floor((x - r) * k)); xx < Math.min(w, (x + r) * k); xx++) { const a = 1 - smooth(0.2, 1, Math.hypot(xx / k - x, yy / k - y) / r); if (a > lost[yy * w + xx]!) lost[yy * w + xx] = a }
      e1 = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        const c = kinds[map[i]!]!
        const s = smooth(0.5, 2, c)
        const base = smooth(0.4, 0.6, hard[i]!) * (1 - s) + smooth(0.12, 0.88, mid[i]!) * s
        e1[i] = base * (1 - lost[i]!) + smooth(0.06, 0.94, soft[i]!) * lost[i]!
      }
      void reg
    } else { const b = soften(m1, 0.5); e1 = Float32Array.from(b, (v) => smooth(0.4, 0.6, v)) }
    const b2 = soften(m2, 0.8), b3 = soften(m3, 0.6)
    e2 = Float32Array.from(b2, (v) => smooth(0.3, 0.7, v)); e3 = Float32Array.from(b3, (v) => smooth(0.36, 0.64, v))
    const wide = upto >= 7 ? soften(m1, 1.1) : m1
    const deepIn = upto >= 8 ? soften(m1, 12) : m1
    for (let i = 0; i < N; i++) {
      const n = map[i]!, d = defs[n], t = tones[n]
      if (!d || !t || isBg[n]) continue
      // skin: a thin saturated step where light turns into shade
      if (upto >= 7 && d.kind === "skin") to(i, t.band, 0.85 * smooth(0.06, 0.34, wide[i]!) * (1 - e1[i]!))
      mul(i, t.s1, e1[i]!)
      // shadows cool down the further they get from the light
      if (upto >= 8) { mul(i, [0.965, 0.972, 1.02], 0.9 * e1[i]! * smooth(0.45, 1, deepIn[i]!)); const r2: RGB = [t.s2[0] / t.s1[0], t.s2[1] / t.s1[1], t.s2[2] / t.s1[2]]; mul(i, r2, e2[i]!); const r3: RGB = [t.s3[0] / t.s2[0], t.s3[1] / t.s2[1], t.s3[2] / t.s2[2]]; mul(i, r3, e3[i]!) }
    }
  }

  /* ---------- 9. light planes and rim ---------- */
  const stats: Stats = {}
  let lt = new Float32Array(0), hiM = new Float32Array(0)
  if (upto >= 9) {
    lt = mask(["lt"]) as Float32Array<ArrayBuffer>
    const hard = soften(lt, 0.5), soft = soften(lt, 1.1)
    for (let i = 0; i < N; i++) {
      const n = map[i]!, d = defs[n], t = tones[n]
      if (!d || !t || isBg[n]) continue
      const crisp = d.kind === "hair" || d.kind === "horn" || d.kind === "metal" || d.kind === "gem" || d.kind === "skin"
      const a = (crisp ? smooth(0.2, 0.8, hard[i]!) * Math.min(1, lt[i]! > 0 ? lt[i]! * 1.2 : 1) : soft[i]! * 0.86) * (1 - e1[i]! * 0.85)
      to(i, t.lt, a)
    }
    const rn = noise1("rim")
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, n = map[i]!, d = defs[n], t = tones[n]
      if (!d?.rim || !t || e1[i]! < 0.5) continue
      const r = d.rim * (0.8 + 0.5 * rn((x + y * 1.7) / (k * 46))) * k
      let hit = false
      for (let s = 1; s <= 2; s++) { const X = Math.round(x + FALL[0] * r * (s / 2)), Y = Math.round(y + FALL[1] * r * (s / 2)); if (X >= 0 && Y >= 0 && X < w && Y < h && isBg[map[Y * w + X]!]) hit = true }
      if (hit) to(i, t.rim, 0.78)
    }
  }
  /* ---------- 10. speculars ---------- */
  if (upto >= 10) {
    hiM = mask(["hi"]) as Float32Array<ArrayBuffer>
    const b = soften(hiM, 0.4)
    for (let i = 0; i < N; i++) { const t = tones[map[i]!]; if (t && b[i]! > 0.05) to(i, t.hi, smooth(0.15, 0.75, b[i]!)) }
  }
  if (upto >= 11) wash("late")
  for (let i = 0; i < N; i++) {
    const s = (stats[names[map[i]!]!] ??= { area: 0, s1: 0, s2: 0, lt: 0, hi: 0 })
    s.area++
    if (e1[i]! > 0.5) s.s1++
    if (e2[i]! > 0.5) s.s2++
    if (lt.length && lt[i]! > 0.4) s.lt++
    if (hiM.length && hiM[i]! > 0.4) s.hi++
  }

  if (view === "masks") for (let i = 0; i < N; i++) { const n = map[i]!; const v = isBg[n] ? 160 : e3[i]! > 0.5 ? 0 : e2[i]! > 0.5 ? 50 : e1[i]! > 0.5 ? 105 : 250; R[i] = G[i] = B[i] = v }

  /* ---------- keyline between overlapping parts ---------- */
  const sil = (() => { const f = new Float32Array(N); for (let i = 0; i < N; i++) f[i] = isBg[map[i]!] ? 0 : 1; return blur(f, w, h, 3 * k, 1) })()
  const img = new ImageData(w, h)
  const grainA = rng("grain")
  const gf = new Float32Array(N)
  for (let i = 0; i < N; i++) gf[i] = grainA() - 0.5
  const grain = blur(gf, w, h, 1, 1)
  for (let i = 0; i < N; i++) {
    const d = defs[map[i]!]
    const gr = upto >= 14 && d ? grain[i]! * GRAIN[d.kind] * 1.5 : 0
    img.data[i * 4] = R[i]! + gr; img.data[i * 4 + 1] = G[i]! + gr; img.data[i * 4 + 2] = B[i]! + gr; img.data[i * 4 + 3] = 255
  }
  const col = mk()
  col.g.putImageData(img, 0, 0)
  if (upto >= 11 && view === "normal") { col.g.save(); col.g.scale(k, k); art.face(col.g); col.g.restore() }
  if (upto >= 13 && view === "normal") {
    // backdrop lives only where the background is
    const bk = mk()
    bk.g.save(); bk.g.scale(k, k); art.backdrop(bk.g); bk.g.restore()
    const d = bk.g.getImageData(0, 0, w, h)
    for (let i = 0; i < N; i++) if (!isBg[map[i]!]) d.data[i * 4 + 3] = 0
    bk.g.putImageData(d, 0, 0)
    col.g.drawImage(bk.c, 0, 0)
  }

  /* ---------- 12. line ---------- */
  const li = new ImageData(w, h)
  let halo: Float32Array | null = null
  const hs = set(art.halo)
  if (upto >= 12) { const m = new Float32Array(N); for (let i = 0; i < N; i++) if (hs[map[i]!]) m[i] = 1; halo = blur(m, w, h, 2.2 * k, 2) }
  const thick = blur(ink, w, h, 2.3 * k, 1)
  for (let i = 0; i < N; i++) {
    const n = map[i]!
    const t = tones[n]
    let a = smooth(0.2, 0.62, ink[i]!)
    let c: RGB = [20, 16, 26]
    if (upto >= 12 && t) {
      const inner = isBg[n] ? 0 : smooth(0.86, 1, sil[i]!)
      c = isBg[n] ? mix([20, 16, 26], t.ink, sil[i]! > 0.02 ? 0 : 0.55) : mix([20, 16, 26], t.ink, inner)
      // where the artist filled solid black, keep it: lashes, pupils, the neck wedge
      c = mix(c, [24, 12, 22], Math.max(smooth(0.62, 0.85, thick[i]!), names[n] === "eyeW" ? 1 : 0))
      if (halo && !hs[n] && !isBg[n]) { const q = smooth(0.1, 0.17, halo[i]!) * (1 - smooth(0.25, 0.33, halo[i]!)); if (q > 0.02) { c = mix(c, [240, 236, 234], q); a = Math.max(a * (1 - q), q * 0.9) } }
    }
    if (a <= 0) continue
    li.data[i * 4] = c[0]; li.data[i * 4 + 1] = c[1]; li.data[i * 4 + 2] = c[2]; li.data[i * 4 + 3] = a * 255
  }
  if (view !== "masks" || true) { const ic = mk(); ic.g.putImageData(li, 0, 0); if (view === "masks") col.g.globalAlpha = 0.35; col.g.drawImage(ic.c, 0, 0); col.g.globalAlpha = 1 }
  if (upto >= 12 && view === "normal") { col.g.save(); col.g.scale(k, k); art.over(col.g); col.g.restore() }

  /* ---------- 14. effects and finish ---------- */
  if (upto >= 14 && view !== "masks") {
    col.g.save(); col.g.scale(k, k); art.effects(col.g); col.g.restore()
    const q = 4
    const gw = Math.round(w / q), gh = Math.round(h / q)
    const small = document.createElement("canvas"); small.width = gw; small.height = gh
    const sg = small.getContext("2d", { willReadFrequently: true })!
    sg.imageSmoothingQuality = "high"
    sg.drawImage(col.c, 0, 0, gw, gh)
    const sd = sg.getImageData(0, 0, gw, gh)
    const ch = [0, 1, 2].map((o) => { const f = new Float32Array(gw * gh); for (let i = 0; i < f.length; i++) { const l = (sd.data[i * 4]! * 0.3 + sd.data[i * 4 + 1]! * 0.59 + sd.data[i * 4 + 2]! * 0.11) / 255; f[i] = sd.data[i * 4 + o]! * smooth(0.72, 0.96, l) } return blur(f, gw, gh, (art.w * 0.026 * k) / q, 2) })
    for (let i = 0; i < gw * gh; i++) { sd.data[i * 4] = ch[0]![i]!; sd.data[i * 4 + 1] = ch[1]![i]! * 0.96; sd.data[i * 4 + 2] = ch[2]![i]! * 0.9; sd.data[i * 4 + 3] = 255 }
    sg.putImageData(sd, 0, 0)
    col.g.globalCompositeOperation = "screen"; col.g.globalAlpha = 0.2
    col.g.drawImage(small, 0, 0, w, h)
    col.g.globalAlpha = 1
    // one air for the whole page: warm where the light enters, cold where it leaves
    col.g.globalCompositeOperation = "soft-light"
    const wg = col.g.createRadialGradient(w * 0.1, h * 0.04, 0, w * 0.1, h * 0.04, w * 1.05)
    wg.addColorStop(0, "rgba(255,214,150,.42)"); wg.addColorStop(1, "rgba(255,214,150,0)")
    col.g.fillStyle = wg; col.g.fillRect(0, 0, w, h)
    const cg = col.g.createRadialGradient(w, h, 0, w, h, w * 1.15)
    cg.addColorStop(0, "rgba(58,62,150,.4)"); cg.addColorStop(1, "rgba(58,62,150,0)")
    col.g.fillStyle = cg; col.g.fillRect(0, 0, w, h)
    col.g.globalCompositeOperation = "source-over"
  }
  if (view === "grey") { const d = col.g.getImageData(0, 0, w, h); for (let i = 0; i < N; i++) { const v = d.data[i * 4]! * 0.3 + d.data[i * 4 + 1]! * 0.59 + d.data[i * 4 + 2]! * 0.11; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v } col.g.putImageData(d, 0, 0) }
  return { canvas: col.c, stats }
}
