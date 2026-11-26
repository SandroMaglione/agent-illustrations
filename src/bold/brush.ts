/**
 * Shadow shapes as brush strokes: a curve with a width that swells and runs out, as a hand lays hair in. One line each:
 *   "parts | tone | width | x,y x,y …"        ends in points; "width<" swells late, "width>" early
 * Gives the shapes of `bold/shadows.ts`, so the rest of the process does not change.
 */
import type { Shadow } from "./shadows.ts"

type P = readonly [number, number]
/** A smooth curve through the points (Catmull-Rom), about every 2 px. */
const smooth = (q: ReadonlyArray<P>): Array<P> => {
  const o: Array<P> = []
  for (let i = 0; i < q.length - 1; i++) {
    const a = q[Math.max(0, i - 1)]!, b = q[i]!, c = q[i + 1]!, d = q[Math.min(q.length - 1, i + 2)]!, n = Math.max(2, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / 2))
    for (let s = 0; s < n; s++) { const t = s / n, t2 = t * t, t3 = t2 * t, f = (k: 0 | 1): number => 0.5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t3); o.push([f(0), f(1)]) }
  }
  o.push(q[q.length - 1]!)
  return o
}
export const brushes = (text: string): Array<Shadow> => text.trim().split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => {
  const [on, tone, wd, d] = l.replace(/^\+/, "").split("|").map((q) => q.trim()) as [string, Shadow["tone"], string, string], w = Number(wd.replace(/[<>]/, "")), e = wd.endsWith("<") ? 1.7 : wd.endsWith(">") ? 0.6 : 1
  const p = smooth(d.split(/\s+/).map((t) => t.split(",").map(Number) as unknown as P)), n = p.length, L: Array<string> = [], R: Array<string> = []
  for (let i = 0; i < n; i += i + 3 < n ? 3 : Math.max(1, n - 1 - i)) {
    const a = p[Math.max(0, i - 2)]!, b = p[Math.min(n - 1, i + 2)]!, len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = Math.sin(Math.PI * (i / (n - 1)) ** e) ** 0.75 * (w / 2), x = -((b[1] - a[1]) / len) * t, y = ((b[0] - a[0]) / len) * t
    L.push(`${(p[i]![0] + x).toFixed(1)},${(p[i]![1] + y).toFixed(1)}`); R.push(`${(p[i]![0] - x).toFixed(1)},${(p[i]![1] - y).toFixed(1)}`)
    if (i === n - 1) break
  }
  return { on: on.split(/\s+/), tone, d: [...L, ...R.reverse()].join(" "), ...(l.startsWith("+") ? { add: true } : {}) }
})
