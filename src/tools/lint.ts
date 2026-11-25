/** What can be measured about where shadows and lines meet. Nothing here knows how the shapes were made. */
import {regionsOf} from "../splash/engine.ts"
import { render } from "../bold/render.ts"
import type { Art } from "../splash/engine.ts"
import { islands, linesAnd, slivers } from "./seal.ts"

export type Faults = { gaps: number; gapPx: number; along: number; alongPct: number; edge: number; shade: number; picture: HTMLCanvasElement; at: ReadonlyArray<string> }
/** gaps: lit slivers under 5 px between a shadow and a line. along: shadow edge that runs beside a line at 2 to 6 px instead of on it. Tips, which only cross that zone, do not count. */
export const lint = async (art: Art): Promise<Faults> => {
  const k = 2, { ink, map, names, w, h } = await regionsOf(art, k), N = w * h, bg = names.indexOf("bg")
  const c = (await render(art, k, 6, "masks")).canvas, lum = c.getContext("2d")!.getImageData(0, 0, w, h).data
  const { region, ink: isInk, dLine } = linesAnd(ink, map, w, h, bg), dark = Uint8Array.from(region, (v, i) => (v && lum[i * 4]! < 200 ? 1 : 0)), lit = Uint8Array.from(region, (v, i) => (v && !dark[i] ? 1 : 0))
  const gaps = slivers(region, dark, dLine, w, h, k), near = new Uint8Array(N)
  let edge = 0, dk = 0, all = 0
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    if (!region[i]) continue
    all++; dk += dark[i]!
    const j = dark[i] ? [i - 1, i + 1, i - w, i + w].find((q) => lit[q]) : undefined
    if (j === undefined) continue
    edge++
    // the line must be on the lit side: a narrow band that starts on its line is not a fault
    if (dLine[i]! > 2 * k && dLine[i]! <= 6 * k && dLine[j]! < dLine[i]!) near[i] = 1
  }
  const along = islands(near, w).filter((q) => q.length > 16 * k), bad = along.reduce((s, q) => s + q.length, 0)
  const pic = document.createElement("canvas"), im = new ImageData(w, h)
  for (let i = 0; i < N; i++) { const v = isInk[i] ? [96, 96, 106] : !region[i] ? [255, 255, 255] : dark[i] ? [206, 210, 220] : [250, 248, 244]; im.data.set([...v, 255], i * 4) }
  for (const q of gaps) for (const i of q) im.data.set([235, 30, 60, 255], i * 4)
  for (const q of along) for (const i of q) for (const j of [i, i + 1, i + w, i + w + 1]) im.data.set([30, 90, 235, 255], j * 4)
  pic.width = w; pic.height = h
  pic.getContext("2d")!.putImageData(im, 0, 0)
  const at = [...gaps.map((q) => ["gap", q] as const), ...along.map((q) => ["along", q] as const)].sort((a, b) => b[1].length - a[1].length).slice(0, 12).map(([n, q]) => { const i = q[q.length >> 1]!; return `${n} ${Math.round((i % w) / k)},${Math.round(i / w / k)} ${names[map[i]!]} ${Math.round(q.length / k)}px` })
  return { gaps: gaps.length, gapPx: Math.round(gaps.reduce((s, q) => s + q.length, 0) / (k * k)), along: Math.round(bad / k), alongPct: Math.round((1000 * bad) / edge) / 10, edge: Math.round(edge / k), shade: Math.round((100 * dk) / all), picture: pic, at }
}
