/**
 * Every form turns away from the light somewhere. Each closed patch, part or group of parts is taken as a pillow,
 * and cut into flat planes: lit, turned, and the band of reflected light. Agents add design on top; nothing is left flat.
 */
import { paperDistance } from "../bucket/segment.ts"
import { blur } from "../lineart/flood.ts"
import { aim } from "../tools/light.ts"
import type { Light } from "../tools/light.ts"
import { blocky } from "./contour.ts"

export type Form = {
  on: ReadonlyArray<string>
  /** "patch": every closed patch is its own form. "part": every part. "mass": all parts together. */
  by?: "patch" | "part" | "mass"
  /** Where the turned plane starts: 0 late, 0.5 early. 1 and more: never. */
  turn?: number
  /** Cut corners as a share of head height, and the roundness of the pillow (1 a full tube). */
  cut?: number; round?: number
}
export type Field = { u: Float32Array; lam: Float32Array; turned: Uint8Array; lit: Uint8Array; size: Float32Array }
type Regions = { ink: Float32Array; map: Uint8Array; names: ReadonlyArray<string>; w: number; h: number; seg?: Int32Array }

/** u: −1 the edge nearest the light, 1 the edge away from it. lam: how squarely the plane faces the light. */
export const volume = (q: Regions, forms: ReadonlyArray<Form>, light: Light, head: number, k: number): Field => {
  const { map, names, w, h, ink } = q, N = w * h, L = aim(light), u = new Float32Array(N), lam = new Float32Array(N).fill(1), turned = new Uint8Array(N), lit = new Uint8Array(N), size = new Float32Array(N)
  for (const f of forms) {
    const on = new Uint8Array(names.length)
    for (const n of f.on) { const i = names.indexOf(n); if (i > 0) on[i] = 1 }
    const id = new Int32Array(N), by = f.by ?? "part"
    if (by === "patch" && q.seg) {
      // a patch owns the ink around it up to the middle of the line
      const near = new Int32Array(N)
      const st: Array<number> = []
      for (let i = 0; i < N; i++) if (on[map[i]!] && q.seg[i]) { near[i] = q.seg[i]!; st.push(i) }
      for (let n = 0; n < st.length; n++) { const i = st[n]!, x = i % w; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < N && !near[j] && on[map[j]!] && map[j] === map[i]) { near[j] = near[i]!; st.push(j) } }
      id.set(near)
    } else for (let i = 0; i < N; i++) if (on[map[i]!]) id[i] = by === "mass" ? 1 : map[i]!
    const box = new Map<number, [number, number, number, number, number]>()
    for (let i = 0; i < N; i++) { const g = id[i]!; if (!g) continue; const x = i % w, y = (i / w) | 0, b = box.get(g); if (!b) box.set(g, [x, y, x, y, 1]); else { if (x < b[0]) b[0] = x; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; b[4]++ } }
    for (const [g, [x0, y0, x1, y1, n]] of box) {
      if (n < 20 * k * k) continue
      const atEdge = x0 === 0 || y0 === 0 || x1 === w - 1 || y1 === h - 1, pad = atEdge ? Math.round(head * 0.25 * k) : 3, X = x0 - pad, Y = y0 - pad, W = x1 - x0 + 1 + pad * 2, H = y1 - y0 + 1 + pad * 2, m = new Float32Array(W * H), inv = new Float32Array(W * H).fill(1)
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (id[y * w + x] === g) { const i = (y - Y) * W + x - X; m[i] = 1; inv[i] = 0 }
      // the picture's own border is not an edge of the form
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const X2 = Math.max(0, Math.min(w - 1, x + X)), Y2 = Math.max(0, Math.min(h - 1, y + Y)); if ((X2 !== x + X || Y2 !== y + Y) && id[Y2 * w + X2] === g) { m[y * W + x] = 1; inv[y * W + x] = 0 } }
      const d = paperDistance(inv, W, H, 0.5)
      let D = 0
      for (let i = 0; i < d.length; i++) if (d[i]! > D) D = d[i]!
      if (D < 1.6 * k) continue
      const R = Math.max(1, D * 0.62 * (f.round ?? 1)), b = blur(m, W, H, Math.max(1, R * 0.66), 5), T = new Uint8Array(W * H), P = new Uint8Array(W * H), scale = R * 2.1
      const t = 0.02 + (f.turn ?? 0.25) * 0.6
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x
        if (!m[i] || x + X < 0 || y + Y < 0 || x + X >= w || y + Y >= h) continue
        let nx = ((b[i - 1]! - b[i + 1]!) / 2) * scale, ny = ((b[i - W]! - b[i + W]!) / 2) * scale
        const l = Math.hypot(nx, ny)
        if (l > 1) { nx /= l; ny /= l }
        const s = nx * L.x + ny * L.y, z = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), v = -s * L.flat + z * L.z, o = (y + Y) * w + x + X
        u[o] = s; lam[o] = v; size[o] = D / k
        if (v < t) T[i] = 1
        if (v > 0.92) P[i] = 1
      }
      const B = { x: X, y: Y, w: W, h: H }, eps = Math.max(0.6 * k, Math.min((f.cut ?? 0.012) * head * k, D * 0.16))
      if ((f.turn ?? 0.25) < 1) { const c = blocky(T, B, eps, 12 * k * k); for (let i = 0; i < c.length; i++) { const x = (i % W) + X, y = ((i / W) | 0) + Y; if (c[i] && m[i] && x >= 0 && y >= 0 && x < w && y < h) turned[y * w + x] = 1 } }
      if (D > 5 * k) { const c = blocky(P, B, eps, 16 * k * k); for (let i = 0; i < c.length; i++) { const x = (i % W) + X, y = ((i / W) | 0) + Y; if (c[i] && m[i] && x >= 0 && y >= 0 && x < w && y < h) lit[y * w + x] = 1 } }
    }
  }
  void ink
  return { u, lam, turned, lit, size }
}
