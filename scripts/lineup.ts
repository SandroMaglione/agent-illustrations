/** The goal, in one picture: does it fit beside the references? node scripts/lineup.ts out.png render.png headpx [cx,cy] : heads at one size, colour above, greyscale below. */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { bytes, dataUrl, open } from "./page.ts"

const [out, file, head, at] = process.argv.slice(2), H = 250
// head height and head centre in each reference, which stay local (public/refs)
const refs = [["public/refs/ref-e.png", 290, 985, 360], ["public/refs/ref-f.png", 310, 890, 350], ["public/refs/ref-g.png", 290, 905, 330]] as const
const [cx, cy] = (at ?? "0,0").split(",").map(Number), list = [...refs.slice(0, 2).map((r) => [...r] as [string, number, number, number]), [file!, Number(head), cx!, cy!] as [string, number, number, number], [...refs[2]] as [string, number, number, number]].filter(([f]) => existsSync(f))
const { b, p } = await open()
const d = await p.evaluate(async ([L, H]) => {
  const W = 620, T = 1000, c = document.createElement("canvas"); c.width = W * (L as Array<unknown>).length; c.height = T * 2
  const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingQuality = "high"
  let n = 0
  for (const [src, head, x, y] of L as Array<[string, number, number, number]>) { const i = new Image(); i.src = src; await i.decode(); const s = (H as number) / head; g.save(); g.beginPath(); g.rect(n * W, 0, W, T); g.clip(); g.drawImage(i, n * W + W / 2 - x * s, 230 - y * s, i.width * s, i.height * s); g.restore(); n++ }
  const D = g.getImageData(0, 0, c.width, T); for (let q = 0; q < D.data.length; q += 4) D.data[q] = D.data[q + 1] = D.data[q + 2] = D.data[q]! * 0.3 + D.data[q + 1]! * 0.59 + D.data[q + 2]! * 0.11
  g.putImageData(D, 0, T)
  return c.toDataURL("image/png")
}, [list.map(([f, h, x, y]) => [dataUrl(f, readFileSync(f)), h, x, y]), H] as const)
writeFileSync(out!, bytes(d))
await b.close()
