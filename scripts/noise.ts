/**
 * The grain of a picture: how strong, how coarse, how coloured, per brightness, in areas with no edge near.
 * node scripts/noise.ts file[:x,y,w,h[:scale]] …   scale brings heads to one size (290 px) before measuring.
 */
import { readFileSync } from "node:fs"
import { dataUrl, open } from "./page.ts"
const { b, p } = await open()
for (const job of process.argv.slice(2)) {
  const [f, box, sc] = job.split(":")
  const r = await p.evaluate(async ([src, box, sc]) => {
    const i = new Image(); i.src = src as string; await i.decode()
    const B = box ? (box as string).split(",").map(Number) : [0, 0, i.width, i.height], s = Number(sc ?? 1), w = Math.round(B[2]! * s), h = Math.round(B[3]! * s), c = document.createElement("canvas"); c.width = w; c.height = h
    const g = c.getContext("2d", { willReadFrequently: true })!; g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.imageSmoothingQuality = "high"; g.drawImage(i, B[0]!, B[1]!, B[2]!, B[3]!, 0, 0, w, h)
    const d = g.getImageData(0, 0, w, h).data, N = w * h, Y = new Float32Array(N), U = new Float32Array(N), V = new Float32Array(N)
    for (let q = 0; q < N; q++) { Y[q] = d[q * 4]! * 0.3 + d[q * 4 + 1]! * 0.59 + d[q * 4 + 2]! * 0.11; U[q] = d[q * 4]! - Y[q]!; V[q] = d[q * 4 + 2]! - Y[q]! }
    const R = 3, bins = new Map<string, Array<number>>(), add = (k: string, v: ReadonlyArray<number>): void => { const t = bins.get(k) ?? new Array<number>(8).fill(0); v.forEach((x, e) => { t[e]! += x }); bins.set(k, t) }
    for (let y = 8; y < h - 8; y += 2) for (let x = 8; x < w - 8; x += 2) {
      const q = y * w + x
      let lo = 1e9, hi = -1e9, m = 0, mu = 0, mv = 0, n = 0
      for (let b = -R; b <= R; b++) for (let a = -R; a <= R; a++) { const j = q + b * w + a; lo = Math.min(lo, Y[j]!); hi = Math.max(hi, Y[j]!); m += Y[j]!; mu += U[j]!; mv += V[j]!; n++ }
      m /= n; mu /= n; mv /= n
      if (hi - lo > 26 || m > 252) continue // an edge, or the page
      const a = Y[q]! - m, c1 = Y[q + 1]! - m, c2 = Y[q + 2]! - m, e = U[q]! - mu, f2 = V[q]! - mv
      const sat = Math.max(Math.abs(mu), Math.abs(mv)), key = m < 45 ? "0 black" : m < 90 ? "1 dark" : m < 140 ? "2 mid dark" : m < 190 ? "3 mid" : m < 228 ? "4 light" : "5 white"
      add(key, [1, a * a, a * c1, a * c2, e * e, f2 * f2, sat, Math.abs(a) > 8 ? 1 : 0])
    }
    return [...bins].sort((m, n) => m[0].localeCompare(n[0])).map(([k, t]) => `  ${k.padEnd(11)} n ${String(t[0]).padStart(6)}  luma ${Math.sqrt(t[1]! / t[0]!).toFixed(2)}  next px ${(t[2]! / t[1]!).toFixed(2)}  2 px ${(t[3]! / t[1]!).toFixed(2)}  red ${Math.sqrt(t[4]! / t[0]!).toFixed(2)}  blue ${Math.sqrt(t[5]! / t[0]!).toFixed(2)}  specks ${((100 * t[7]!) / t[0]!).toFixed(1)}%`)
  }, [dataUrl(f!, readFileSync(f!)), box, sc] as const)
  console.log(f, box ?? ""); console.log(r.join("\n"))
}
await b.close()
