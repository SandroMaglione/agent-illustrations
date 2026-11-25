/** Colour and luma at points. node scripts/pixel.ts file.png scale x,y x,y …   (points are multiplied by scale) */
import { readFileSync } from "node:fs"
import { dataUrl, open } from "./page.ts"

const [file, s, ...pts] = process.argv.slice(2)
const { b, p } = await open()
for (const l of await p.evaluate(async ([d, s, pts]) => {
  const i = new Image(); i.src = d as string; await i.decode()
  const c = document.createElement("canvas"); c.width = i.width; c.height = i.height
  const g = c.getContext("2d")!; g.drawImage(i, 0, 0)
  return (pts as Array<string>).map((q) => { const [x, y] = q.split(",").map(Number), t = g.getImageData(Math.round(x! * (s as number)), Math.round(y! * (s as number)), 1, 1).data; return `${q}  #${[...t].slice(0, 3).map((v) => v.toString(16).padStart(2, "0")).join("")}  luma ${Math.round(t[0]! * 0.3 + t[1]! * 0.59 + t[2]! * 0.11)}` })
}, [dataUrl(file!, readFileSync(file!)), Number(s), pts] as const)) console.log(l)
await b.close()
