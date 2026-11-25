/**
 * See anything, at any size. One render, as many crops as you like.
 * node scripts/look.ts "v=rig&k=2" out.png:430,330,440,440:3 whole.png:::1       out[:x,y,w,h[:zoom]], box in line-art px
 * node scripts/look.ts "v=sheet&who=rig&box=90,0,560,480&z=3" sheet.png          sheets, thumbs and faults come out as they are
 */
import { writeFileSync } from "node:fs"
import { base, bytes, open } from "./page.ts"

const [query, ...jobs] = process.argv.slice(2), q = new URLSearchParams(query), k = Number(q.get("k") ?? 2), drawing = !["sheet", "thumbs", "faults"].includes(q.get("v") ?? "")
const { b, p } = await open()
await p.goto(`${base}?${query}${drawing ? `&raw=1${q.has("k") ? "" : "&k=2"}` : ""}`)
await p.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
for (const j of jobs) {
  const [out, box, zoom] = j.split(":")
  const d = await p.evaluate(([k, box, z]) => {
    const s = [...document.querySelectorAll("canvas")].sort((m, n) => n.width * n.height - m.width * m.height)[0]!, B = box ? (box as string).split(",").map(Number) : [0, 0, s.width / (k as number), s.height / (k as number)], Z = (z as number) || (k as number), c = document.createElement("canvas")
    c.width = Math.round(B[2]! * Z); c.height = Math.round(B[3]! * Z)
    const g = c.getContext("2d")!
    g.imageSmoothingQuality = "high"; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height)
    g.drawImage(s, B[0]! * (k as number), B[1]! * (k as number), B[2]! * (k as number), B[3]! * (k as number), 0, 0, c.width, c.height)
    return c.toDataURL("image/png")
  }, [drawing ? k : 1, box ?? "", Number(zoom ?? 0)] as const)
  writeFileSync(out!, bytes(d))
}
await b.close()
