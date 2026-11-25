/** Thickness: the rim of a part catches the light on one side and turns away on the other. An edge made by something lying on top is not a rim. */
import { paperDistance } from "../bucket/segment.ts"
import { blur } from "../lineart/flood.ts"

/** +1 towards the light, -1 away, for every paper pixel of `on` within `width` of its edge; 0 elsewhere. */
export const bevel = (map: Uint8Array, ink: Float32Array, w: number, h: number, on: Uint8Array, over: Uint8Array, width: number, fx: number, fy: number): Int8Array => {
  const N = w * h, o = new Int8Array(N), m = new Float32Array(N), out = new Float32Array(N)
  for (let i = 0; i < N; i++) { const solid = on[map[i]!] || over[map[i]!]; m[i] = solid ? 1 : 0; out[i] = solid && (over[map[i]!] || ink[i]! < 0.42) ? 0 : 1 }
  const d = paperDistance(out, w, h, 0.5), s = blur(m, w, h, Math.max(1.5, width * 0.8), 2)
  for (let i = w; i < N - w; i++) {
    if (!on[map[i]!] || ink[i]! >= 0.42 || d[i]! <= 0 || d[i]! > width) continue
    // the part lies uphill: downhill is the outward normal
    const gx = s[i - 1]! - s[i + 1]!, gy = s[i - w]! - s[i + w]!, l = Math.hypot(gx, gy)
    if (l < 0.004) continue
    const c = (gx * fx + gy * fy) / l
    // the rim narrows to nothing where it runs along the light
    const t = Math.min(1, Math.max(0, (Math.abs(c) - 0.12) / 0.5))
    if (d[i]! <= width * (c > 0 ? t : t * 0.8)) o[i] = c > 0 ? -1 : 1
  }
  return o
}
