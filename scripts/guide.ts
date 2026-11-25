/**
 * What the form says, under the line art, to draw shadow shapes over: shade blue, half tone pale blue, cast shadow violet, far side of the shade teal.
 * node scripts/guide.ts name outdir zoom step piece:x,y,w,h …   (after form.ts --field)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { png } from "../src/form/png.ts"
import { execFileSync } from "node:child_process"

const [name, dir, zoom, step, ...pieces] = process.argv.slice(2).filter((a) => a !== "--plain"), plain = process.argv.includes("--plain"), Z = Number(zoom), R = JSON.parse(readFileSync(`output/form/${name}.json`, "utf8")) as { w: number; h: number; ink: string }, ink = Buffer.from(R.ink, "base64"), d = readFileSync(`public/wip/${name}-field.bin`), { w, h } = R
const art = (await import(`../src/splash/${name}-form.ts`)) as { light: { fall: readonly [number, number]; up: number } }, l = Math.hypot(...art.light.fall), z = art.light.up, f = Math.sqrt(1 - z * z), fx = art.light.fall[0] / l, fy = art.light.fall[1] / l
mkdirSync(dir!, { recursive: true })
const rgb = new Uint8Array(w * h * 3)
for (let i = 0; i < w * h; i++) {
  const o = i * 7, k = plain ? 1 : 1 - ink[i]! / 255
  let c: readonly [number, number, number] = [255, 255, 255]
  if (d[o]) { const nx = (d[o + 1]! - 128) / 127, ny = (d[o + 2]! - 128) / 127, away = nx * fx + ny * fy, lam = -away * f + Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)) * z; c = lam < 0.1 ? (away > 0.7 ? [110, 200, 200] : [130, 160, 240]) : d[o + 4] ? (d[o + 4]! < 16 ? [170, 110, 220] : [215, 180, 240]) : lam < 0.32 ? [205, 222, 255] : lam > 0.95 ? [255, 250, 205] : [255, 255, 255] }
  for (let q = 0; q < 3; q++) rgb[i * 3 + q] = c[q]! * k
}
writeFileSync(`${dir}/guide.png`, png(rgb, w, h))
for (const p of pieces) { const [id, box] = p.split(":"); execFileSync("node", ["scripts/grid.mjs", `${dir}/guide.png`, `${dir}/${id}.png`, ...box!.split(","), String(Z), step!]) }
