/** Grey fills in a line art become paper, the lines on and around them stay. node scripts/clean.ts in.png out.png : run before anything is numbered. Black fills stay. */
import { readFileSync, writeFileSync } from "node:fs"
import { bytes, dataUrl, open } from "./page.ts"

const [src, out] = process.argv.slice(2)
const { b, p } = await open()
const r = await p.evaluate(async (d) => {
  const i = new Image(); i.src = d; await i.decode()
  const w = i.width, h = i.height, c = document.createElement("canvas"); c.width = w; c.height = h
  const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(i, 0, 0)
  const im = g.getImageData(0, 0, w, h), L = new Float32Array(w * h)
  for (let q = 0; q < L.length; q++) L[q] = im.data[q * 4]! * 0.3 + im.data[q * 4 + 1]! * 0.59 + im.data[q * 4 + 2]! * 0.11
  const filter = (a: Float32Array, R: number, f: (x: number, y: number) => number): Float32Array => { let s = a; for (const st of [1, w]) { const o = new Float32Array(s.length); for (let q = 0; q < s.length; q++) { let m = s[q]!; for (let e = 1; e <= R; e++) { if (s[q - e * st] !== undefined) m = f(m, s[q - e * st]!); if (s[q + e * st] !== undefined) m = f(m, s[q + e * st]!) } o[q] = m } s = o } return s }
  // what is left when lines up to 5 px are closed: paper, grey fill or black fill
  const bg = filter(filter(L, 2, Math.max), 2, Math.min)
  const soft = bg.map((_, q) => { let t = 0, n = 0; for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) { const o = bg[q + y * w + x]; if (o !== undefined) { t += o; n++ } } return Math.max(1, t / n) })
  let grey = 0
  for (let q = 0; q < L.length; q++) {
    if (bg[q]! < 225 && bg[q]! > 58) grey++
    const t = Math.max(0, Math.min(1, (soft[q]! - 52) / 26)), v = L[q]! + (Math.min(255, (L[q]! / soft[q]!) * 255) - L[q]!) * t, e = v > 238 ? 255 : v
    im.data[q * 4] = im.data[q * 4 + 1] = im.data[q * 4 + 2] = e
  }
  g.putImageData(im, 0, 0)
  return { png: c.toDataURL("image/png"), grey }
}, dataUrl(src!, readFileSync(src!)))
writeFileSync(out!, bytes(r.png))
console.log(`${r.grey} px of grey fill`)
await b.close()
