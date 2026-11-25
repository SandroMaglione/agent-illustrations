/**
 * A magnetic lasso on an artist's pencil (scripts/pencil.ts): a few points say which line is meant, its shape is the artist's.
 * A smooth curve through the points is pulled onto the pencil as a whole, as a hand inks it: the wobble and the searching go, the
 * curve stays. Runs in Node; scripts/ink.ts writes the result down.
 */
import { readFileSync } from "node:fs"
import type { P2 } from "../geo.ts"
import { trace } from "./draw.ts"

export type Pencil = { w: number; h: number; k: number; ridge: Uint8Array; dark: Uint8Array }
/** `unit`: drawing units per sketch px. */
export const loadPencil = (file: string, unit: number): Pencil => {
  const b = readFileSync(file), [w, h, K] = [b.readUInt32LE(0), b.readUInt32LE(4), b.readUInt32LE(8)], N = w! * h!, ridge = new Uint8Array(N), dark = new Uint8Array(N)
  for (let i = 0; i < N; i++) { ridge[i] = b[12 + i * 3]!; dark[i] = b[13 + i * 3]! }
  return { w: w!, h: h!, k: K! / unit, ridge, dark }
}
export type Path = { p: Array<P2>; press: Array<number> }
/** "x,y" snaps to the pencil, "x,y!" is a corner and stays sharp, "x,y=" stays exactly there, "-" at the end: no pencil from here to the next point, a plain curve. */
export const lasso = (q: Pencil, d: string, smooth = 8): Path => {
  const t = d.trim().split(/\s+/).map((s) => { const [x, y] = s.replace(/[!=\-]+$/, "").split(",").map(Number), f = s.match(/[!=\-]+$/)?.[0] ?? ""; if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`cannot read "${s}"`); return { x: x!, y: y!, hard: f.includes("!"), fix: f.includes("="), free: f.includes("-") } })
  const out: Array<P2> = []
  for (let a = 0; a < t.length - 1; ) {
    let b = a + 1
    while (b < t.length - 1 && !t[b]!.hard) b++
    const part = t.slice(a, b + 1), c = even(trace(part.map((v) => `${v.x},${v.y}`).join(" "), false).map((v) => v.p), [], Math.min(smooth, 7)), got = pull(q, c, part, smooth)
    out.push(...(out.length ? got.slice(1) : got))
    a = b
  }
  const press = out.map(([x, y]) => { let m = 0; const r = Math.max(2, Math.round(q.k * 1.5)); for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = Math.round(x * q.k) + dx, Y = Math.round(y * q.k) + dy; if (X >= 0 && Y >= 0 && X < q.w && Y < q.h) m = Math.max(m, q.dark[Y * q.w + X]!) } return m / 255 })
  const r = 14, soft = press.map((_, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - r); j <= Math.min(press.length - 1, i + r); j++) { s += press[j]!; n++ } return s / n })
  return { p: out, press: soft }
}
/** The whole curve moves onto the pencil at once: at every point how far aside the pencil lies, chosen so that the offset changes slowly. It cannot jump between two lines. */
const pull = (q: Pencil, c: ReadonlyArray<P2>, pts: ReadonlyArray<{ x: number; y: number; fix: boolean; free: boolean }>, smooth: number): Array<P2> => {
  const n = c.length, st = 0.5, R = 6, M = Math.round((2 * R) / st) + 1, nx: Array<number> = [], ny: Array<number> = []
  for (let i = 0; i < n; i++) { const a = c[Math.max(0, i - 3)]!, b = c[Math.min(n - 1, i + 3)]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; nx.push(-(b[1] - a[1]) / l); ny.push((b[0] - a[0]) / l) }
  // how far a place may move: typed exactly, only a little; where there is no pencil, not at all
  const near = c.map(([x, y]) => { let best = 0, bd = 1e9; pts.forEach((v, j) => { const e = (v.x - x) ** 2 + (v.y - y) ** 2; if (e < bd) { bd = e; best = j } }); const v = pts[best]!; return v.free ? 0 : v.fix ? 2.5 : R })
  const cost = new Float32Array(n * M), from = new Int16Array(n * M), sum = new Float32Array(n * M)
  for (let i = 0; i < n; i++) for (let m = 0; m < M; m++) { const o = -R + m * st, X = Math.round((c[i]![0] + nx[i]! * o) * q.k), Y = Math.round((c[i]![1] + ny[i]! * o) * q.k); cost[i * M + m] = Math.abs(o) > near[i]! + 0.01 ? 4 + Math.abs(o) : (X < 0 || Y < 0 || X >= q.w || Y >= q.h ? 0 : -Math.min(1, q.ridge[Y * q.w + X]! / 170)) + 0.02 * Math.abs(o) }
  for (let m = 0; m < M; m++) sum[m] = cost[m]!
  for (let i = 1; i < n; i++) for (let m = 0; m < M; m++) { let b = 1e9, at = m; for (let u = Math.max(0, m - 2); u <= Math.min(M - 1, m + 2); u++) { const v = sum[(i - 1) * M + u]! + 1.6 * ((u - m) * st) ** 2; if (v < b) { b = v; at = u } } sum[i * M + m] = b + cost[i * M + m]!; from[i * M + m] = at }
  let m = 0
  for (let u = 1; u < M; u++) if (sum[(n - 1) * M + u]! < sum[(n - 1) * M + m]!) m = u
  const off = new Array<number>(n)
  for (let i = n - 1; i >= 0; i--) { off[i] = -R + m * st; m = from[i * M + m]! }
  const s = smooth * 1.2, r = Math.ceil(s * 2.5), so = off.map((_, i) => { let v = 0, w = 0; for (let d = -r; d <= r; d++) { const j = Math.max(0, Math.min(n - 1, i + d)), g = Math.exp(-(d * d) / (2 * s * s)); v += off[j]! * g; w += g } return v / w })
  return c.map(([x, y], i): P2 => [x + nx[i]! * so[i]!, y + ny[i]! * so[i]!])
}
/** One point per unit, smoothed over `s` units; corners and ends stay. */
const even = (raw: ReadonlyArray<P2>, hard: ReadonlyArray<number>, s: number): Array<P2> => {
  const cuts = [...new Set([0, ...hard, raw.length - 1])].sort((a, b) => a - b), out: Array<P2> = []
  for (let c = 0; c + 1 < cuts.length; c++) {
    const seg = raw.slice(cuts[c]!, cuts[c + 1]! + 1), pts: Array<P2> = [seg[0]!]
    let acc = 0
    for (let i = 1; i < seg.length; i++) { let a = seg[i - 1]!, L = Math.hypot(seg[i]![0] - a[0], seg[i]![1] - a[1]); while (L > 0 && acc + L >= 1) { const t = (1 - acc) / L, n: P2 = [a[0] + (seg[i]![0] - a[0]) * t, a[1] + (seg[i]![1] - a[1]) * t]; pts.push(n); a = n; L = Math.hypot(seg[i]![0] - a[0], seg[i]![1] - a[1]); acc = 0 } acc += L }
    pts.push(seg.at(-1)!)
    // ends are mirrored, so a smoothed line neither shrinks nor flattens at them
    const n = pts.length, r = Math.ceil(s * 2.5), at = (i: number): P2 => (i < 0 ? [2 * pts[0]![0] - pts[Math.min(n - 1, -i)]![0], 2 * pts[0]![1] - pts[Math.min(n - 1, -i)]![1]] : i >= n ? [2 * pts[n - 1]![0] - pts[Math.max(0, 2 * n - 2 - i)]![0], 2 * pts[n - 1]![1] - pts[Math.max(0, 2 * n - 2 - i)]![1]] : pts[i]!)
    const sm = pts.map((_, i): P2 => { let x = 0, y = 0, w = 0; for (let d = -r; d <= r; d++) { const g = Math.exp(-(d * d) / (2 * s * s)), v = at(i + d); x += v[0] * g; y += v[1] * g; w += g } return [x / w, y / w] })
    out.push(...(c ? sm.slice(1) : sm))
  }
  return out
}
