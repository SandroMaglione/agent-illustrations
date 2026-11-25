/** Words for places on the drawing: s41@.3 is a point on a line, s41[.2..1] a stretch of it, A:B:.4 a point between two others. */
import type { P2 } from "../geo.ts"
import type { Stroke } from "./strokes.ts"

export type Refs = { at: (r: string) => P2; run: (r: string) => Run; strokes: ReadonlyArray<Stroke> }
export type Run = { p: Array<P2>; half: Array<number>; id: number }
const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const lengths = (s: Stroke): Array<number> => { const o = [0]; for (let i = 1; i < s.p.length; i++) o.push(o[i - 1]! + Math.hypot(s.p[i]![0] - s.p[i - 1]![0], s.p[i]![1] - s.p[i - 1]![1])); return o }
const pointAt = (s: Stroke, t: number): { p: P2; half: number; i: number } => {
  const L = lengths(s), want = Math.max(0, Math.min(1, t)) * L.at(-1)!
  let i = 1
  while (i < L.length - 1 && L[i]! < want) i++
  const u = (want - L[i - 1]!) / (L[i]! - L[i - 1]! || 1)
  return { p: lerp2(s.p[i - 1]!, s.p[i]!, u), half: s.half[i - 1]! + (s.half[i]! - s.half[i - 1]!) * u, i }
}
export const refsOf = (strokes: ReadonlyArray<Stroke>): Refs => {
  const of = (n: string): Stroke => { const s = strokes[Number(n) - 1]; if (!s) throw new Error(`no stroke ${n}`); return s }
  const at = (r: string): P2 => {
    const mid = r.split(":")
    if (mid.length === 3) return lerp2(at(mid[0]!), at(mid[1]!), Number(mid[2]))
    const m = r.match(/^s(\d+)@([\d.]+)$/)
    if (m) return pointAt(of(m[1]!), Number(m[2])).p
    const x = r.match(/^x\(s(\d+),s(\d+)\)$/)
    if (x) { let best: P2 = [0, 0], bd = 1e9; for (const a of of(x[1]!).p) for (const b of of(x[2]!).p) { const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d < bd) { bd = d; best = lerp2(a, b, 0.5) } } if (bd > 12) throw new Error(`${r}: the lines never meet (${bd.toFixed(0)} px apart)`); return best }
    throw new Error(`cannot read "${r}"`)
  }
  const run = (r: string): Run => {
    const m = r.match(/^s(\d+)(?:\[([\d.]+)\.\.([\d.]+)\])?$/)
    if (!m) throw new Error(`cannot read "${r}"`)
    const s = of(m[1]!), a = Number(m[2] ?? 0), b = Number(m[3] ?? 1), n = Math.max(2, Math.round((s.len * Math.abs(b - a)) / 1.5)), p: Array<P2> = [], half: Array<number> = []
    for (let i = 0; i <= n; i++) { const q = pointAt(s, a + ((b - a) * i) / n); p.push(q.p); half.push(q.half) }
    return { p, half, id: s.id }
  }
  return { at, run, strokes }
}
