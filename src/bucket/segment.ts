/** Bucket fill that closes gaps: regions come from the lines alone, nobody marks anything. */
export type Segments = { seg: Int32Array; n: number }

/** Exact distance from every pixel to the nearest ink (Felzenszwalb). */
export const paperDistance = (ink: Float32Array, w: number, h: number, cut = 0.4): Float32Array => {
  const f = Float64Array.from(ink, (v) => (v > cut ? 0 : 1e12)), m = Math.max(w, h)
  const v = new Int32Array(m), z = new Float64Array(m + 1), a = new Float64Array(m)
  const pass = (n: number, at: (q: number) => number): void => {
    for (let q = 0; q < n; q++) a[q] = f[at(q)]!
    let k = 0
    v[0] = 0; z[0] = -Infinity; z[1] = Infinity
    for (let q = 1; q < n; q++) {
      let s = (a[q]! + q * q - (a[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!)
      while (s <= z[k]!) { k--; s = (a[q]! + q * q - (a[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!) }
      k++; v[k] = q; z[k] = s; z[k + 1] = Infinity
    }
    k = 0
    for (let q = 0; q < n; q++) { while (z[k + 1]! < q) k++; f[at(q)] = (q - v[k]!) ** 2 + a[v[k]!]! }
  }
  for (let x = 0; x < w; x++) pass(h, (q) => q * w + x)
  for (let y = 0; y < h; y++) pass(w, (q) => y * w + q)
  return Float32Array.from(f, (q) => Math.sqrt(q))
}
/**
 * Think of the paper as a valley whose depth is the distance to the nearest line. Two pools stay apart
 * when the opening between them is narrow compared with the smaller pool: a gap in a line. A wide opening is one part.
 */
export const pools = (d: Float32Array, w: number, h: number, ratio: number, least: number): Segments => {
  const N = w * h
  // deepest first; sixteen levels per pixel of distance are plenty
  let top = 0, count = 0
  for (let i = 0; i < N; i++) if (d[i]! > 0) { count++; top = Math.max(top, d[i]!) }
  const K = Math.ceil(top * 16) + 1, start = new Int32Array(K + 1), order = new Int32Array(count)
  const lv = (i: number): number => K - 1 - Math.round(d[i]! * 16)
  for (let i = 0; i < N; i++) if (d[i]! > 0) start[lv(i) + 1] = start[lv(i) + 1]! + 1
  for (let i = 0; i < K; i++) start[i + 1] = start[i + 1]! + start[i]!
  for (let i = 0; i < N; i++) if (d[i]! > 0) { const q = lv(i); order[start[q]!] = i; start[q] = start[q]! + 1 }
  const own = new Int32Array(N), up: Array<number> = [0], peak: Array<number> = [0]
  const find = (q: number): number => { while (up[q] !== q) { up[q] = up[up[q]!]!; q = up[q]! } return q }
  for (const i of order) {
    const x = i % w
    let best = 0
    const near: Array<number> = []
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < N && own[j]) { const r = find(own[j]!); if (!near.includes(r)) near.push(r) }
    if (!near.length) { up.push(up.length); peak.push(d[i]!); own[i] = up.length - 1; continue }
    near.sort((p, q) => peak[q]! - peak[p]!)
    best = near[0]!
    for (const r of near.slice(1)) if (d[i]! >= ratio * peak[r]! || peak[r]! < least) up[r] = best
    own[i] = best
  }
  const id = new Map<number, number>(), seg = new Int32Array(N)
  for (let i = 0; i < N; i++) if (own[i]) { const r = find(own[i]!); let q = id.get(r); if (!q) { q = id.size + 1; id.set(r, q) } seg[i] = q }
  return { seg, n: id.size }
}
/** Let every region grow under the ink at the same speed, so two regions meet on the centre line of the stroke between them. */
export const underInk = (s: Segments, ink: Float32Array, w: number, h: number): Segments => {
  const seg = s.seg.slice(), N = w * h
  // distance to the nearest named paper, measured straight, not along the grid
  const far = paperDistance(Float32Array.from(s.seg, (v) => (v ? 1 : 0)), w, h, 0.5)
  const at: Array<Array<number>> = [], who: Array<Array<number>> = []
  const spread = (i: number, lv: number): void => {
    const x = i % w
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w, x > 0 ? i - w - 1 : -1, x < w - 1 ? i - w + 1 : -1, x > 0 ? i + w - 1 : -1, x < w - 1 ? i + w + 1 : -1]) if (j >= 0 && j < N && !seg[j]) { const q = Math.max(lv, Math.round(far[j]! * 8)); (at[q] ??= []).push(j); (who[q] ??= []).push(seg[i]!) }
  }
  for (let i = 0; i < N; i++) if (s.seg[i]) spread(i, 0)
  for (let lv = 0; lv < at.length; lv++) {
    const a = at[lv], b = who[lv]
    if (!a || !b) continue
    for (let q = 0; q < a.length; q++) if (!seg[a[q]!]) { seg[a[q]!] = b[q]!; spread(a[q]!, lv) }
    a.length = 0; b.length = 0
  }
  return { seg, n: s.n }
}

/* ---------- naming the pools ---------- */
export type Edge = { a: number; b: number; gap: number }
/** Widest opening between every two pools that touch on paper, widest first relative to the smaller pool. */
export const openings = (s: Segments, d: Float32Array, w: number): Array<Edge> => {
  const N = s.seg.length, peak = new Float32Array(s.n + 1), gap = new Map<number, number>()
  for (let i = 0; i < N; i++) if (s.seg[i] && d[i]! > peak[s.seg[i]!]!) peak[s.seg[i]!] = d[i]!
  for (let i = 0; i < N; i++) for (const j of [i % w < w - 1 ? i + 1 : -1, i + w]) if (j >= 0 && j < N && s.seg[i] && s.seg[j] && s.seg[i] !== s.seg[j]) {
    const a = Math.min(s.seg[i]!, s.seg[j]!), b = Math.max(s.seg[i]!, s.seg[j]!), key = a * 4096 + b, v = Math.min(d[i]!, d[j]!)
    if (v > (gap.get(key) ?? 0)) gap.set(key, v)
  }
  return [...gap].map(([key, v]) => { const a = Math.floor(key / 4096), b = key % 4096; return { a, b, gap: v / Math.min(peak[a]!, peak[b]!) } }).sort((p, q) => q.gap - p.gap)
}
/** Join pools through the widest openings first, never two with different names. Unnamed closed patches stay 0. */
export const spreadNames = (n: number, edges: ReadonlyArray<Edge>, named: ReadonlyMap<number, number>): Int32Array => {
  const up = Int32Array.from({ length: n + 1 }, (_, i) => i), name = new Int32Array(n + 1)
  const find = (q: number): number => { while (up[q] !== q) { up[q] = up[up[q]!]!; q = up[q]! } return q }
  for (const [p, l] of named) name[p] = l
  for (const e of edges) { const a = find(e.a), b = find(e.b); if (a === b || (name[a] && name[b] && name[a] !== name[b])) continue; up[b] = a; name[a] = name[a]! || name[b]! }
  return Int32Array.from({ length: n + 1 }, (_, i) => (i ? name[find(i)]! : 0))
}
