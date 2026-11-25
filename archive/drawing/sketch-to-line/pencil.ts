/**
 * The lines an artist's pencil left, out of a sketch: paper and noise taken off, every line followed along its own direction.
 *   node scripts/pencil.ts sketch.png outdir 4 1       4: working px per sketch px; 1: about how many sketch px a pencil line is wide
 * Writes ridge.png (the lines as they stand), and pencil.bin: per working px ridge strength, pencil darkness, direction. Read by src/draw/pencil.ts.
 */
import { execFileSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { encodePng } from "../src/layers/png.ts"

const [file, dir, scale, width] = process.argv.slice(2), K = Number(scale ?? 4), LW = Number(width ?? 1)
mkdirSync(dir!, { recursive: true })
const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", file!]).toString().trim().split(",").map(Number), w = probe[0]! * K, h = probe[1]! * K, N = w * h
const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file!, "-vf", `format=gray,scale=${w}:${h}:flags=bicubic`, "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 28 })
const I = Float32Array.from(raw)
const gauss = (src: Float32Array, s: number): Float32Array => {
  const r = Math.ceil(s * 3), k = Float32Array.from({ length: r * 2 + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * s * s))), t = new Float32Array(N), o = new Float32Array(N), sum = k.reduce((a, b) => a + b, 0)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let d = -r; d <= r; d++) v += src[y * w + Math.max(0, Math.min(w - 1, x + d))]! * k[d + r]!; t[y * w + x] = v / sum }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let d = -r; d <= r; d++) v += t[Math.max(0, Math.min(h - 1, y + d)) * w + x]! * k[d + r]!; o[y * w + x] = v / sum }
  return o
}
// paper: what is left when the dark lines are taken out of a wide mean
const coarse = gauss(I, 5 * K * LW), lit = I.map((v, i) => Math.max(v, coarse[i]! - 2)), paper = gauss(lit, 5 * K * LW), D = I.map((v, i) => Math.max(0, (paper[i]! - v) / paper[i]!))
// direction: where the darkness runs, over a neighbourhood a little wider than a line
const soft = gauss(D, 0.5 * K * Math.sqrt(LW)), a = new Float32Array(N), b = new Float32Array(N), c = new Float32Array(N)
for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, gx = soft[i + 1]! - soft[i - 1]!, gy = soft[i + w]! - soft[i - w]!; a[i] = gx * gx; b[i] = gx * gy; c[i] = gy * gy }
const A = gauss(a, 1.3 * K * LW), B = gauss(b, 1.3 * K * LW), C = gauss(c, 1.3 * K * LW), tx = new Float32Array(N), ty = new Float32Array(N)
for (let i = 0; i < N; i++) { const th = 0.5 * Math.atan2(2 * B[i]!, A[i]! - C[i]!) + Math.PI / 2; tx[i] = Math.cos(th); ty[i] = Math.sin(th) }
const at = (f: Float32Array, x: number, y: number): number => { const X = Math.max(0, Math.min(w - 1.001, x)), Y = Math.max(0, Math.min(h - 1.001, y)), x0 = X | 0, y0 = Y | 0, u = X - x0, v = Y - y0, i = y0 * w + x0; return (f[i]! * (1 - u) + f[i + 1]! * u) * (1 - v) + (f[i + w]! * (1 - u) + f[i + w + 1]! * u) * v }
// across the line: centre against its two sides, at the width of a pencil line and of a heavy one
const R = new Float32Array(N)
for (const s of [0.42 * K * LW, 0.75 * K * LW]) {
  const r = Math.ceil(s * 3), k: Array<number> = []
  for (let d = -r; d <= r; d++) k.push((1 - (d * d) / (s * s)) * Math.exp(-(d * d) / (2 * s * s)))
  const m = k.reduce((p, q) => p + q, 0) / k.length, pos = k.reduce((p, q) => p + Math.max(0, q - m), 0), kk = k.map((v) => (v - m) / pos)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (soft[i]! < 0.012) continue; let v = 0; for (let d = -r; d <= r; d++) v += at(D, x - ty[i]! * d, y + tx[i]! * d) * kk[d + r]!; if (v > R[i]!) R[i] = v }
}
// along the line: what goes on is a line, what does not is grain
const L = new Float32Array(N), reach = Math.round(3.2 * K * LW), sg = reach / 2
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = y * w + x
  if (soft[i]! < 0.012) continue
  let v = R[i]!, t = 1
  for (const dir of [1, -1]) { let X = x, Y = y, ux = tx[i]! * dir, uy = ty[i]! * dir; for (let n = 1; n <= reach; n++) { X += ux; Y += uy; if (X < 0 || Y < 0 || X >= w || Y >= h) break; const j = (Y | 0) * w + (X | 0); let vx = tx[j]!, vy = ty[j]!; if (vx * ux + vy * uy < 0) { vx = -vx; vy = -vy } if (vx * ux + vy * uy < 0.7) break; ux = vx; uy = vy; const g = Math.exp(-(n * n) / (2 * sg * sg)); v += R[j]! * g; t += g } }
  L[i] = v / t
}
const o = new Uint8Array(N * 3)
for (let i = 0; i < N; i++) { o[i * 3] = Math.max(0, Math.min(255, L[i]! * 900)); o[i * 3 + 1] = Math.max(0, Math.min(255, soft[i]! * 500)); o[i * 3 + 2] = Math.round((((Math.atan2(ty[i]!, tx[i]!) + Math.PI * 2) % Math.PI) / Math.PI) * 255) }
writeFileSync(`${dir}/pencil.bin`, Buffer.concat([Buffer.from(Uint32Array.from([w, h, K]).buffer), Buffer.from(o.buffer)]))
const px = new Uint8Array(N * 4)
for (let i = 0; i < N; i++) { const v = 255 - o[i * 3]!; px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v; px[i * 4 + 3] = 255 }
writeFileSync(`${dir}/ridge.png`, encodePng(px, w, h))
console.log(`${w}x${h}`)
