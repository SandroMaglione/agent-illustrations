/** The blockout's answers (src/form/field.ts) at the size of the render. */
import { blur } from "../lineart/flood.ts"
import { aim } from "../tools/light.ts"
import type { Light } from "../tools/light.ts"

/** lam: how squarely the surface meets the light. away: how much it faces the far side. cast: something is in between, hit: how far off it is (px of the line art). shut: how enclosed. */
export type FormField = { has: Uint8Array; lam: Float32Array; away: Float32Array; cast: Float32Array; near: Float32Array; shut: Float32Array; nx: Float32Array; ny: Float32Array; nz: Float32Array; bent: Uint8Array; light: () => void }
const loaded = new Map<string, Promise<Uint8Array>>()
export const formField = async (url: string, w0: number, h0: number, map: Uint8Array, bg: number, w: number, h: number, light: Light, head: number): Promise<FormField> => {
  if (!loaded.has(url)) loaded.set(url, fetch(`${url}?${Date.now()}`).then(async (r) => new Uint8Array(await r.arrayBuffer())))
  const d = await loaded.get(url)!, n0 = w0 * h0, L = aim(light), k = w / w0
  // casts: one clean edge at the drawing's scale, then up
  const pick = (f: (o: number) => number): Float32Array => Float32Array.from({ length: n0 }, (_, i) => (d[i * 7] ? f(i * 7) : 0))
  const hasF = pick(() => 1), spread = (a: Float32Array, r: number): Float32Array => { const x = r > 0 ? blur(a, w0, h0, r, 2) : a, y = r > 0 ? blur(hasF, w0, h0, r, 2) : hasF; return x.map((v, i) => (y[i]! > 0.02 ? v / y[i]! : 0)) }
  const src = [spread(pick((o) => (d[o + 1]! - 128) / 127), 0), spread(pick((o) => (d[o + 2]! - 128) / 127), 0), spread(pick((o) => (d[o + 4]! > 0 ? 1 : 0)), Math.max(1, head * 0.008)), spread(pick((o) => (d[o + 4]! > 0 && d[o + 4]! < head * 0.075 ? 1 : 0)), Math.max(1, head * 0.008)), spread(pick((o) => d[o + 5]! / 255), 1)]
  const N = w * h, out = src.map(() => new Float32Array(N)), has = new Uint8Array(N)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (map[i] === bg || !map[i]) continue
    const X = (x + 0.5) / k - 0.5, Y = (y + 0.5) / k - 0.5, x0 = Math.floor(X), y0 = Math.floor(Y)
    let s = 0
    for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) { const u = x0 + a, v = y0 + b; if (u < 0 || v < 0 || u >= w0 || v >= h0) continue; const j = v * w0 + u; if (!d[j * 7]) continue; const g = (1 - Math.abs(X - u)) * (1 - Math.abs(Y - v)) + 1e-4; s += g; for (let q = 0; q < src.length; q++) out[q]![i] = out[q]![i]! + src[q]![j]! * g }
    if (s > 0) { has[i] = 1; for (const o of out) o[i] = o[i]! / s }
  }
  const [nx, ny, cast, near, shut] = out as [Float32Array, Float32Array, Float32Array, Float32Array, Float32Array], lam = new Float32Array(N).fill(1), away = new Float32Array(N), nz = new Float32Array(N)
  for (let i = 0; i < N; i++) nz[i] = Math.sqrt(Math.max(0, 1 - nx[i]! ** 2 - ny[i]! ** 2))
  const lit = (): void => { for (let i = 0; i < N; i++) if (has[i]) { const l = Math.hypot(nx[i]!, ny[i]!, nz[i]!) || 1, s = (nx[i]! * L.x + ny[i]! * L.y) / l; away[i] = s; lam[i] = -s * L.flat + (nz[i]! / l) * L.z } }
  lit()
  return { has, lam, away, cast, near, shut, nx, ny, nz, bent: new Uint8Array(N), light: lit }
}
