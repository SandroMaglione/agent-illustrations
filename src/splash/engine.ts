/** Passes as in docs/rendering-steps.md, with the splash reference's shading model inside each one. */
import { loop } from "../cel/path.ts"
import { rng, smooth } from "../geo.ts"
import { blur, flood } from "../lineart/flood.ts"
import { loadInk } from "../lineart/main.ts"
import { curveless } from "../lineart/poly.ts"
import type { Seed } from "../lineart/seeds.ts"
import { hsv, mix, tone } from "./tones.ts"
import type { Kind, RGB } from "./tones.ts"

export type Level = "s1" | "s2" | "s3" | "form" | "lt" | "sheen" | "ring" | "hi" | "lift"
export type Shape = { lv: Level; on: ReadonlyArray<string>; d: string; a: number }
export type Wash = { late?: boolean; on: ReadonlyArray<string>; x: number; y: number; rx: number; ry: number; color: RGB; a: number; mode?: "mix" | "mul" }
export type Art = {
  /** Head height in line-art px (crown to chin): line weight and key lines are judged against it. */
  head: number
  /** Small accessories that must read as their own silhouette: they get a pale key line where they overlap the figure. */
  keyline?: ReadonlyArray<string>
  src: string; w: number; h: number; seeds: ReadonlyArray<Seed>; walls: ReadonlyArray<string>
  force: ReadonlyArray<{ label: string; d: string; over?: ReadonlyArray<string> }>
  defs: Readonly<Record<string, { color: string; kind: Kind; z: number; rim?: number; grain?: number }>>
  grads: ReadonlyArray<{ on: ReadonlyArray<string>; a: readonly [number, number]; b: readonly [number, number]; to: RGB; k: number }>
  casts: ReadonlyArray<readonly [ReadonlyArray<string>, ReadonlyArray<string>, number]>
  shapes: ReadonlyArray<Shape>; soft: ReadonlyArray<readonly [number, number, number]>; washes: ReadonlyArray<Wash>
  noink: ReadonlyArray<string>
  face: (g: CanvasRenderingContext2D) => void; over: (g: CanvasRenderingContext2D) => void
  back: (g: CanvasRenderingContext2D) => void; front: (g: CanvasRenderingContext2D) => void
}
export const PASSES = ["Line art", "Flats", "Gradients", "Contact", "Shadow shapes", "Edges and warm band", "Deep shade", "Ring and light shapes", "Face and eyes", "Colour line", "Finish"] as const
export const FALL: readonly [number, number] = [0.5, 0.866]
export type View = "normal" | "grey" | "masks" | "regions"

const vote = (wall: Float32Array, w: number, h: number) => (seed: Uint8Array): void => {
  const seen = new Uint8Array(w * h), stack = new Int32Array(w * h)
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
    if (best / total > 0.86) for (let q = 0; q < top; q++) if (seed[stack[q]!]) seed[stack[q]!] = bn
  }
}

/** Distance in px from each ink pixel to the edge of its stroke (two-pass chamfer). */
const distance = (ink: Float32Array, w: number, h: number): Float32Array => {
  const d = new Float32Array(w * h)
  for (let i = 0; i < d.length; i++) d[i] = ink[i]! > 0.93 ? 1e6 : ink[i]! > 0.06 ? ink[i]! : 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!d[i]) continue; if (x) d[i] = Math.min(d[i]!, d[i - 1]! + 1); if (y) { d[i] = Math.min(d[i]!, d[i - w]! + 1); if (x) d[i] = Math.min(d[i]!, d[i - w - 1]! + 1.414); if (x < w - 1) d[i] = Math.min(d[i]!, d[i - w + 1]! + 1.414) } }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!d[i]) continue; if (x < w - 1) d[i] = Math.min(d[i]!, d[i + 1]! + 1); if (y < h - 1) { d[i] = Math.min(d[i]!, d[i + w]! + 1); if (x < w - 1) d[i] = Math.min(d[i]!, d[i + w + 1]! + 1.414); if (x) d[i] = Math.min(d[i]!, d[i + w - 1]! + 1.414) } }
  return d
}
/** Separable maximum over a square of radius r. */
const maxFilter = (src: Float32Array, w: number, h: number, r: number): Float32Array => {
  const run = (a: Float32Array, n: number, m: number, step: number, jump: number): Float32Array => {
    const o = new Float32Array(a.length)
    const dq = new Int32Array(m)
    for (let j = 0; j < n; j++) {
      const at = j * jump
      let head = 0, tail = 0
      for (let i = 0; i < m + r; i++) {
        if (i < m) { const v = a[at + i * step]!; while (tail > head && a[at + dq[tail - 1]! * step]! <= v) tail--; dq[tail++] = i }
        const c = i - r
        if (c >= 0) { while (dq[head]! < c - r) head++; o[at + c * step] = a[at + dq[head]! * step]! }
      }
    }
    return o
  }
  return run(run(src, h, w, 1, w), w, h, w, 1)
}

