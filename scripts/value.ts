/**
 * Greyscale against the target, at one head size. node scripts/value.ts out.png render.png:x,y,w,h:headpx [more]
 * Says: how the values are spread, how big the steps between planes are, how crisp their edges are, and where a piece is too flat.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { bytes, dataUrl, open } from "./page.ts"

const [out, ...jobs] = process.argv.slice(2)
const refs = [["public/refs/ref-e.png", "480,180,800,900", 290], ["public/refs/ref-f.png", "680,180,520,900", 310], ["public/refs/ref-g.png", "640,160,620,920", 290]] as const
const list = [...refs.filter(([f]) => existsSync(f)).map(([f, r, h]) => [f, r, h] as [string, string, number]), ...jobs.map((j) => { const [f, r, h] = j.split(":"); return [f!, r!, Number(h)] as [string, string, number] })]
const { b, p } = await open()
const res = await p.evaluate(async (L) => {
  const H = 250, cells: Array<HTMLCanvasElement> = [], rows: Array<string> = []
  for (const [name, src, box, head] of L as Array<[string, string, Array<number>, number]>) {
    const i = new Image(); i.src = src; await i.decode()
    const s = H / head, w = Math.round(box[2]! * s), h = Math.round(box[3]! * s), c = document.createElement("canvas"); c.width = w; c.height = h
    const g = c.getContext("2d", { willReadFrequently: true })!; g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.imageSmoothingQuality = "high"; g.drawImage(i, box[0]!, box[1]!, box[2]!, box[3]!, 0, 0, w, h)
    const D = g.getImageData(0, 0, w, h), N = w * h, V = new Float32Array(N), bg = new Uint8Array(N), st: Array<number> = []
    for (let q = 0; q < N; q++) V[q] = D.data[q * 4]! * 0.3 + D.data[q * 4 + 1]! * 0.59 + D.data[q * 4 + 2]! * 0.11
    for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x)
    for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1)
    while (st.length) { const q = st.pop()!; if (q < 0 || q >= N || bg[q] || Math.min(D.data[q * 4]!, D.data[q * 4 + 1]!, D.data[q * 4 + 2]!) < 250) continue; bg[q] = 1; const x = q % w; if (x) st.push(q - 1); if (x < w - 1) st.push(q + 1); st.push(q - w, q + w) }
    // fills only: a line is darker than what lies 3 px to both sides of it
    const line = new Uint8Array(N)
    for (let y = 4; y < h - 4; y++) for (let x = 4; x < w - 4; x++) { const q = y * w + x; for (const d of [1, w, w + 1, w - 1]) if (V[q]! < Math.min(V[q - 3 * d]!, V[q + 3 * d]!) - 14) line[q] = 1 }
    const fill: Array<number> = [], steps: Array<number> = [], width: Array<number> = []
    for (let y = 6; y < h - 6; y++) for (let x = 6; x < w - 6; x++) {
      const q = y * w + x
      if (bg[q] || line[q]) continue
      fill.push(V[q]!)
      for (const d of [1, w]) {
        // an edge between two planes: flat, jump, flat, with no line in it
        let clean = true
        for (let t = -5; t <= 5; t++) if (line[q + t * d] || bg[q + t * d]) clean = false
        if (!clean) continue
        const a = V[q - 5 * d]!, e = V[q + 5 * d]!, J = Math.abs(e - a)
        if (J < 12 || Math.abs(V[q - 5 * d]! - V[q - 3 * d]!) > 4 || Math.abs(V[q + 5 * d]! - V[q + 3 * d]!) > 4) continue
        if (Math.abs(V[q]! - (a + e) / 2) > J * 0.3) continue
        steps.push(J); width.push(J / Math.max(1, Math.abs(V[q + d]! - V[q - d]!) / 2))
      }
    }
    const pc = (a: Array<number>, f: number): number => { const t = [...a].sort((m, n) => m - n); return t.length ? Math.round(t[Math.floor(f * (t.length - 1))]!) : 0 }, share = (lo: number, hi: number): number => Math.round((100 * fill.filter((v) => v >= lo && v < hi).length) / fill.length)
    rows.push(`${name.padEnd(22)} fills p5 ${pc(fill, 0.05)} p25 ${pc(fill, 0.25)} p50 ${pc(fill, 0.5)} p75 ${pc(fill, 0.75)}  |  dark ${share(0, 85)}% mid ${share(85, 170)}% light ${share(170, 256)}%  |  step between planes ${pc(steps, 0.25)} / ${pc(steps, 0.5)} / ${pc(steps, 0.8)}  edge ${(width.reduce((m, n) => m + n, 0) / Math.max(1, width.length)).toFixed(1)} px`)
    for (let q = 0; q < N; q++) D.data[q * 4] = D.data[q * 4 + 1] = D.data[q * 4 + 2] = V[q]!
    g.putImageData(D, 0, 0); cells.push(c)
  }
  const hh = Math.max(...cells.map((q) => q.height)), o = document.createElement("canvas"); o.width = cells.reduce((m, q) => m + q.width + 8, 0); o.height = hh
  const g = o.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, o.width, hh)
  let x = 0
  for (const q of cells) { g.drawImage(q, x, 0); x += q.width + 8 }
  return { png: o.toDataURL(), rows }
}, list.map(([f, r, h]) => [f.split("/").pop()!, dataUrl(f, readFileSync(f)), r.split(",").map(Number), h]))
for (const r of res.rows) console.log(r)
writeFileSync(out!, bytes(res.png))
await b.close()
