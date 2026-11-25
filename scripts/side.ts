/** Images side by side at one height. node scripts/side.ts out.png 800 a.png b.png:x,y,w,h …   (crop in that image's own px) */
import { readFileSync, writeFileSync } from "node:fs"
import { bytes, dataUrl, open } from "./page.ts"

const [out, H, ...jobs] = process.argv.slice(2)
const { b, p } = await open()
const list = jobs.map((j) => { const [f, r] = j.split(":"); return { d: dataUrl(f!, readFileSync(f!)), r: r ? r.split(",").map(Number) : null } })
const d = await p.evaluate(async ([list, H]) => {
  const L = list as Array<{ d: string; r: Array<number> | null }>, h = H as number, im: Array<HTMLImageElement> = []
  for (const l of L) { const i = new Image(); i.src = l.d; await i.decode(); l.r ??= [0, 0, i.width, i.height]; im.push(i) }
  const ws = L.map((l) => Math.round((l.r![2]! * h) / l.r![3]!)), c = document.createElement("canvas")
  c.width = ws.reduce((a, b) => a + b + 8, -8); c.height = h
  const g = c.getContext("2d")!
  g.imageSmoothingQuality = "high"; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, h)
  let x = 0
  L.forEach((l, n) => { g.drawImage(im[n]!, l.r![0]!, l.r![1]!, l.r![2]!, l.r![3]!, x, 0, ws[n]!, h); x += ws[n]! + 8 })
  return c.toDataURL("image/png")
}, [list, Number(H)] as const)
writeFileSync(out!, bytes(d))
await b.close()
