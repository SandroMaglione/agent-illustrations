/**
 * Shadow shapes as brush strokes: a curve with a width that swells and runs out, as a hand lays hair in. One line each:
 *   "parts | tone | width | x,y x,y …"        ends in points; "width<" swells late, "width>" early
 * Gives the shapes of `bold/shadows.ts`, so the rest of the process does not change.
 */
import type { Shadow } from "../bold/shadows.ts"
import { trace } from "./draw.ts"

export const brushes = (text: string): Array<Shadow> => text.trim().split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => {
  const [on, tone, wd, d] = l.replace(/^\+/, "").split("|").map((q) => q.trim()) as [string, Shadow["tone"], string, string], w = Number(wd.replace(/[<>]/, "")), e = wd.endsWith("<") ? 1.7 : wd.endsWith(">") ? 0.6 : 1
  const p = trace(d, false).map((v) => v.p), n = p.length, L: Array<string> = [], R: Array<string> = []
  for (let i = 0; i < n; i += i + 4 < n ? 4 : Math.max(1, n - 1 - i)) {
    const a = p[Math.max(0, i - 2)]!, b = p[Math.min(n - 1, i + 2)]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = Math.sin(Math.PI * (i / (n - 1)) ** e) ** 0.75 * (w / 2), x = -((b[1] - a[1]) / l) * t, y = ((b[0] - a[0]) / l) * t
    L.push(`${(p[i]![0] + x).toFixed(1)},${(p[i]![1] + y).toFixed(1)}`); R.push(`${(p[i]![0] - x).toFixed(1)},${(p[i]![1] - y).toFixed(1)}`)
    if (i === n - 1) break
  }
  return { on: on.split(/\s+/), tone, d: [...L, ...R.reverse()].join(" "), ...(l.startsWith("+") ? { add: true } : {}) }
})