export const render = async (art: Art, k: number, upto: number, view: View = "normal"): Promise<{ canvas: HTMLCanvasElement; stats: Record<string, number> }> => {
  const { ink, w, h } = await loadInk(art.src, k)
  const N = w * h
  const mk = (): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } => { const c = document.createElement("canvas"); c.width = w; c.height = h; return { c, g: c.getContext("2d", { willReadFrequently: true })! } }
  const tmp = mk()
  const trace = (g: CanvasRenderingContext2D, d: string): void => { g.beginPath(); loop(d).forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k))); g.closePath() }
  const alphaOf = (): Uint8ClampedArray => tmp.g.getImageData(0, 0, w, h).data

  /* regions */
  const wall = Float32Array.from(ink)
  tmp.g.lineWidth = 2.2 * k; tmp.g.lineCap = "round"
  for (const q of art.walls) { tmp.g.beginPath(); curveless(q).forEach(([x, y], i) => (i ? tmp.g.lineTo(x * k, y * k) : tmp.g.moveTo(x * k, y * k))); tmp.g.stroke() }
  const wd = alphaOf()
  for (let i = 0; i < N; i++) if (wd[i * 4 + 3]! > 100) wall[i] = 1
  const { names, map } = flood(wall, w, h, art.seeds, k, vote(wall, w, h))
  // under thick ink two floods meet in a comb; a majority vote makes every hidden border one clean edge
  for (let pass = 0; pass < 3; pass++) {
    const src = map.slice()
    const count = new Uint16Array(256)
    const r = Math.max(1, Math.round(1.3 * k))
    for (let y = r; y < h - r; y++) for (let x = r; x < w - r; x++) {
      const i = y * w + x
      if (ink[i]! < 0.25 || src[i] === 0) continue
      // the figure may grow into the page under the ink, never shrink: thin hair tips survive
      const page = names[src[i]!] === "bg"
      let best = src[i]!, bn = 0
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const q = src[i + dy * w + dx]!; if (!page && names[q] === "bg") continue; const c = ++count[q]!; if (c > bn || (c === bn && q === src[i])) { bn = c; best = q } }
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) count[src[i + dy * w + dx]!] = 0
      map[i] = best
    }
  }
  for (const f of art.force) {
    let n = names.indexOf(f.label)
    if (n < 0) { names.push(f.label); n = names.length - 1 }
    const ok = f.over?.map((o) => names.indexOf(o))
    tmp.g.clearRect(0, 0, w, h); trace(tmp.g, f.d); tmp.g.fill()
    const d = alphaOf()
    for (let i = 0; i < N; i++) if (d[i * 4 + 3]! > 127 && (!ok || ok.includes(map[i]!))) map[i] = n
  }
  const defs = names.map((n) => art.defs[n] ?? null)
  const tones = defs.map((d) => (d ? tone(d.color, d.kind) : null))
  const set = (gs: ReadonlyArray<string>): Uint8Array => { const t = new Uint8Array(names.length); for (const g of gs) { const i = names.indexOf(g); if (i > 0) t[i] = 1 } return t }
  const bg = names.indexOf("bg")
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const t = tones[map[i]!]
    if (view === "regions") { const a = map[i]! * 137.5; R[i] = 165 + 85 * Math.cos((a * Math.PI) / 180); G[i] = 165 + 85 * Math.cos(((a + 120) * Math.PI) / 180); B[i] = 165 + 85 * Math.cos(((a + 240) * Math.PI) / 180); continue }
    const c: RGB = !t || upto === 0 || map[i] === bg ? [255, 255, 255] : t.base
    R[i] = c[0]; G[i] = c[1]; B[i] = c[2]
  }
  const to = (i: number, c: RGB, a: number): void => { R[i] = R[i]! + (c[0] - R[i]!) * a; G[i] = G[i]! + (c[1] - G[i]!) * a; B[i] = B[i]! + (c[2] - B[i]!) * a }
  const mulc = (i: number, c: RGB, a: number): void => { R[i] = R[i]! * (1 + (c[0] / 255 - 1) * a); G[i] = G[i]! * (1 + (c[1] / 255 - 1) * a); B[i] = B[i]! * (1 + (c[2] / 255 - 1) * a) }
  /** Shade as a ratio of the part's own base, so gradients and washes below survive. */
  const shadeTo = (i: number, from: RGB, s: RGB, a: number): void => { R[i] = R[i]! * (1 + (s[0] / Math.max(8, from[0]) - 1) * a); G[i] = G[i]! * (1 + (s[1] / Math.max(8, from[1]) - 1) * a); B[i] = B[i]! * (1 + (s[2] / Math.max(8, from[2]) - 1) * a) }
  const wash = (late: boolean): void => {
    for (const q of art.washes) if (Boolean(q.late) === late) {
      const ok = set(q.on)
      for (let y = Math.max(0, Math.floor((q.y - q.ry) * k)); y < Math.min(h, (q.y + q.ry) * k); y++) for (let x = Math.max(0, Math.floor((q.x - q.rx) * k)); x < Math.min(w, (q.x + q.rx) * k); x++) {
        const i = y * w + x
        if (!ok[map[i]!]) continue
        const r = Math.hypot((x / k - q.x) / q.rx, (y / k - q.y) / q.ry)
        if (r >= 1) continue
        const a = q.a * (1 - smooth(0, 1, r))
        if (q.mode === "mul") mulc(i, q.color, a)
        else to(i, q.color, a)
      }
    }
  }
  if (upto >= 2) {
    for (const q of art.grads) {
      const ok = set(q.on), l2 = (q.b[0] - q.a[0]) ** 2 + (q.b[1] - q.a[1]) ** 2
      for (let i = 0; i < N; i++) if (ok[map[i]!]) { const u = (((i % w) / k - q.a[0]) * (q.b[0] - q.a[0]) + (((i / w) | 0) / k - q.a[1]) * (q.b[1] - q.a[1])) / l2; to(i, q.to, smooth(0, 1, u) * q.k) }
    }
    wash(false)
  }
  /* contact: soft and dark right beside an overlap, hair against everything above it */
  if (upto >= 3) {
    const zOf = defs.map((d) => d?.z ?? -1)
    for (const level of [...new Set(zOf)].sort((a, b) => a - b)) {
      if (level <= 0) continue
      const m = new Float32Array(N)
      for (let i = 0; i < N; i++) if (zOf[map[i]!]! > level) m[i] = 1
      const b = blur(m, w, h, 3.6 * k, 2)
      for (let i = 0; i < N; i++) if (zOf[map[i]!] === level) { const t = tones[map[i]!]!; shadeTo(i, t.base, t.ao, 0.5 * smooth(0.06, 0.55, b[i]!)) }
    }
  }
  const mask = (lv: ReadonlyArray<Level>): Float32Array => {
    const out = new Float32Array(N), groups = new Map<string, Array<Shape>>()
    for (const s of art.shapes) if (lv.includes(s.lv)) { const key = `${s.on.join(" ")}|${s.a}`; groups.set(key, [...(groups.get(key) ?? []), s]) }
    for (const g of groups.values()) {
      const ok = set(g[0]!.on)
      tmp.g.clearRect(0, 0, w, h); tmp.g.fillStyle = "#000"
      for (const s of g) { trace(tmp.g, s.d); tmp.g.fill() }
      const d = alphaOf()
      for (let i = 0; i < N; i++) if (d[i * 4 + 3]! && ok[map[i]!]) out[i] = Math.max(out[i]!, (d[i * 4 + 3]! / 255) * g[0]!.a)
    }
    return out
  }
  const zero = new Float32Array(N)
  const m1 = upto >= 4 ? mask(["s1", "s2", "s3"]) : zero, m2 = upto >= 6 ? mask(["s2", "s3"]) : zero, m3 = upto >= 6 ? mask(["s3"]) : zero
  if (upto >= 4) {
    const casts = art.casts.map(([a, b, d]) => ({ a: set(a), b: set(b), dx: FALL[0] * d * k, dy: FALL[1] * d * k }))
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, n = map[i]!
      for (const c of casts) if (c.b[n]) for (let t = 0.05; t <= 1.001; t += 0.095) {
        const X = Math.round(x - c.dx * t), Y = Math.round(y - c.dy * t)
        if (X < 0 || Y < 0 || X >= w || Y >= h) break
        if (c.a[map[Y * w + X]!]) { m1[i] = 1; break }
      }
    }
    // a lift is light cut back out of a shadow: the gap between an arm and the body
    const lift = mask(["lift"])
    for (let i = 0; i < N; i++) if (lift[i]! > 0.5) m1[i] = 0
  }
  const b1 = blur(m1, w, h, Math.max(1, 0.55 * k), 2), near = blur(m1, w, h, 2.3 * k, 2), soft = blur(m1, w, h, 7 * k, 2)
  const mf = upto >= 4 ? mask(["form"]) : zero
  const fb = blur(mf, w, h, 4.2 * k, 2), inner = blur(m1, w, h, 4.6 * k, 2)
  const b2 = blur(m2, w, h, Math.max(1, 0.7 * k), 2), b3 = blur(m3, w, h, Math.max(1, 0.6 * k), 2)
  const lost = new Float32Array(N)
  for (const [x, y, r] of art.soft) for (let yy = Math.max(0, Math.floor((y - r) * k)); yy < Math.min(h, (y + r) * k); yy++) for (let xx = Math.max(0, Math.floor((x - r) * k)); xx < Math.min(w, (x + r) * k); xx++) { const a = 1 - smooth(0.25, 1, Math.hypot(xx / k - x, yy / k - y) / r); if (a > lost[yy * w + xx]!) lost[yy * w + xx] = a }
  const e1 = new Float32Array(N), eT = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const n = map[i]!, t = tones[n], d = defs[n]
    if (!t || !d || n === bg || upto < 4) continue
    const hard = smooth(0.36, 0.64, b1[i]!)
    const turned = upto >= 5 ? smooth(0.08, 0.66, fb[i]!) : mf[i]! > 0.5 ? 1 : 0
    const e = Math.max(turned, upto >= 5 ? hard * (1 - lost[i]!) + smooth(0.08, 0.92, soft[i]!) * lost[i]! : hard)
    e1[i] = e; eT[i] = turned
  }
  // depth is measured from the finished shadow, whatever made it, and never past the part's own edge
  const deep = blur(e1, w, h, 9 * k, 2)
  for (let i = 0; i < N; i++) {
    const n = map[i]!, t = tones[n], d = defs[n]
    if (!t || !d || n === bg || upto < 4) continue
    const e = e1[i]!, turned = eT[i]!, hard = smooth(0.36, 0.64, b1[i]!)
    const inside = smooth(0.3, 0.72, deep[i]!)
    if (upto >= 5) {
      // light scatters into the shade: a short pale ramp outside, the rosy peak just INSIDE the edge, grey further in
      const amt = d.kind === "skin" ? 1 : d.kind === "hair" ? 0.42 : d.kind === "pale" ? 0.22 : 0.32
      to(i, t.band, (d.kind === "skin" ? 0.42 : amt * 0.8) * smooth(0.04, 0.46, near[i]!) * (1 - e) * (1 - lost[i]! * 0.5))
      const core = mix(t.s1, t.s1in, inside)
      shadeTo(i, t.base, core, e)
      if (d.kind === "skin") to(i, t.band, 0.8 * (e * (1 - smooth(0.5, 0.97, inner[i]!)) * hard + 0.5 * 4 * turned * (1 - turned)))
    } else shadeTo(i, t.base, t.s1, e)
    const a2 = smooth(0.34, 0.66, b2[i]!), a3 = smooth(0.36, 0.64, b3[i]!)
    if (a2 > 0) shadeTo(i, t.s1, t.s2, a2)
    if (a3 > 0) shadeTo(i, t.s2, t.s3, a3)
  }
  if (upto >= 7) {
    const lt = mask(["lt"]), sheen = blur(mask(["sheen"]), w, h, 7 * k, 2), ring = mask(["ring"]), hi = mask(["hi"])
    const bl = Float32Array.from(blur(lt, w, h, Math.max(1, 0.6 * k), 2)), br = blur(ring, w, h, 1.25 * k, 2), bh = blur(hi, w, h, Math.max(1, 0.5 * k), 1)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, n = map[i]!, t = tones[n], d = defs[n]
      if (!t || !d || n === bg) continue
      to(i, t.lt, bl[i]! * (1 - e1[i]! * 0.9))
      to(i, t.lt, sheen[i]! * 0.85 * (1 - e1[i]! * 0.8))
      const rr = smooth(0.12, 0.88, br[i]!)
      if (rr > 0.01) to(i, t.lt, rr * 0.92 * (1 - e1[i]! * 0.28))
      // a warm pale lip, on the ring's lower edge only
      if (d.kind === "hair") { const o = Math.round(2.6 * k) * w; const fall = (i - o >= 0 ? br[i - o]! : 0) - (i + o < N ? br[i + o]! : 0); if (fall > 0.15) to(i, [240, 231, 222], 0.62 * smooth(0.3, 0.9, fall) * (1 - e1[i]!)) }
      if (bh[i]! > 0.05) to(i, t.hi, smooth(0.15, 0.7, bh[i]!))
      if (d.rim && e1[i]! > 0.5) { const X = Math.round(x + FALL[0] * d.rim * k + d.rim * k * 0.5), Y = Math.round(y + FALL[1] * d.rim * k * 0.4); if (X < w && Y < h && map[Y * w + X] === bg) to(i, t.rim, 0.7) }
    }
  }
  if (upto >= 8) wash(true)
  const stats: Record<string, number> = {}
  { const area: Record<string, number> = {}; for (let i = 0; i < N; i++) { const n = names[map[i]!]!; area[n] = (area[n] ?? 0) + 1; if (e1[i]! > 0.5) stats[n] = (stats[n] ?? 0) + 1 } for (const n of Object.keys(stats)) stats[n] = Math.round((100 * stats[n]!) / area[n]!) }
  if (view === "masks") for (let i = 0; i < N; i++) { const v = map[i] === bg ? 170 : b3[i]! > 0.5 ? 0 : b2[i]! > 0.5 ? 50 : e1[i]! > 0.5 ? 110 : 250; R[i] = G[i] = B[i] = v }

  const r = rng("grain"), gf = new Float32Array(N)
  for (let i = 0; i < N; i++) gf[i] = r() - 0.5
  const grain = blur(gf, w, h, 1, 1)
  const img = new ImageData(w, h)
  for (let i = 0; i < N; i++) {
    const d = defs[map[i]!]
    const gr = upto >= 10 && d && map[i] !== bg ? grain[i]! * (d.grain ?? (d.kind === "skin" ? 1.2 : 5.5)) * 1.5 : 0
    img.data[i * 4] = R[i]! + gr; img.data[i * 4 + 1] = G[i]! + gr; img.data[i * 4 + 2] = B[i]! + gr; img.data[i * 4 + 3] = 255
  }
  const col = mk()
  col.g.putImageData(img, 0, 0)
  if (upto >= 8 && view !== "masks" && view !== "regions") { col.g.save(); col.g.scale(k, k); art.face(col.g); col.g.restore() }

  /* line */
  tmp.g.clearRect(0, 0, w, h); tmp.g.fillStyle = "#000"
  if (upto >= 8) for (const q of art.noink) { trace(tmp.g, q); tmp.g.fill() }
  const hide = alphaOf()
  const fig = new Float32Array(N)
  for (let i = 0; i < N; i++) fig[i] = map[i] === bg ? 0 : 1
  const sil = blur(fig, w, h, 2.2 * k, 1), silT = blur(fig, w, h, 1 * k, 2)
  const thick = blur(ink, w, h, 2.4 * k, 1)
  /* line weight of THIS drawing: distance to the edge of the ink, ridge of each stroke, and the typical contour */
  const dt = distance(ink, w, h)
  const ridge = maxFilter(dt, w, h, Math.round(3.5 * k))
  const spine: Array<number> = []
  for (let y = 2; y < h - 2; y += 2) for (let x = 2; x < w - 2; x += 2) { const i = y * w + x; if (dt[i]! > 0.8 * k && dt[i]! >= ridge[i]! - 0.01 && sil[i]! > 0.04 && sil[i]! < 0.96) spine.push(dt[i]!) }
  spine.sort((p, q) => p - q)
  const half = Math.max(1.1 * k, spine[Math.floor(spine.length * 0.6)] ?? 2 * k)
  // ink the artist filled is much wider than this drawing's own contour; it deepens smoothly, so junctions leave no dots
  const wide = maxFilter(dt, w, h, Math.round(half * 1.6))
  const solid = blur(Float32Array.from(wide, (v) => smooth(1.5, 2.5, v / half)), w, h, 2 * k, 2)
  // lines heavier than about 1% of the head are slimmed a little; stroke weight is averaged along the stroke so it never beads
  const goal = (art.head * 0.01 * k) / 2
  const inkOn = Float32Array.from(dt, (v) => (v > 0 ? 1 : 0))
  const rSum = blur(Float32Array.from(ridge, (v, i) => v * inkOn[i]!), w, h, 4 * k, 2), rN = blur(inkOn, w, h, 4 * k, 2)
  const weight = Float32Array.from(rSum, (v, i) => (rN[i]! > 0.001 ? v / rN[i]! : 0))
  const fineM = new Float32Array(N)
  for (let i = 0; i < N; i++) { const kd = defs[map[i]!]?.kind; fineM[i] = map[i] === bg || kd === "skin" || kd === "hair" ? 1 : 0 }
  const fine = blur(fineM, w, h, 3 * k, 2), darkNear = blur(e1, w, h, 2.5 * k, 1)
  const keySet = set(art.keyline ?? [])
  let key: Float32Array | null = null
  if (upto >= 9 && art.keyline?.length) { const m = new Float32Array(N); for (let i = 0; i < N; i++) if (keySet[map[i]!]) m[i] = 1; key = blur(m, w, h, half * 0.9 + art.head * 0.0026 * k, 2) }
  const li = new ImageData(w, h)
  for (let i = 0; i < N; i++) {
    const n = map[i]!, t = tones[n]
    let mat = t, kind = defs[n]?.kind, hasBoth = false
    if (ink[i]! > 0.12 && upto >= 9) {
      // a line belongs to its darkest neighbour: cloth over hair over skin over the page
      const rank = (q: number): number => (q === bg || !tones[q] ? 0 : defs[q]!.kind === "skin" ? 1 : defs[q]!.kind === "hair" ? 2 : 3)
      let best = rank(n), hasSkin = defs[n]?.kind === "skin", hasCloth = defs[n]?.kind === "cloth"
      for (let rr = 1; rr <= 4; rr++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]] as const) { const x = (i % w) + dx * rr * k, y = ((i / w) | 0) + dy * rr * k; if (x >= 0 && y >= 0 && x < w && y < h) { const q = map[(y | 0) * w + (x | 0)]!; const kd = defs[q]?.kind; if (rr <= 3) { hasSkin ||= kd === "skin"; hasCloth ||= kd === "cloth" } if (rank(q) > best && (rank(q) < 3 || rr <= 2)) { best = rank(q); mat = tones[q]!; kind = defs[q]?.kind } } }
      hasBoth = hasSkin && hasCloth
    }
    const shared = hasBoth
    const thin = upto >= 9 ? 0.12 * smooth(0.8, 1, fine[i]!) : 0
    let a = smooth(0.2 + thin, 0.64 + thin, ink[i]!) * (hide[i * 4 + 3]! > 100 ? 0 : 1)
    let c: RGB = [26, 22, 30]
    if (upto >= 9 && t) {
      const inner = n === bg ? 0 : smooth(0.8, 1, sil[i]!)
      c = mix(mat?.outer ?? [30, 25, 33], mat?.ink ?? t.ink, inner)
      if (shared) c = mix(c, [88, 62, 62], 0.62)
      if (kind === "skin") c = mix(c, [82, 59, 60], 0.75 * inner * smooth(0.2, 0.8, darkNear[i]!))
      { const o = mat?.outer ?? c; c = mix(c, mix([o[0] * 0.56, o[1] * 0.52, o[2] * 0.58], [24, 18, 26], 0.25), solid[i]!) }
      // in the face, filled ink is lashes and pupils: the darkest mark in the picture
      if (names[n] === "face") c = mix(c, [26, 16, 20], smooth(0.6, 0.82, thick[i]!))
      // the silhouette closes with a slightly heavier line; interior lines thin out
      const e = 1 - Math.abs(silT[i]! - 0.5) * 2
      a = Math.max(a * (n !== bg && inner > 0.9 ? 0.9 : 1), smooth(0.6, 0.95, e) * (kind === "skin" ? 0.5 : 0.8) * smooth(0.12, 0.4, thick[i]!))
    }
    if (upto >= 9) {
      // the face's own ink is never touched
      const room = names[n] === "face" ? 0 : Math.max(0, Math.min(weight[i]!, half * 1.3) - goal)
      const cut = (1 - solid[i]!) * Math.min(weight[i]! * 0.28, room * (kind === "skin" ? 0.55 : kind === "hair" ? 0.4 : 0.3))
      if (cut > 0.2) a *= smooth(cut - 0.7, cut + 0.7, dt[i]!)
    }
    // the key line sits just outside the accessory's own contour, and only on top of the figure
    if (key && n !== bg && !keySet[n] && a < 0.6) { const q = smooth(0.02, 0.045, key[i]!) * (1 - smooth(0.095, 0.14, key[i]!)); if (q > 0.02) { c = mix(c, mix([R[i]!, G[i]!, B[i]!], [242, 239, 243], 0.7), Math.max(0, 1 - a * 1.6)); a = Math.max(a, q * 0.9) } }
    li.data[i * 4] = c[0]; li.data[i * 4 + 1] = c[1]; li.data[i * 4 + 2] = c[2]; li.data[i * 4 + 3] = a * 255
  }
  if (upto >= 9 && k > 1) {
    // slimmed lines get their anti-aliasing back
    const al = new Float32Array(N)
    for (let i = 0; i < N; i++) al[i] = li.data[i * 4 + 3]!
    const sm = blur(al, w, h, 1, 1)
    for (let i = 0; i < N; i++) li.data[i * 4 + 3] = sm[i]! * 0.65 + al[i]! * 0.35
  }
  const ic = mk()
  ic.g.putImageData(li, 0, 0)
  if (view === "masks") col.g.globalAlpha = 0.4
  col.g.drawImage(ic.c, 0, 0)
  col.g.globalAlpha = 1
  if (upto >= 9 && view !== "masks" && view !== "regions") { col.g.save(); col.g.scale(k, k); art.over(col.g); col.g.restore() }
  if (upto >= 10 && view !== "masks") {
    // page: white, a breath of shade around the figure, graphics behind it
    const bk = mk()
    bk.g.fillStyle = "#fff"; bk.g.fillRect(0, 0, w, h)
    bk.g.save(); bk.g.scale(k, k); art.back(bk.g); bk.g.restore()
    const halo = blur(fig, w, h, 5 * k, 2)
    const d = bk.g.getImageData(0, 0, w, h)
    for (let i = 0; i < N; i++) {
      if (map[i] !== bg) { d.data[i * 4 + 3] = 0; continue }
      const a = 0.09 * smooth(0, 0.6, halo[i]!)
      d.data[i * 4] = d.data[i * 4]! * (1 - a) + 120 * a; d.data[i * 4 + 1] = d.data[i * 4 + 1]! * (1 - a) + 116 * a; d.data[i * 4 + 2] = d.data[i * 4 + 2]! * (1 - a) + 138 * a
      d.data[i * 4 + 3] = 255 * (1 - li.data[i * 4 + 3]! / 255)
    }
    bk.g.putImageData(d, 0, 0)
    col.g.drawImage(bk.c, 0, 0)
    col.g.save(); col.g.scale(k, k); art.front(col.g); col.g.restore()
  }
  // the figure against the references: how greyed it is, and how much of it is near black
  { const d = col.g.getImageData(0, 0, w, h).data; let n = 0, low = 0, dark = 0; for (let i = 0; i < N; i++) if (map[i] !== bg) { const p: RGB = [d[i * 4]!, d[i * 4 + 1]!, d[i * 4 + 2]!]; n++; if (hsv(p) < 0.3) low++; if (p[0] * 0.3 + p[1] * 0.59 + p[2] * 0.11 < 30) dark++ } stats._lowSat = Math.round((100 * low) / n); stats._dark = Math.round((1000 * dark) / n) / 10; stats._line = Math.round((20 * half) / k) / 10 }
  if (view === "grey") { const d = col.g.getImageData(0, 0, w, h); for (let i = 0; i < N; i++) { const v = d.data[i * 4]! * 0.3 + d.data[i * 4 + 1]! * 0.59 + d.data[i * 4 + 2]! * 0.11; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v } col.g.putImageData(d, 0, 0) }
  return { canvas: col.c, stats }
}
