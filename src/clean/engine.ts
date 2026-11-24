/** Clean line art -> lit cel illustration. One light for everything. */
import { loop } from "../cel/path.ts"
import { noise1, rng, smooth } from "../geo.ts"
import { blur, flood } from "../lineart/flood.ts"
import { loadInk } from "../lineart/main.ts"
import type { Seed } from "../lineart/seeds.ts"
import { curveless } from "../lineart/poly.ts"
import { mix, ramp } from "./ramp.ts"
import type { MatKind, RGB } from "./ramp.ts"

export type Def = {
  color: string; kind: MatKind
  /** How much the inflated form decides the shading (0 = authored only), and how strongly inner lines crease it. */
  form?: number; crease?: number
  /** ndl thresholds: light above, s1 below, s2 below. */
  t?: readonly [number, number, number]
  smear?: number; lit?: number; rim?: number
  /** Strand field for hair: streaks follow it. */
  strand?: (x: number, y: number) => number
  strandAmp?: number
}
export type Form = { lv: "1" | "2" | "3" | "L" | "H"; on: ReadonlyArray<string>; d: string }
export type Cast = readonly [ReadonlyArray<string>, ReadonlyArray<string>, number]
export type Art = {
  src: string; w: number; h: number
  seeds: ReadonlyArray<Seed>; walls: ReadonlyArray<string>; force: ReadonlyArray<{ label: string; d: string; over?: ReadonlyArray<string> }>
  defs: Readonly<Record<string, Def>>; casts: ReadonlyArray<Cast>; forms: ReadonlyArray<Form>
  grads: ReadonlyArray<{ on: ReadonlyArray<string>; a: readonly [number, number]; b: readonly [number, number]; color: RGB; k: number }>
  background: ReadonlyArray<string>
  under: (g: CanvasRenderingContext2D) => void
  over: (g: CanvasRenderingContext2D) => void
}
/** Towards the light. x right, y down, z to the viewer. */
export const LIGHT = [-0.6, -0.62, 0.505] as const
const L2 = Math.hypot(LIGHT[0], LIGHT[1])
const FALL: readonly [number, number] = [-LIGHT[0] / L2, -LIGHT[1] / L2]

export type Pass = "flat" | "form" | "light" | "final" | "regions"

/**
 * Clean art has closed shapes: one shape, one colour. Where a stray seed landed in someone
 * else's shape it is outvoted; shapes that really are shared keep every seed and flood.
 */
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

