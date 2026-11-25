import { curveless } from "../lineart/poly.ts"
import { openings, paperDistance, pools, spreadNames, underInk } from "./segment.ts"
import type { Edge, Segments } from "./segment.ts"

/** One click names one patch: "label x,y x,y …" in line-art px. */
export type Clicks = Readonly<Record<string, string>>
export type Paper = { closed: Float32Array; d: Float32Array; P: Segments; edges: Array<Edge>; size: Int32Array; deep: Int32Array }
/** Cut the paper into pools. A wall is a line the artist left out: it is drawn in, and then it is a line like any other. */
export const paper = (ink: Float32Array, w: number, h: number, walls: ReadonlyArray<string>, k: number, ratio = 0.7): Paper => {
  const N = w * h, c = document.createElement("canvas")
  c.width = w; c.height = h
  const g = c.getContext("2d", { willReadFrequently: true })!
  g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = 2.2 * k
  for (const q of walls) { g.beginPath(); curveless(q).forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k))); g.stroke() }
  const a = g.getImageData(0, 0, w, h).data, closed = Float32Array.from(ink)
  for (let i = 0; i < N; i++) if (a[i * 4 + 3]! > 100) closed[i] = 1
  const d = paperDistance(closed, w, h), P = pools(d, w, h, ratio, 1.2 * k), size = new Int32Array(P.n + 1), deep = new Int32Array(P.n + 1)
  for (let i = 0; i < N; i++) { const p = P.seg[i]!; if (!p) continue; size[p] = size[p]! + 1; if (!deep[p] || d[i]! > d[deep[p]!]!) deep[p] = i }
  return { closed, d, P, edges: openings(P, d, w), size, deep }
}
export type Filled = { map: Uint8Array; names: Array<string>; unnamed: Array<number> }
export const fill = (q: Paper, w: number, h: number, clicks: Clicks, k: number): Filled => {
  const names = ["", ...Object.keys(clicks)], named = new Map<number, number>()
  // small patches move a little with the scale: a click on ink takes the nearest patch
  const near = (x: number, y: number): number => {
    let best = 0, bd = 1e9
    const r = 4 * k
    for (let Y = Math.max(0, Math.round(y) - r); Y <= Math.min(h - 1, Math.round(y) + r); Y++) for (let X = Math.max(0, Math.round(x) - r); X <= Math.min(w - 1, Math.round(x) + r); X++) { const p = q.P.seg[Y * w + X]!, dd = (X - x) ** 2 + (Y - y) ** 2; if (p && dd < bd) { bd = dd; best = p } }
    return best
  }
  names.forEach((n, l) => { if (l) for (const s of clicks[n]!.trim().split(/\s+/)) { const [x, y] = s.split(",").map(Number), p = near(x! * k, y! * k); if (!p) console.error(`click on ink: ${n} ${s}`); else if (named.has(p) && named.get(p) !== l) console.error(`two names in one patch, draw a wall: ${names[named.get(p)!]} / ${n} ${s}`); else named.set(p, l) } })
  const name = spreadNames(q.P.n, q.edges, named), seg = new Int32Array(w * h), unnamed: Array<number> = []
  for (let i = 0; i < seg.length; i++) if (q.P.seg[i]) seg[i] = name[q.P.seg[i]!]!
  for (let p = 1; p <= q.P.n; p++) if (!name[p] && q.size[p]! > 5 * k * k) unnamed.push(p)
  return { map: calm(Uint8Array.from(underInk({ seg, n: names.length }, q.closed, w, h).seg), q.closed, w, h, k), names, unnamed }
}
/** Where a line has a hole, two pools meet on bare paper in a staircase: a majority vote around the hole makes it one edge. */
const calm = (map: Uint8Array, ink: Float32Array, w: number, h: number, k: number): Uint8Array => {
  const R = Math.round(2.5 * k), hole = new Uint8Array(map.length), out = map.slice(), count = new Uint16Array(256)
  for (let y = R * 2; y < h - R * 2; y++) for (let x = R * 2; x < w - R * 2; x++) { const i = y * w + x; if (ink[i]! < 0.42 && ((map[i + 1] !== map[i] && ink[i + 1]! < 0.42) || (map[i + w] !== map[i] && ink[i + w]! < 0.42))) for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) hole[i + dy * w + dx] = 1 }
  for (let i = 0; i < map.length; i++) {
    if (!hole[i]) continue
    let best = map[i]!, bn = 0
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= R * R) { const q = map[i + dy * w + dx]!, c = ++count[q]!; if (c > bn) { bn = c; best = q } }
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) count[map[i + dy * w + dx]!] = 0
    out[i] = best
  }
  return out
}
