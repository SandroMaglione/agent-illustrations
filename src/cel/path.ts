/** Authoring: "x,y x,y! x,y" strings. Smooth through every point, except corners marked "!". */
import { lerp } from "../geo.ts"
import type { P2 } from "../geo.ts"

type Knot = { p: P2; c: boolean }
export const knots = (s: string): Array<Knot> =>
  s.trim().split(/\s+/).map((t) => {
    const c = t.endsWith("!")
    const [x, y] = t.replace("!", "").split(",").map(Number)
    return { p: [x!, y!] as P2, c }
  })

/** Centripetal Catmull-Rom: no overshoot on uneven spacing. */
const seg = (a: P2, b: P2, c: P2, d: P2, per: number, out: Array<P2>): void => {
  const dt = (m: P2, n: P2): number => Math.max(1e-4, Math.hypot(m[0] - n[0], m[1] - n[1]) ** 0.5)
  const t0 = 0, t1 = dt(a, b), t2 = t1 + dt(b, c), t3 = t2 + dt(c, d)
  for (let k = 0; k < per; k++) {
    const t = lerp(t1, t2, k / per)
    const mix = (m: P2, n: P2, u: number, v: number): P2 => [((v - t) * m[0] + (t - u) * n[0]) / (v - u), ((v - t) * m[1] + (t - u) * n[1]) / (v - u)]
    const A1 = mix(a, b, t0, t1), A2 = mix(b, c, t1, t2), A3 = mix(c, d, t2, t3)
    out.push(mix(mix(A1, A2, t0, t2), mix(A2, A3, t1, t3), t1, t2))
  }
}
const open = (p: ReadonlyArray<P2>, per: number): Array<P2> => {
  const out: Array<P2> = []
  const n = p.length
  if (n === 2) return [p[0]!, p[1]!]
  const ext = (m: P2, o: P2): P2 => [2 * m[0] - o[0], 2 * m[1] - o[1]]
  for (let i = 0; i < n - 1; i++) seg(i ? p[i - 1]! : ext(p[0]!, p[1]!), p[i]!, p[i + 1]!, i + 2 < n ? p[i + 2]! : ext(p[n - 1]!, p[n - 2]!), per, out)
  out.push(p[n - 1]!)
  return out
}
export const curve = (s: string, per = 10): Array<P2> => {
  const k = knots(s)
  const runs: Array<Array<P2>> = [[]]
  k.forEach((q, i) => {
    runs[runs.length - 1]!.push(q.p)
    if (q.c && i > 0 && i < k.length - 1) runs.push([q.p])
  })
  return runs.flatMap((r, i) => { const o = r.length > 1 ? open(r, per) : r; return i < runs.length - 1 ? o.slice(0, -1) : o })
}
export const loop = (s: string, per = 10): Array<P2> => {
  const k = knots(s)
  const first = k.findIndex((q) => q.c)
  if (first < 0) {
    const n = k.length
    const out: Array<P2> = []
    for (let i = 0; i < n; i++) seg(k[(i - 1 + n) % n]!.p, k[i]!.p, k[(i + 1) % n]!.p, k[(i + 2) % n]!.p, per, out)
    return out
  }
  const rot = [...k.slice(first), ...k.slice(0, first), k[first]!]
  const runs: Array<Array<P2>> = [[]]
  rot.forEach((q, i) => {
    runs[runs.length - 1]!.push(q.p)
    if (q.c && i > 0 && i < rot.length - 1) runs.push([q.p])
  })
  return runs.flatMap((r) => open(r, per).slice(0, -1))
}
export type Map2 = (p: P2) => P2
export const place = (x: number, y: number, rot = 0, s = 1, sx = 1): Map2 => {
  const c = Math.cos(rot), n = Math.sin(rot)
  return ([a, b]) => [x + (a * sx * c - b * n) * s, y + (a * sx * n + b * c) * s]
}
export const id2: Map2 = (p) => p