export const renderArt = async (art: Art, k: number, pass: Pass = "final"): Promise<HTMLCanvasElement> => {
  const { ink, w, h } = await loadInk(art.src, k)
  const N = w * h
  const mk = (): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } => { const c = document.createElement("canvas"); c.width = w; c.height = h; return { c, g: c.getContext("2d", { willReadFrequently: true })! } }
  const brush = mk()
  const raster = (d: string): Uint8ClampedArray => {
    brush.g.clearRect(0, 0, w, h)
    brush.g.fillStyle = "#000"
    brush.g.beginPath()
    loop(d).forEach(([x, y], i) => (i ? brush.g.lineTo(x * k, y * k) : brush.g.moveTo(x * k, y * k)))
    brush.g.fill()
    return brush.g.getImageData(0, 0, w, h).data
  }
  // walls close forms the artist left open; they guide the flood but are not drawn
  const barrier = Float32Array.from(ink)
  brush.g.lineWidth = 2 * k; brush.g.lineCap = "round"; brush.g.strokeStyle = "#000"
  for (const q of art.walls) { brush.g.beginPath(); curveless(q).forEach(([x, y], i) => (i ? brush.g.lineTo(x * k, y * k) : brush.g.moveTo(x * k, y * k))); brush.g.stroke() }
  const wd = brush.g.getImageData(0, 0, w, h).data
  for (let i = 0; i < N; i++) if (wd[i * 4 + 3]! > 100) barrier[i] = 1
  const { names, map } = flood(barrier, w, h, art.seeds, k, vote(barrier, w, h))
  for (const f of art.force) {
    const n = names.indexOf(f.label)
    const ok = f.over?.map((o) => names.indexOf(o))
    const d = raster(f.d)
    for (let i = 0; i < N; i++) if (d[i * 4 + 3]! > 127 && (!ok || ok.includes(map[i]!))) map[i] = n
  }
  const defs = names.map((n) => art.defs[n] ?? null)
  const set = (gs: ReadonlyArray<string>): Uint8Array => { const t = new Uint8Array(names.length); for (const g of gs) { const i = names.indexOf(g); if (i > 0) t[i] = 1 } return t }
  const isBg = set(art.background)

  // ---- inflate: Poisson height per region at 1/(2k) scale, lines inside a region crease it
  const q = 2
  const lw = Math.floor(art.w / q) , lh = Math.floor(art.h / q)
  const lm = new Uint8Array(lw * lh), li = new Float32Array(lw * lh), z = new Float32Array(lw * lh)
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    lm[y * lw + x] = map[Math.min(h - 1, Math.round((y + 0.5) * q * k)) * w + Math.min(w - 1, Math.round((x + 0.5) * q * k))]!
    let m = 0
    for (let a = 0; a < q; a++) for (let b = 0; b < q; b++) m = Math.max(m, ink[Math.min(h - 1, Math.round((y * q + a + 0.5) * k)) * w + Math.min(w - 1, Math.round((x * q + b + 0.5) * k))]!)
    li[y * lw + x] = m
  }
  for (let it = 0; it < 700; it++) for (let y = 1; y < lh - 1; y++) for (let x = 1 + ((y + it) & 1); x < lw - 1; x += 2) {
    const i = y * lw + x
    const n = lm[i]!
    const d = defs[n]
    if (!d || !d.form) continue
    const g = (j: number): number => (lm[j] === n ? z[j]! : 0)
    const s = g(i - 1) + g(i + 1) + g(i - lw) + g(i + lw)
    const v = (s + 1) / (4 + (d.crease ?? 0.3) * li[i]! + 0.0025)
    z[i] = z[i]! + 1.9 * (v - z[i]!)
  }
  let nz: Float32Array = new Float32Array(lw * lh)
  for (let i = 0; i < nz.length; i++) nz[i] = Math.sqrt(Math.max(0, z[i]!) * 2)
  let ndlL: Float32Array = new Float32Array(lw * lh)
  for (let y = 1; y < lh - 1; y++) for (let x = 1; x < lw - 1; x++) {
    const i = y * lw + x
    const n = lm[i]!
    const at = (j: number): number => (lm[j] === n ? nz[j]! : 0)
    const gx = (at(i + 1) - at(i - 1)) / 2, gy = (at(i + lw) - at(i - lw)) / 2
    const f = defs[n]?.form ?? 0
    const nx = -gx * f, ny = -gy * f
    const l = Math.hypot(nx, ny, 1)
    ndlL[i] = (nx * LIGHT[0] + ny * LIGHT[1] + LIGHT[2]) / l
  }
  // smooth inside each region only: a neighbour's light must not leak over a contour
  for (let pass2 = 0; pass2 < 7; pass2++) {
    const o = new Float32Array(ndlL)
    for (let y = 1; y < lh - 1; y++) for (let x = 1; x < lw - 1; x++) {
      const i = y * lw + x
      let sum = ndlL[i]! * 2, wt = 2
      for (const j of [i - 1, i + 1, i - lw, i + lw]) if (lm[j] === lm[i]) { sum += ndlL[j]!; wt++ }
      o[i] = sum / wt
    }
    ndlL = o
  }
  const ndl = (x: number, y: number, n: number): number => {
    const X = Math.max(0, Math.min(lw - 1.01, x / k / q - 0.5)), Y = Math.max(0, Math.min(lh - 1.01, y / k / q - 0.5))
    const i = X | 0, j = Y | 0, u = X - i, v = Y - j, p = j * lw + i
    let sum = 0, wt = 1e-6
    for (const [o, t] of [[p, (1 - u) * (1 - v)], [p + 1, u * (1 - v)], [p + lw, (1 - u) * v], [p + lw + 1, u * v]] as const) if (lm[o] === n) { sum += ndlL[o]! * t; wt += t }
    return wt > 0.001 ? sum / wt : 0.5
  }

  // ---- masks
  const m1 = new Float32Array(N), m2 = new Float32Array(N), m3 = new Float32Array(N), ml = new Float32Array(N), mh = new Float32Array(N), mb = new Float32Array(N)
  const casts = art.casts.map(([a, b, d]) => ({ a: set(a), b: set(b), dx: FALL[0] * d * k, dy: FALL[1] * d * k }))
  const strandNoise = noise1("strand"), strandFine = noise1("fine")
  const lit = pass === "light" || pass === "final"
  if (pass !== "flat" && pass !== "regions") for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    const n = map[i]!
    const d = defs[n]
    if (!d) continue
    const at = (dx: number, dy: number): number => { const X = Math.round(x + dx), Y = Math.round(y + dy); return X < 0 || Y < 0 || X >= w || Y >= h ? -1 : Y * w + X }
    let lv = 0
    let blocked = false
    // cast: far = s1, the first 45% of it = s2 (contact)
    for (const c of casts) if (c.b[n]) {
      for (let t = 0.08; t <= 1.001; t += 0.115) {
        const j = at(-c.dx * t, -c.dy * t)
        if (j >= 0 && c.a[map[j]!]) { lv = Math.max(lv, t < 0.46 && d.kind !== "flat" ? 2 : 1); blocked = true; break }
      }
    }
    if (d.kind !== "flat") {
      let v = d.form ? ndl(x, y, n) : 0.5
      if (d.strand) { const u = d.strand(x / k, y / k); v += (strandNoise(u) * 0.65 + strandFine(u * 2.7) * 0.4) * (d.strandAmp ?? 0.2) }
      const [tl, t1, t2] = d.t ?? [0.86, 0.36, 0.04]
      if (d.form) {
        if (v < t2) lv = Math.max(lv, 2)
        else if (v < t1) lv = Math.max(lv, 1)
        if (v > tl && !blocked && lit) ml[i] = 1
      }
      // shade tucked behind each inner line, on the side away from the light
      if (d.smear && lv < 2) {
        const W = d.smear * k
        for (let t = 1.5; t < W; t++) {
          const j = at(-FALL[0] * t, -FALL[1] * t)
          if (j < 0) break
          if (ink[j]! > 0.35 + 0.55 * (t / W) && map[j] === n) {
            // a contour facing the light is not a crease: past a crease there is more of the same region
            const past = at(-FALL[0] * (t + 7 * k), -FALL[1] * (t + 7 * k))
            if (past < 0 || map[past] !== n) break
            lv = Math.max(lv, t < W * 0.3 ? 2 : 1); break }
        }
      }
      // edges that face the light, and cold bounce on edges that face away
      if (d.lit && !blocked && lv === 0 && lit) { const j = at(-FALL[0] * d.lit * k, -FALL[1] * d.lit * k); if (j >= 0 && map[j] !== n && isBg[map[j]!]) ml[i] = 1 }
      if (d.rim && lit) { const j = at(FALL[0] * d.rim * k, FALL[1] * d.rim * k); if (j >= 0 && map[j] !== n && !isBg[n]) mb[i] = isBg[map[j]!] ? 1 : 0.45 }
    }
    if (lv >= 1) m1[i] = 1
    if (lv >= 2) m2[i] = 1
  }
  if (pass !== "flat" && pass !== "regions") for (const f of art.forms) {
    if (!lit && (f.lv === "L" || f.lv === "H")) continue
    const ok = set(f.on)
    const d = raster(f.d)
    for (let i = 0; i < N; i++) if (d[i * 4 + 3]! > 127 && ok[map[i]!]) {
      if (f.lv === "L") ml[i] = 1
      else if (f.lv === "H") mh[i] = 1
      else { m1[i] = 1; if (f.lv !== "1") m2[i] = 1; if (f.lv === "3") m3[i] = 1 }
    }
  }
  // keep each mask inside its own region when softening: blur(mask)/blur(region) is overkill at these radii
  const E = 1.1 * k
  const b1 = blur(m1, w, h, E, 2), b2 = blur(m2, w, h, E, 2), b3 = blur(m3, w, h, E, 2), bl = blur(ml, w, h, E, 2), bh = blur(mh, w, h, 0.7 * k, 2), bb = blur(mb, w, h, 0.6 * k, 1)
  const wide1 = blur(m1, w, h, 10 * k, 2)

  const ramps = defs.map((d) => (d ? ramp(d.color, d.kind) : null))
  const grads = art.grads.map((g) => ({ ok: set(g.on), g, l2: (g.b[0] - g.a[0]) ** 2 + (g.b[1] - g.a[1]) ** 2 }))
  const r = rng("grain")
  const nf = new Float32Array(N)
  for (let i = 0; i < N; i++) nf[i] = r() - 0.5
  const grain = blur(nf, w, h, 1, 1)
  const out = new ImageData(w, h)
  for (let i = 0; i < N; i++) {
    const n = map[i]!
    const d = defs[n], t = ramps[n]
    if (!d || !t) { out.data[i * 4] = 255; out.data[i * 4 + 3] = 255; continue }
    const x = (i % w) / k, y = ((i / w) | 0) / k
    if (pass === "regions") { const a = n * 137.5; for (let q2 = 0; q2 < 3; q2++) out.data[i * 4 + q2] = 165 + 85 * Math.cos(((a + q2 * 120) * Math.PI) / 180); out.data[i * 4 + 3] = 255; continue }
    let gk = 0
    let gc: RGB = t.base
    for (const g of grads) if (g.ok[n]) { const u = ((x - g.g.a[0]) * (g.g.b[0] - g.g.a[0]) + (y - g.g.a[1]) * (g.g.b[1] - g.g.a[1])) / g.l2; gk = Math.max(0, Math.min(1, u)) * g.g.k; gc = g.g.color }
    const mulTint = (c: RGB): RGB => (gk <= 0 ? c : mix(c, [c[0] * gc[0] / 255, c[1] * gc[1] / 255, c[2] * gc[2] / 255], gk))
    let c: RGB = t.base
    const sharp: readonly [number, number] = d.kind === "cloth" ? [0.34, 0.66] : [0.42, 0.58]
    const a1 = smooth(sharp[0], sharp[1], b1[i]!), a2 = smooth(sharp[0], sharp[1], b2[i]!), a3 = smooth(0.42, 0.58, b3[i]!), al = smooth(0.42, 0.58, bl[i]!)
    if (d.kind !== "flat") {
      c = mix(c, t.light, al * (1 - a1) * (d.kind === "skin" ? 0.85 : 1))
      // saturated terminator where light turns into shade
      if (lit) c = mix(c, t.edge, (d.kind === "skin" ? 0.9 : 0.45) * smooth(0.1, 0.4, b1[i]!) * (1 - a1))
    }
    const sh = lit ? mix(t.s1, t.cold, smooth(0.35, 0.95, wide1[i]!)) : t.s1
    c = mix(c, sh, a1)
    c = mix(c, t.s2, a2)
    c = mix(c, t.s3, a3)
    if (lit) { c = mix(c, t.bounce, 0.75 * Math.min(1, bb[i]!) * a1); c = mix(c, t.hi, smooth(0.4, 0.6, bh[i]!)) }
    c = mulTint(c)
    const gr = lit ? grain[i]! * (d.kind === "skin" ? 4 : 11) : 0
    out.data[i * 4] = c[0] + gr; out.data[i * 4 + 1] = c[1] + gr; out.data[i * 4 + 2] = c[2] + gr; out.data[i * 4 + 3] = 255
  }
  const col = mk()
  col.g.putImageData(out, 0, 0)
  if (lit) {
    col.g.save(); col.g.scale(k, k); art.under(col.g); col.g.restore()
  }
  // ---- coloured line art: near black at the silhouette, the local colour's own dark inside
  const fig = new Float32Array(N)
  for (let i = 0; i < N; i++) fig[i] = isBg[map[i]!] ? 0 : 1
  const sil = blur(fig, w, h, 3 * k, 1)
  const inkC = new ImageData(w, h)
  for (let i = 0; i < N; i++) {
    const a = smooth(0.22, 0.6, ink[i]!)
    if (a <= 0) continue
    const n = map[i]!
    const t = ramps[n]
    const black: RGB = [18, 14, 26]
    const edge = isBg[n] ? 0 : smooth(0.9, 1, sil[i]!)
    const c = !t || pass === "regions" ? black : isBg[n] ? mix(black, t.line, sil[i]! > 0.03 ? 0 : 0.75) : mix(black, t.line, edge * 0.85)
    inkC.data[i * 4] = c[0]; inkC.data[i * 4 + 1] = c[1]; inkC.data[i * 4 + 2] = c[2]; inkC.data[i * 4 + 3] = a * 255
  }
  const ic = mk()
  ic.g.putImageData(inkC, 0, 0)
  col.g.drawImage(ic.c, 0, 0)
  if (lit) {
    col.g.save(); col.g.scale(k, k); art.over(col.g); col.g.restore()
    // the whole page leans the same way: warm where the light comes from, cold where it ends
    const W = w, Hh = h
    const wg = col.g.createRadialGradient(W * 0.12, Hh * 0.06, 0, W * 0.12, Hh * 0.06, W * 1.1)
    wg.addColorStop(0, "rgba(255,206,130,.34)"); wg.addColorStop(1, "rgba(255,206,130,0)")
    col.g.globalCompositeOperation = "soft-light"
    col.g.fillStyle = wg; col.g.fillRect(0, 0, W, Hh)
    const cgx = col.g.createRadialGradient(W * 1.0, Hh * 1.0, 0, W, Hh, W * 1.2)
    cgx.addColorStop(0, "rgba(70,70,190,.3)"); cgx.addColorStop(1, "rgba(70,70,190,0)")
    col.g.fillStyle = cgx; col.g.fillRect(0, 0, W, Hh)
    col.g.globalCompositeOperation = "source-over"
  }
  return col.c
}
