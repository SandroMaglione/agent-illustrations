/**
 * Outlines are typed by eye, so they are off by a few pixels. The drawing is not: where a form's edge passes near a drawn border of its own
 * region, it moves onto it. Only near ones, so a form that is really wrong stays visibly wrong.
 */
import type { V3 } from "./mesh.ts"

let field: { w: number; h: number; map: Uint8Array; names: ReadonlyArray<string> } | undefined
export const drawing = (f: typeof field): void => { field = f }
/** How far to move x,y along the unit direction dx,dy to reach the nearest border of the named regions, or 0. */
export const near = (on: ReadonlyArray<string>, x: number, y: number, dx: number, dy: number, reach: number): number => {
  if (!field) return 0
  const { w, h, map, names } = field, is = (t: number): boolean => { const u = Math.round(x + dx * t), v = Math.round(y + dy * t); return u >= 0 && v >= 0 && u < w && v < h && on.includes(names[map[v * w + u]!]!) }
  // outward: inside on the near side, outside beyond it
  for (let t = 0; t <= reach; t += 0.5) for (const s of t ? [t, -t] : [0]) if (is(s - 1) && !is(s + 1)) return s
  return 0
}
/** Both ends of a section, pulled onto the drawn border, then calmed along the form so that one buckle does not dent it. */
export const snapEnds = (on: ReadonlyArray<string>, ends: ReadonlyArray<readonly [V3, V3]>, reach: number): Array<readonly [V3, V3]> => {
  const u = ends.map(([a, b]) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l] as const })
  const go = (side: 0 | 1): Array<number> => { const raw = ends.map((e, i) => near(on, e[side][0], e[side][1], (side ? 1 : -1) * u[i]![0], (side ? 1 : -1) * u[i]![1], reach)); return raw.map((v, i) => { const t = [raw[i - 1] ?? v, v, raw[i + 1] ?? v].sort((a, b) => a - b); return t[1]! }) }
  const l = go(0), r = go(1)
  return ends.map(([a, b], i) => [[a[0] - u[i]![0] * l[i]!, a[1] - u[i]![1] * l[i]!, a[2]], [b[0] + u[i]![0] * r[i]!, b[1] + u[i]![1] * r[i]!, b[2]]] as const)
}
