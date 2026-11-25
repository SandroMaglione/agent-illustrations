/**
 * Hair, lock by lock. Every closed patch of hair gets its own two axes: v from root to tip, u from the side in the light to the
 * side away from it. All shapes are said in those axes, so they follow the lock however it bends, and end in points.
 */
import { blur } from "../lineart/flood.ts"
import { paperDistance } from "../bucket/segment.ts"
import { rng } from "../geo.ts"
import type { P2 } from "../geo.ts"
import { loops } from "./contour.ts"

export type Hair = {
  on: ReadonlyArray<string>; root: P2
  /** Turn of hue, in degrees, from root to tip. */
  tip?: number
  /** A highlight band: an arc round `at`, `r` wide, between two angles (degrees, 0 to the right, down positive). */
  ring?: { at: P2; r: number; thick: number; from: number; to: number; squash?: number }
  /** More shade: 0 none, 1 as usual, 1.5 a lock that lies behind. */
  shade?: number
  /** false: no light streaks by rule, the highlights are drawn (tone W). */
  streaks?: boolean
}
/** shade, deep, light: planes. hue: −1..1, a streak that only turns the hue. v: root to tip. ring: highlight. */
export type Locks = { shade: Float32Array; deep: Float32Array; light: Float32Array; hue: Float32Array; v: Float32Array; ring: Float32Array; any: Uint8Array }
const sm = (a: number, b: number, x: number): number => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

