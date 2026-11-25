/**
 * A crop of a picture with a grid in drawing units, to read places off a sketch.
 *   node scripts/grid.ts sketch.png out.png 1.5 x,y,w,h 6 [step]       1.5: drawing units per picture px
 * Several crops in one call: more `x,y,w,h` before the zoom.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { bytes, dataUrl, open } from "./page.ts"

const [file, out, unit, ...rest] = process.argv.slice(2), boxes = rest.filter((r) => r.includes(",")).map((r) => r.split(",").map(Number)), [zoom, step] = rest.filter((r) => !r.includes(",")).map(Number)
const { b, p } = await open()
for (const [n, box] of boxes.entries()) {
  const url = await p.evaluate(async ({ src, u, box, z, st }) => {
    const i = new Image(); i.src = src; await i.decode()
    const [x, y, w, h] = box as [number, number, number, number], c = document.createElement("canvas"); c.width = w * z; c.height = h * z
    const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingQuality = "high"; g.drawImage(i, -x * z, -y * z, i.width * u * z, i.height * u * z)
    g.font = "bold 15px system-ui"; g.textBaseline = "top"
    for (let X = Math.ceil(x / st) * st; X < x + w; X += st) { const big = X % (st * 5) === 0; g.fillStyle = big ? "rgba(220,30,60,.55)" : "rgba(40,110,220,.22)"; g.fillRect((X - x) * z, 0, big ? 2 : 1, c.height); if (big) { g.fillStyle = "#c01030"; g.fillText(String(X), (X - x) * z + 3, 2) } }
    for (let Y = Math.ceil(y / st) * st; Y < y + h; Y += st) { const big = Y % (st * 5) === 0; g.fillStyle = big ? "rgba(220,30,60,.55)" : "rgba(40,110,220,.22)"; g.fillRect(0, (Y - y) * z, c.width, big ? 2 : 1); if (big) { g.fillStyle = "#c01030"; g.fillText(String(Y), 2, (Y - y) * z + 2) } }
    return c.toDataURL()
  }, { src: dataUrl(file!, readFileSync(file!)), u: Number(unit), box, z: zoom ?? 6, st: step ?? 10 })
  writeFileSync(boxes.length > 1 ? out!.replace(/\.png$/, `-${n}.png`) : out!, bytes(url))
}
await b.close()
