/**
 * Fine rendering, one piece at a time: line art, colour, greyscale and shadow design of the same box, large.
 * node scripts/review.ts name outdir piece:x,y,w,h [more]   (one render for all pieces)
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { base, bytes, open } from "./page.ts"

const [name, dir, ...jobs] = process.argv.slice(2), k = 3
mkdirSync(dir!, { recursive: true })
const { b, p } = await open()
await p.goto(`${base}favicon.ico`)
const r = await p.evaluate(async ([name, jobs, k]) => {
  const { artOf } = await import(/* @vite-ignore */ "/src/splash/index.ts" as string), R = await import(/* @vite-ignore */ "/src/bold/render.ts" as string), art = await artOf(name), out: Array<[string, string]> = []
  const ink = new Image(); ink.src = art.src; await ink.decode()
  const col = (await R.render(art, k, 10)).canvas as HTMLCanvasElement, masks = (await R.render(art, 2, 6, "masks")).canvas as HTMLCanvasElement
  for (const j of jobs as Array<string>) {
    const [id, box] = j.split(":"), [x, y, w, h] = box!.split(",").map(Number) as [number, number, number, number], z = Math.min(900 / h, 900 / w), W = Math.round(w * z), H = Math.round(h * z)
    const c = document.createElement("canvas"); c.width = W * 2 + 8; c.height = H * 2 + 8
    const g = c.getContext("2d", { willReadFrequently: true })!; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingQuality = "high"
    g.drawImage(ink, x, y, w, h, 0, 0, W, H); g.drawImage(col, x * (k as number), y * (k as number), w * (k as number), h * (k as number), W + 8, 0, W, H); g.drawImage(masks, x * 2, y * 2, w * 2, h * 2, 0, H + 8, W, H); g.drawImage(col, x * (k as number), y * (k as number), w * (k as number), h * (k as number), W + 8, H + 8, W, H)
    const d = g.getImageData(W + 8, H + 8, W, H); for (let q = 0; q < d.data.length; q += 4) d.data[q] = d.data[q + 1] = d.data[q + 2] = d.data[q]! * 0.3 + d.data[q + 1]! * 0.59 + d.data[q + 2]! * 0.11
    g.putImageData(d, W + 8, H + 8); out.push([id!, c.toDataURL("image/png")])
  }
  out.push(["whole", col.toDataURL("image/png")])
  return out
}, [name, jobs, k] as const)
for (const [id, d] of r) writeFileSync(`${dir}/${id}.png`, bytes(d))
await b.close()
