/**
 * The typed model is right about form and a few pixels off about outline; the drawing is right about outline. Wherever a part's visible edge
 * lies near a drawn border of its own regions, the mesh is pulled onto it, most at the edge and not at all in the middle. Depth is not touched.
 */
import type { Part, V3 } from "./mesh.ts"
import { raster } from "./raster.ts"

export const settle = (parts: ReadonlyArray<Part>, q: { w: number; h: number; map: Uint8Array; names: ReadonlyArray<string> }, groupOf: ReadonlyMap<string, string>, o: { reach?: number; soft?: number; rounds?: number } = {}): Array<Part> => {
  const { w, h, map, names } = q, reach = o.reach ?? 14, soft = o.soft ?? 7, of = names.map((n) => groupOf.get(n) ?? "bg")
  let list = [...parts]
  for (let round = 0; round < (o.rounds ?? 4); round++) {
    const B = raster(list, w, h), pulls = list.map(() => [] as Array<readonly [number, number, number, number]>), groupAt = (x: number, y: number): string => of[map[y * w + x]!]!
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      const i = y * w + x, p = B.part[i]!
      if (p < 0) continue
      const g = list[p]!.group
      // the outside: neighbours that show nothing, or another group lying behind
      let nx = 0, ny = 0
      for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const j = i + b * w + a, s = B.part[j]!; if (s < 0 || (list[s]!.group !== g && B.z[j]! < B.z[i]! - 1)) { nx += a; ny += b } }
      const l = Math.hypot(nx, ny)
      if (l < 4) continue
      nx /= l; ny /= l
      const own = (t: number): boolean => { const u = Math.round(x + nx * t), v = Math.round(y + ny * t); if (u < 0 || v < 0 || u >= w || v >= h) return false; const r = groupAt(u, v); return r === g || (r === "*" && t < 0) }
      let best: number | undefined
      for (let t = 0; t <= reach && best === undefined; t += 0.5) for (const s of t ? [t, -t] : [0]) if (own(s - 0.5) && !own(s + 1) && !own(s + 2)) { best = s; break }
      if (best !== undefined) pulls[p]!.push([x + 0.5, y + 0.5, nx * best, ny * best])
    }
    list = list.map((part, k) => {
      const P = pulls[k]!
      if (P.length < 6) return part
      const cell = soft * 3, grid = new Map<number, Array<number>>(), key = (x: number, y: number): number => Math.floor(y / cell) * 10000 + Math.floor(x / cell)
      P.forEach(([x, y], i) => { const c = key(x, y), a = grid.get(c); if (a) a.push(i); else grid.set(c, [i]) })
      const v = part.mesh.v.map((z): V3 => {
        let sx = 0, sy = 0, sw = 0, near = 1e9
        for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) for (const i of grid.get(key(z[0] + a * cell, z[1] + b * cell)) ?? []) { const [x, y, dx, dy] = P[i]!, d = Math.hypot(x - z[0], y - z[1]), g = Math.exp(-((d / soft) ** 2) / 2); sx += dx * g; sy += dy * g; sw += g; near = Math.min(near, d) }
        if (sw < 1e-3) return z
        const fall = Math.exp(-((near / (soft * 1.6)) ** 2) / 2) * 0.8
        return [z[0] + (sx / sw) * fall, z[1] + (sy / sw) * fall, z[2]]
      })
      return { ...part, mesh: { v, f: part.mesh.f } }
    })
  }
  return list
}
