/** Z-buffer: which form is seen at every pixel, how deep it lies and which way its surface faces. */
import { cross, sub, unit } from "./mesh.ts"
import type { Part, V3 } from "./mesh.ts"

export type Buffer = { w: number; h: number; part: Int16Array; z: Float32Array; n: Float32Array; tri: Int32Array }
export const raster = (parts: ReadonlyArray<Part>, w: number, h: number, view: (v: V3) => V3 = (v) => v): Buffer => {
  const N = w * h, part = new Int16Array(N).fill(-1), z = new Float32Array(N).fill(-1e9), n = new Float32Array(N * 3), tri = new Int32Array(N).fill(-1)
  let id = 0
  parts.forEach((p, k) => {
    const v = p.mesh.v.map(view)
    for (const [ia, ib, ic] of p.mesh.f) {
      id++
      const a = v[ia]!, b = v[ib]!, c = v[ic]!, area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
      if (Math.abs(area) < 1e-6) continue
      let m = unit(cross(sub(b, a), sub(c, a)))
      if (m[2] < 0) m = [-m[0], -m[1], -m[2]]
      const x0 = Math.max(0, Math.ceil(Math.min(a[0], b[0], c[0]) - 0.5)), x1 = Math.min(w - 1, Math.floor(Math.max(a[0], b[0], c[0]) - 0.5)), y0 = Math.max(0, Math.ceil(Math.min(a[1], b[1], c[1]) - 0.5)), y1 = Math.min(h - 1, Math.floor(Math.max(a[1], b[1], c[1]) - 0.5))
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5, wb = ((px - a[0]) * (c[1] - a[1]) - (py - a[1]) * (c[0] - a[0])) / area, wc = ((b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0])) / area, wa = 1 - wb - wc
        if (wa < -1e-6 || wb < -1e-6 || wc < -1e-6) continue
        const d = wa * a[2] + wb * b[2] + wc * c[2], i = y * w + x
        if (d > z[i]!) { z[i] = d; part[i] = k; tri[i] = id; n[i * 3] = m[0]; n[i * 3 + 1] = m[1]; n[i * 3 + 2] = m[2] }
      }
    }
  })
  return { w, h, part, z, n, tri }
}
