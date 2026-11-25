/** Hair: bands that follow the strands. They move the hue and hardly the value. */
import { rng } from "../geo.ts"
import { blur } from "../lineart/flood.ts"

/** −1, 0 or 1 for every pixel of `on`, at `s` px per output px. The direction of a strand is read off the drawn lines around it. */
export const strands = (on: Uint8Array, ink: Float32Array, w: number, h: number, head: number): Int8Array => {
  const N = w * h, sm = blur(ink, w, h, 1, 1), xx = new Float32Array(N), yy = new Float32Array(N), xy = new Float32Array(N), out = new Int8Array(N)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (!on[i]) continue; const gx = sm[i + 1]! - sm[i - 1]!, gy = sm[i + w]! - sm[i - w]!; xx[i] = gx * gx; yy[i] = gy * gy; xy[i] = gx * gy }
  const R = Math.max(2, head * 0.035), a = blur(xx, w, h, R, 2), b = blur(yy, w, h, R, 2), c = blur(xy, w, h, R, 2)
  const r = rng("strands"), raw = new Float32Array(N)
  for (let i = 0; i < N; i++) raw[i] = r() - 0.5
  const n = blur(raw, w, h, Math.max(1, head * 0.024), 2), v = new Float32Array(N), len = head * 0.3, list: Array<number> = []
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (!on[i]) continue
    let sum = 0, cnt = 0
    for (const dir of [1, -1]) {
      let X = x, Y = y, px = 0, py = 0
      for (let t = 0; t < len; t += 1.5) {
        const q = Math.round(Y) * w + Math.round(X)
        if (X < 0 || Y < 0 || X >= w - 1 || Y >= h - 1 || !on[q]) break
        sum += n[q]!; cnt++
        // along the strand: across the gradient
        const th = 0.5 * Math.atan2(2 * c[q]!, a[q]! - b[q]!) + Math.PI / 2
        let dx = Math.cos(th), dy = Math.sin(th)
        if (t === 0) { dx *= dir; dy *= dir } else if (dx * px + dy * py < 0) { dx = -dx; dy = -dy }
        px = dx; py = dy; X += dx * 1.5; Y += dy * 1.5
      }
    }
    v[i] = sum / Math.max(1, cnt); list.push(v[i]!)
  }
  list.sort((p, q) => p - q)
  const lo = list[Math.floor(list.length * 0.3)] ?? 0, hi = list[Math.floor(list.length * 0.72)] ?? 0
  for (let i = 0; i < N; i++) if (on[i]) out[i] = v[i]! < lo ? -1 : v[i]! > hi ? 1 : 0
  return out
}