export const locks = (q: { ink: Float32Array; map: Uint8Array; names: ReadonlyArray<string>; w: number; h: number; cut?: Int32Array }, hair: ReadonlyArray<Hair>, fall: P2, head: number, k: number): Locks => {
  const { ink, map, names, w, h } = q, N = w * h, o: Locks = { shade: new Float32Array(N), deep: new Float32Array(N), light: new Float32Array(N), hue: new Float32Array(N), v: new Float32Array(N), ring: new Float32Array(N), any: new Uint8Array(N) }
  const done = new Uint8Array(N), H = head * k
  for (const f of hair) {
    const on = new Uint8Array(names.length)
    for (const n of f.on) { const i = names.indexOf(n); if (i > 0) on[i] = 1 }
    for (let s = 0; s < N; s++) {
      if (done[s] || !on[map[s]!] || ink[s]! > 0.42) continue
      const px = [s], m0 = map[s]!, c0 = q.cut?.[s]
      done[s] = 1
      let x0 = w, y0 = h, x1 = 0, y1 = 0
      for (let t = 0; t < px.length; t++) { const i = px[t]!, x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < N && !done[j] && map[j] === m0 && ink[j]! <= 0.42 && q.cut?.[j] === c0) { done[j] = 1; px.push(j) } }
      if (px.length < 10 * k * k) { for (const i of px) { o.any[i] = 1; o.shade[i] = 0.0 } continue }
      const P = 3, X = x0 - P, Y = y0 - P, W = x1 - x0 + 1 + P * 2, HH = y1 - y0 + 1 + P * 2, m = new Uint8Array(W * HH), at = (i: number): number => (((i / w) | 0) - Y) * W + (i % w) - X
      for (const i of px) m[at(i)] = 1
      // the two ends: the pair of points furthest apart, walking inside the lock
      const walk = (from: number): { d: Float32Array; end: number } => {
        const d = new Float32Array(W * HH).fill(-1), st = [from]
        d[from] = 0
        let end = from
        for (let t = 0; t < st.length; t++) { const i = st[t]!; for (const [j, c] of [[i - 1, 1], [i + 1, 1], [i - W, 1], [i + W, 1], [i - W - 1, 1.41], [i - W + 1, 1.41], [i + W - 1, 1.41], [i + W + 1, 1.41]] as const) if (m[j] && d[j]! < 0) { d[j] = d[i]! + c; st.push(j); if (d[j]! > d[end]!) end = j } }
        return { d, end }
      }
      const e0 = walk(at(px[0]!)).end, wa = walk(e0), wb = walk(wa.end), pos = (i: number): P2 => [(i % W) + X, ((i / W) | 0) + Y], A = pos(e0), B = pos(wa.end), rootIsA = Math.hypot(A[0] / k - f.root[0], A[1] / k - f.root[1]) <= Math.hypot(B[0] / k - f.root[0], B[1] / k - f.root[1]), dr = rootIsA ? wa.d : wb.d, dt = rootIsA ? wb.d : wa.d
      const len = Math.max(1, wa.d[wa.end]!)
      // the outline, cut at the two ends into two sides
      const L = loops(m, W, HH).sort((p, r) => r.length - p.length)[0]!
      const closest = ([x, y]: P2): number => { let b = 0, bd = 1e12; L.forEach(([p, r], i) => { const d = (p + X - x) ** 2 + (r + Y - y) ** 2; if (d < bd) { bd = d; b = i } }); return b }
      const ia = closest(A), ib = closest(B), one = new Float32Array(W * HH), two = new Float32Array(W * HH)
      let c1 = 0, n1 = 0, c2 = 0, n2 = 0
      for (let t = 0; t < L.length; t++) { const [x, y] = L[t]!, first = ia <= ib ? t >= ia && t < ib : t >= ia || t < ib, g = first ? one : two, pr = x * fall[0] + y * fall[1]; if (first) { c1 += pr; n1++ } else { c2 += pr; n2++ } for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]] as const) { const X2 = x + dx, Y2 = y + dy; if (X2 >= 0 && Y2 >= 0 && X2 < W && Y2 < HH && !m[Y2 * W + X2]) g[Y2 * W + X2] = 1 } }
      // smooth axes: the creases of a distance field are no strands
      const mf = Float32Array.from(m), R = Math.max(1, Math.min(H * 0.014, Math.sqrt(px.length) * 0.07)), mb = blur(mf, W, HH, R, 2), even = (d: Float32Array): Float32Array => { const b = blur(Float32Array.from(d, (t, i) => (m[i] ? Math.max(0, t) : 0)), W, HH, R, 2); return Float32Array.from(b, (t, i) => (m[i] ? t / Math.max(1e-3, mb[i]!) : 0)) }
      const eOne = paperDistance(one, W, HH, 0.5), eTwo = paperDistance(two, W, HH, 0.5), raw = Float32Array.from(eOne, (t, i) => (m[i] ? t / Math.max(1, t + eTwo[i]!) : 0)), U = even(raw), wideAt = even(Float32Array.from(eOne, (t, i) => t + eTwo[i]!)), along = even(Float32Array.from(dr, (t, i) => (m[i] ? t / Math.max(1, t + dt[i]!) : 0))), dOne = eOne, dTwo = eTwo, litOne = c1 / Math.max(1, n1) < c2 / Math.max(1, n2), r = rng(`${x0},${y0},${px.length}`)
      let wide = 0
      for (const i of px) { const j = at(i), c = dOne[j]! + dTwo[j]!; if (c > wide) wide = c }
      const K = f.shade ?? 1, big = wide / H, sw = (0.34 + r() * 0.14) * Math.min(1.35, K), b0 = 0.02 + r() * 0.1, pk = 0.36 + r() * 0.16, cut = 0.62 + r() * 0.16, n = big > 0.16 ? 3 : big > 0.07 ? 2 : big > 0.03 ? 1 : 0
      const streaks = Array.from({ length: n * 2 + (big > 0.03 ? 1 : 0) }, (_, i) => ({ u: (i + 0.5 + (r() - 0.5) * 0.5) / (n * 2 + 1), w: 0.035 + r() * 0.06, a: 0.04 + r() * 0.3, b: 0.6 + r() * 0.38, hue: i % 2 ? 1 : -1, lit: i % 3 === 1 }))
      for (const i of px) {
        const j = at(i), c = Math.max(1, wideAt[j]!), u = litOne ? U[j]! : 1 - U[j]!, v = along[j]!, edge = (e: number): number => sm(-0.7, 0.7, (u - e) * c)
        o.any[i] = 1; o.v[i] = v
        if (K > 0) {
          // one plane on the side away from the light: it opens in a point, is widest before the middle, steps back once, and runs out with the lock
          const t = v < pk ? sm(b0, pk, v) : 1 - 0.55 * sm(pk, 1, v), step = v > cut && v < cut + 0.14 ? 0.42 * (1 - (v - cut) / 0.14) : 0
          let a = edge(1 - sw * Math.max(0, t - step))
          // under what it grows from: short points, one per strand
          if (big > 0.025) { const z = (u * (n + 1.6)) % 1, root = (0.07 + 0.09 * Math.abs(2 * z - 1)) * Math.min(1.4, K); a = Math.max(a, sm(-0.7, 0.7, (root - v) * len)) }
          o.shade[i] = a
          if (big > 0.03) o.deep[i] = edge(1 - sw * 0.42 * Math.max(0, sm(b0 + 0.06, pk, v) * (1 - sm(pk + 0.08, 0.86, v)))) * a
        }
        for (const s2 of streaks) {
          if (v < s2.a || v > s2.b) continue
          const t = (v - s2.a) / (s2.b - s2.a), hw = s2.w * Math.sin(Math.PI * Math.min(1, t * 1.25)) ** 0.8 * (t > 0.8 ? (1 - t) / 0.2 : 1), a = sm(-0.6, 0.6, (hw - Math.abs(u - s2.u)) * c)
          if (a <= 0) continue
          if (s2.lit) o.light[i] = Math.max(o.light[i]!, a); else if (Math.abs(a) > Math.abs(o.hue[i]!)) o.hue[i] = a * s2.hue
        }
        if (f.ring) {
          const x = (i % w) / k - f.ring.at[0], y = (((i / w) | 0) / k - f.ring.at[1]) / (f.ring.squash ?? 1), an = (Math.atan2(y, x) * 180) / Math.PI, R = Math.hypot(x, y)
          if (an > f.ring.from && an < f.ring.to && big > 0.02) {
            // each lock takes its own piece: straight above, points below
            const z = (u * (n + 1)) % 1, low = f.ring.thick * (0.25 + 0.75 * (1 - Math.abs(2 * z - 1))), top = f.ring.thick * (0.5 - 0.25 * Math.abs(2 * u - 1)), jump = (r0(x0 + y0) - 0.5) * f.ring.thick * 0.7, g = R - f.ring.r - jump
            o.ring[i] = Math.min(sm(-0.5, 0.5, (g + top) * k), sm(-0.5, 0.5, (low - g) * k)) * sm(0.02, 0.1, u) * (1 - sm(0.86, 0.96, u))
          }
        }
      }
    }
  }
  return o
}
const r0 = (n: number): number => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s) }
