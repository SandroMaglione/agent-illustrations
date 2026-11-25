/**
 * The last step of every drawing, always: is the value right? Colour, greyscale and three values of the render beside the references, at one
 * head size, and the same numbers for all. node scripts/finish.ts name render.png scale head cx,cy   (scale: px of the render per line-art px)
 * Writes output/bold/finish-<name>.png. Nothing is shown to anyone before this sheet was looked at.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { bytes, dataUrl, open } from "./page.ts"

const [name, file, scale, head, at] = process.argv.slice(2), [cx, cy] = at!.split(",").map(Number), { b, p } = await open()
const refs = ([["public/refs/ref-e.png", 290, 985, 360], ["public/refs/ref-f.png", 310, 890, 350], ["public/refs/ref-g.png", 290, 905, 330]] as const).filter(([f]) => existsSync(f))
await p.goto(`${(await import("./page.ts")).base}favicon.ico`)
const list = [...refs.map(([f, h, x, y]) => [f, dataUrl(f, readFileSync(f)), h, x, y] as const), [file!, dataUrl(file!, readFileSync(file!)), Number(head), cx!, cy!] as const]
const r = await p.evaluate(async ([list, name, scale]) => {
  const { artOf } = await import(/* @vite-ignore */ "/src/splash/index.ts" as string), E = await import(/* @vite-ignore */ "/src/splash/engine.ts" as string)
  const H = 230, W = 600, T = 1000, n = (list as Array<unknown>).length, c = document.createElement("canvas"); c.width = W * n; c.height = T * 3
  const g = c.getContext("2d", { willReadFrequently: true })!; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingQuality = "high"
  const rows: Array<string> = [], luma = (d: Uint8ClampedArray, q: number): number => d[q]! * 0.3 + d[q + 1]! * 0.59 + d[q + 2]! * 0.11
  for (const [e, [f, src, h, x, y]] of (list as Array<[string, string, number, number, number]>).entries()) {
    const i = new Image(); i.src = src; await i.decode()
    const s = H / h
    g.save(); g.beginPath(); g.rect(W * e, 0, W, T); g.clip(); g.drawImage(i, W * e + W / 2 - x * s, H * 0.9 - y * s, i.width * s, i.height * s); g.restore()
    const D = g.getImageData(W * e, 0, W, T), G = new ImageData(W, T), P = new ImageData(W, T), v: Array<number> = []
    const bl = document.createElement("canvas"); bl.width = W; bl.height = T; const bg = bl.getContext("2d")!; bg.filter = "blur(3px)"; bg.drawImage(c, W * e, 0, W, T, 0, 0, W, T); const B = bg.getImageData(0, 0, W, T).data
    for (let q = 0; q < W * T; q++) { const l = luma(D.data, q * 4), m = luma(B, q * 4), t = m < 85 ? 30 : m < 170 ? 128 : 235; for (let k = 0; k < 3; k++) { G.data[q * 4 + k] = l; P.data[q * 4 + k] = t } G.data[q * 4 + 3] = P.data[q * 4 + 3] = 255; if (l < 252) v.push(l) }
    g.putImageData(G, W * e, T); g.putImageData(P, W * e, T * 2)
    v.sort((a, b) => a - b); const sh = (a: number, b: number): number => Math.round((100 * v.filter((z) => z >= a && z < b).length) / v.length)
    rows.push(`${f.split("/").pop()!.padEnd(16)} dark ${sh(0, 85)}  mid ${sh(85, 170)}  light ${sh(170, 256)}   p5 ${Math.round(v[Math.floor(v.length * 0.05)]!)}  median ${Math.round(v[v.length >> 1]!)}`)
  }
  // parts of our own drawing: do the big neighbours stand apart?
  const art = await artOf(name), F = await E.fixedOf(art), [, src] = (list as Array<[string, string, number, number, number]>).at(-1)!, i = new Image(); i.src = src; await i.decode()
  const cc = document.createElement("canvas"); cc.width = F.w; cc.height = F.h; const cg = cc.getContext("2d", { willReadFrequently: true })!; cg.drawImage(i, 0, 0, (i.width / ((scale as number) * art.w)) * F.w, (i.height / ((scale as number) * art.h)) * F.h)
  const d = cg.getImageData(0, 0, F.w, F.h).data, by = new Map<string, Array<number>>()
  for (let q = 0; q < F.map.length; q += 3) { const m = F.names[F.map[q]!]; if (!m || m === "bg" || F.ink[q]! > 0.25) continue; const a = by.get(m); if (a) a.push(luma(d, q * 4)); else by.set(m, [luma(d, q * 4)]) }
  const med = (names: ReadonlyArray<string>): number => { const a = names.flatMap((m) => by.get(m) ?? []).sort((x, y) => x - y); return Math.round(a[a.length >> 1] ?? -1) }
  return { png: c.toDataURL("image/png"), rows, pairs: ((art.apart ?? []) as ReadonlyArray<readonly [string, string, number]>).map(([a, b, least]) => [a, med(a.split(" ")), b, med(b.split(" ")), least] as const) }
}, [list, name, Number(scale)] as const)
mkdirSync("output/bold", { recursive: true }); writeFileSync(`output/bold/finish-${name}.png`, bytes(r.png)); for (const t of r.rows) console.log(t)
let bad = 0
for (const [a, x, q, y, least] of r.pairs) { const ok = Math.abs(x - y) >= least; if (!ok) bad++; console.log(`  ${ok ? "ok  " : "FAIL"} ${a} ${x} | ${q} ${y}: ${Math.abs(x - y)} apart, at least ${least}`) }
await b.close(); process.exit(bad ? 1 : 0)
