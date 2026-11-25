/** A cast shadow: the caster moved along the light, then given one clean edge, because an artist does not draw every tooth of the caster. */
import { blur } from "../lineart/flood.ts"
import type { Patch } from "./stamp.ts"

type Box = readonly [x0: number, y0: number, x1: number, y1: number]
export const boxesOf = (map: Uint8Array, w: number, h: number, n: number): Array<Box> => {
  const x0 = new Int32Array(n).fill(w), y0 = new Int32Array(n).fill(h), x1 = new Int32Array(n).fill(-1), y1 = new Int32Array(n).fill(-1)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const q = map[y * w + x]!; if (x < x0[q]!) x0[q] = x; if (x > x1[q]!) x1[q] = x; if (y < y0[q]!) y0[q] = y; if (y > y1[q]!) y1[q] = y }
  return Array.from({ length: n }, (_, q) => [x0[q]!, y0[q]!, x1[q]!, y1[q]!] as const)
}
/** `by` and `on` hold 1 for the parts that cast and receive; `dx`, `dy` is how far the shadow falls, `r` how calm its edge is (px). */
export const cast = (map: Uint8Array, w: number, h: number, boxes: ReadonlyArray<Box>, by: Uint8Array, on: Uint8Array, dx: number, dy: number, r: number): Patch => {
  let x0 = w, y0 = h, x1 = -1, y1 = -1, X0 = w, Y0 = h, X1 = -1, Y1 = -1
  boxes.forEach(([a, b, c, d], q) => { if (on[q] && c >= 0) { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d) } if (by[q] && c >= 0) { X0 = Math.min(X0, a); Y0 = Math.min(Y0, b); X1 = Math.max(X1, c); Y1 = Math.max(Y1, d) } })
  const pad = Math.ceil(r * 3) + 2
  x0 = Math.max(0, x0, X0 + Math.floor(Math.min(0, dx)) - pad); y0 = Math.max(0, y0, Y0 + Math.floor(Math.min(0, dy)) - pad); x1 = Math.min(w - 1, x1 + pad, X1 + Math.ceil(Math.max(0, dx)) + pad); y1 = Math.min(h - 1, y1 + pad, Y1 + Math.ceil(Math.max(0, dy)) + pad)
  const W = Math.max(0, x1 - x0 + 1), H = Math.max(0, y1 - y0 + 1), f = new Float32Array(W * H), m = new Uint8Array(W * H), n = Math.max(8, Math.ceil(Math.hypot(dx, dy)))
  if (!W || !H) return { x: 0, y: 0, w: 0, h: 0, m }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const X = x + x0, Y = y + y0, q = map[Y * w + X]!
    if (by[q]) { f[y * W + x] = 1; continue }
    if (!on[q]) continue
    for (let t = 1; t <= n; t++) { const a = Math.round(X - (dx * t) / n), b = Math.round(Y - (dy * t) / n); if (a < 0 || b < 0 || a >= w || b >= h) break; if (by[map[b * w + a]!]) { f[y * W + x] = 1; break } }
  }
  const s = r > 0 ? blur(f, W, H, r, 2) : f
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; const q = map[(y + y0) * w + x + x0]!; if (s[i]! > 0.5 && on[q] && !by[q]) m[i] = 1 }
  return { x: x0, y: y0, w: W, h: H, m }
}
