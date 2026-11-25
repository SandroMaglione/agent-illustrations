/** Trim, buttons and piping lie on something: where that is in shade, so are they. */
import { blur } from "../lineart/flood.ts"

export const inherit = (map: Uint8Array, w: number, h: number, shade: Float32Array, kids: Uint8Array, on: Uint8Array, r: number): Uint8Array => {
  const N = w * h, dark = new Float32Array(N), all = new Float32Array(N), o = new Uint8Array(N)
  for (let i = 0; i < N; i++) if (on[map[i]!]) { all[i] = 1; dark[i] = shade[i]! > 0.5 ? 1 : 0 }
  const d = blur(dark, w, h, r, 2), a = blur(all, w, h, r, 2)
  for (let i = 0; i < N; i++) if (kids[map[i]!] && a[i]! > 0.02 && d[i]! / a[i]! > 0.5) o[i] = 1
  return o
}
