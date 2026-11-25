/**
 * Form before anything else. A limb is a tube, a shoulder or a fruit is a ball: the agent says which and roughly where, the engine
 * measures the width from the drawn outline, and light on the solid gives the shade, the half tone and the far side, all from one
 * smooth field. Cast shadows, folds and facets are exceptions laid on top.
 */
import { blur } from "../lineart/flood.ts"
import { aim } from "../tools/light.ts"
import type { Light } from "../tools/light.ts"

export type Solid = {
  on: ReadonlyArray<string>
  /** Axis points "x,y x,y …" in line-art px; a third number fixes the radius there, otherwise it is measured. */
  tube?: string
  /** "x,y,r", or "x,y,rx,ry". */
  ball?: string
  /** Moves the edge of the shade: more is more shade. */
  turn?: number
}
export type SolidField = { has: Uint8Array; lam: Float32Array; away: Float32Array }
type Ring = { x: number; y: number; r: number; ax: number; ay: number }

export const solids = (q: { map: Uint8Array; names: ReadonlyArray<string>; w: number; h: number; z: ReadonlyArray<number>; bg: number }, list: ReadonlyArray<Solid>, light: Light, head: number, k: number): SolidField => {
  const { map, names, w, h, z, bg } = q, N = w * h, L = aim(light), nx = new Float32Array(N), ny = new Float32Array(N), sum = new Float32Array(N), bias = new Float32Array(N)
  for (const s of list) {
    const on = new Uint8Array(names.length)
    let low = 1e9
    for (const n of s.on) { const i = names.indexOf(n); if (i > 0) { on[i] = 1; low = Math.min(low, z[i]!) } }
    const put = (i: number, a: number, b: number, g: number): void => { nx[i] = nx[i]! + a * g; ny[i] = ny[i]! + b * g; bias[i] = bias[i]! + (s.turn ?? 0) * g; sum[i] = sum[i]! + g }
    if (s.ball) {
      const [x, y, r, r2] = s.ball.split(",").map((v) => Number(v) * k) as [number, number, number, number?], ry = r2 ?? r
      for (let Y = Math.max(0, Math.floor(y - ry * 1.35)); Y < Math.min(h, y + ry * 1.35); Y++) for (let X = Math.max(0, Math.floor(x - r * 1.35)); X < Math.min(w, x + r * 1.35); X++) {
        const i = Y * w + X
        if (!on[map[i]!]) continue
        const a = (X - x) / r, b = (Y - y) / ry, d = Math.hypot(a, b), c = d > 0.995 ? 0.995 / d : 1, g = Math.max(0, 1.35 - d) ** 2
        if (g > 0) put(i, a * c, b * c, g)
      }
    }
    if (s.tube) {
      const pts = s.tube.trim().split(/\s+/).map((t) => t.split(",").map((v) => Number(v) * k)), rings: Array<Ring> = [], seg = pts.slice(1).map((p, j) => Math.hypot(p[0]! - pts[j]![0]!, p[1]! - pts[j]![1]!)), total = seg.reduce((a, b) => a + b, 0), n = 48
      // what lies on top of a limb does not end it
      const inside = (X: number, Y: number): boolean => { const x = Math.round(X), y = Math.round(Y); if (x < 0 || y < 0 || x >= w || y >= h) return false; const m = map[y * w + x]!; return m !== bg && (on[m] === 1 || z[m]! > low) }
      const at = (d: number): [number, number, number | undefined] => { let j = 0; while (j < seg.length - 1 && d > seg[j]!) { d -= seg[j]!; j++ } const u = Math.min(1, d / (seg[j]! || 1)), A = pts[j]!, B = pts[j + 1]!; return [A[0]! + (B[0]! - A[0]!) * u, A[1]! + (B[1]! - A[1]!) * u, A[2] !== undefined && B[2] !== undefined ? A[2] + (B[2] - A[2]) * u : undefined] }
      for (let j = 0; j <= n; j++) {
        const d = (j / n) * total, [x, y, fix] = at(d), a = at(Math.max(0, d - total * 0.08)), b = at(Math.min(total, d + total * 0.08)), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ax = (b[0] - a[0]) / l, ay = (b[1] - a[1]) / l
        if (fix !== undefined) { rings.push({ x, y, r: fix, ax, ay }); continue }
        const go = (sx: number, sy: number): number => { let t = 0; while (t < head * k && inside(x + sx * t, y + sy * t)) t += 0.5; return t }
        const p = go(-ay, ax), m = go(ay, -ax)
        rings.push({ x: x - (ay * (p - m)) / 2, y: y + (ax * (p - m)) / 2, r: Math.max(1, (p + m) / 2), ax, ay })
      }
      // a buckle or a fold in the outline is not the limb: medians, then a calm line
      const calm = (f: (r: Ring) => number, set: (r: Ring, v: number) => void): void => { const v = rings.map(f), md = v.map((_, j) => { const t = v.slice(Math.max(0, j - 5), j + 6).sort((a, b) => a - b); return t[t.length >> 1]! }); for (let j = 0; j <= n; j++) { let t = 0, c = 0; for (let e = -6; e <= 6; e++) { const u = md[j + e]; if (u !== undefined) { const g = 7 - Math.abs(e); t += u * g; c += g } } set(rings[j]!, t / c) } }
      calm((r) => r.r, (r, v) => { r.r = v }); calm((r) => r.x, (r, v) => { r.x = v }); calm((r) => r.y, (r, v) => { r.y = v })
      const R = Math.max(...rings.map((r) => r.r)) * 1.3, x0 = Math.min(...rings.map((r) => r.x)) - R, x1 = Math.max(...rings.map((r) => r.x)) + R, y0 = Math.min(...rings.map((r) => r.y)) - R, y1 = Math.max(...rings.map((r) => r.y)) + R
      for (let Y = Math.max(0, Math.floor(y0)); Y < Math.min(h, y1); Y++) for (let X = Math.max(0, Math.floor(x0)); X < Math.min(w, x1); X++) {
        const i = Y * w + X
        if (!on[map[i]!]) continue
        let best: Ring = rings[0]!, bd = 1e9
        for (const r of rings) { const d = Math.hypot(X - r.x, Y - r.y) / r.r; if (d < bd) { bd = d; best = r } }
        const u = Math.max(-0.995, Math.min(0.995, (-(X - best.x) * best.ay + (Y - best.y) * best.ax) / best.r)), g = Math.max(0, 1.35 - bd) ** 2
        if (g > 0) put(i, -best.ay * u, best.ax * u, g)
      }
    }
  }
  const has = new Uint8Array(N), lam = new Float32Array(N).fill(1), away = new Float32Array(N), one = new Float32Array(N)
  for (let i = 0; i < N; i++) if (sum[i]! > 0) { has[i] = 1; one[i] = 1; nx[i] = nx[i]! / sum[i]!; ny[i] = ny[i]! / sum[i]!; bias[i] = bias[i]! / sum[i]! }
  // one calm field: where two solids meet there is no seam
  const r = Math.max(1, head * 0.012 * k), bx = blur(nx, w, h, r, 2), by = blur(ny, w, h, r, 2), bo = blur(one, w, h, r, 2)
  for (let i = 0; i < N; i++) if (has[i]) {
    const a = bx[i]! / bo[i]!, b = by[i]! / bo[i]!, s = a * L.x + b * L.y
    lam[i] = -s * L.flat + Math.sqrt(Math.max(0, 1 - a * a - b * b)) * L.z - bias[i]!; away[i] = s
  }
  return { has, lam, away }
}
