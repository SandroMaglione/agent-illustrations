/** 2D/3D helpers, seeded randomness, polylines. */
export type P2 = readonly [number, number]
export type P3 = readonly [number, number, number]

export const TAU = Math.PI * 2
export const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
export const smooth = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const mix2 = (a: P2, b: P2, t: number): P2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
export const dist = (a: P2, b: P2): number => Math.hypot(a[0] - b[0], a[1] - b[1])

/* ---------- randomness: everything is seeded by a stroke's name, so a drawing is stable between frames ---------- */
export const hash = (s: string): number => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
export type Rng = () => number
export const rng = (seed: number | string): Rng => {
  let a = (typeof seed === "string" ? hash(seed) : seed) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
/** Smooth 1D noise in [-1, 1]. */
export const noise1 = (seed: number | string): ((t: number) => number) => {
  const s = typeof seed === "string" ? hash(seed) : seed
  const at = (i: number): number => {
    let h = Math.imul(i ^ s, 0x27d4eb2d)
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
    return (((h ^ (h >>> 13)) >>> 0) / 4294967296) * 2 - 1
  }
  return (t) => {
    const i = Math.floor(t)
    const f = t - i
    return lerp(at(i), at(i + 1), f * f * (3 - 2 * f))
  }
}

/* ---------- polylines ---------- */
export const length = (p: ReadonlyArray<P2>): number => {
  let l = 0
  for (let i = 1; i < p.length; i++) l += dist(p[i - 1]!, p[i]!)
  return l
}
export const resample = (p: ReadonlyArray<P2>, step: number): Array<P2> => {
  const total = length(p)
  if (p.length < 2 || total < 1e-6) return [...p]
  const n = Math.max(2, Math.round(total / step))
  const out: Array<P2> = [p[0]!]
  let seg = 1
  let acc = 0
  for (let k = 1; k < n; k++) {
    const want = (total * k) / n
    while (seg < p.length - 1 && acc + dist(p[seg - 1]!, p[seg]!) < want) {
      acc += dist(p[seg - 1]!, p[seg]!)
      seg++
    }
    const d = dist(p[seg - 1]!, p[seg]!)
    out.push(mix2(p[seg - 1]!, p[seg]!, d < 1e-9 ? 0 : clamp((want - acc) / d)))
  }
  out.push(p[p.length - 1]!)
  return out
}
export const normals = (p: ReadonlyArray<P2>): Array<P2> =>
  p.map((_, i) => {
    const a = p[Math.max(0, i - 1)]!
    const b = p[Math.min(p.length - 1, i + 1)]!
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    return [dy / l, -dx / l] as const
  })
export const area = (p: ReadonlyArray<P2>): number => {
  let a = 0
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length]!
    a += p[i]![0] * q[1] - q[0] * p[i]![1]
  }
  return a / 2
}
export const bounds = (p: ReadonlyArray<P2>): { x0: number; y0: number; x1: number; y1: number } => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of p) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
  }
  return { x0, y0, x1, y1 }
}
export const hull = (pts: ReadonlyArray<P2>): Array<P2> => {
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cr = (o: P2, a: P2, b: P2): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (src: ReadonlyArray<P2>): Array<P2> => {
    const h: Array<P2> = []
    for (const p of src) {
      while (h.length >= 2 && cr(h[h.length - 2]!, h[h.length - 1]!, p) <= 0) h.pop()
      h.push(p)
    }
    h.pop()
    return h
  }
  return [...half(s), ...half([...s].reverse())]
}
/** Catmull-Rom through control points. */
export const spline = (c: ReadonlyArray<P2>, per = 10, closed = false): Array<P2> => {
  const n = c.length
  const at = (i: number): P2 => (closed ? c[((i % n) + n) % n]! : c[clamp(i, 0, n - 1)]!)
  const out: Array<P2> = []
  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const [a, b, d, e] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    for (let k = 0; k < per; k++) {
      const t = k / per
      const f = (j: 0 | 1): number =>
        0.5 * (2 * b[j] + (d[j] - a[j]) * t + (2 * a[j] - 5 * b[j] + 4 * d[j] - e[j]) * t * t + (3 * b[j] - a[j] - 3 * d[j] + e[j]) * t * t * t)
      out.push([f(0), f(1)])
    }
  }
  if (!closed) out.push(c[n - 1]!)
  return out
}
export const circle = (c: P2, r: number, n = 28, ry = r): Array<P2> =>
  Array.from({ length: n }, (_, i) => [c[0] + Math.cos((i / n) * TAU) * r, c[1] + Math.sin((i / n) * TAU) * ry] as const)

/** Quadratic bezier. */
export const bezier = (a: P2, c: P2, b: P2, n = 18): Array<P2> =>
  Array.from({ length: n + 1 }, (_, i) => mix2(mix2(a, c, i / n), mix2(c, b, i / n), i / n))

/** A tube around a 2D centre line: closed outline plus its open left/cap/right run. */
export const tube = (mid: ReadonlyArray<P2>, radius: (t: number) => number, cap: boolean | "both" = true): { poly: Array<P2>; run: Array<P2> } => {
  const ns = normals(mid)
  const n = mid.length - 1
  const left = mid.map((p, i) => [p[0] + ns[i]![0] * radius(i / n), p[1] + ns[i]![1] * radius(i / n)] as P2)
  const right = mid.map((p, i) => [p[0] - ns[i]![0] * radius(i / n), p[1] - ns[i]![1] * radius(i / n)] as P2).reverse()
  const end = mid[n]!
  const nn = ns[n]!
  const r = radius(1)
  const capPts: Array<P2> = []
  if (cap) {
    const a0 = Math.atan2(nn[1], nn[0])
    for (let k = 1; k < 10; k++) {
      const a = a0 + (Math.PI * k) / 10
      capPts.push([end[0] + Math.cos(a) * r, end[1] + Math.sin(a) * r])
    }
  }
  if (cap === "both") {
    const n0 = ns[0]!
    const a0 = Math.atan2(-n0[1], -n0[0])
    const start: Array<P2> = []
    for (let k = 1; k < 10; k++) {
      const a = a0 + (Math.PI * k) / 10
      start.push([mid[0]![0] + Math.cos(a) * radius(0), mid[0]![1] + Math.sin(a) * radius(0)])
    }
    right.push(...start)
  }
  const run = [...left, ...capPts, ...right]
  return { poly: run, run }
}
