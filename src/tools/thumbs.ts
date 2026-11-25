/**
 * Thumbnails: several ideas for light, value and colour, before any shape is drawn. Only regions are needed.
 * The light is guessed roughly (every mass is a blob, every overlap casts), which is enough to choose and never used in the final.
 */
import { blur } from "../lineart/flood.ts"
import { regionsOf } from "../splash/engine.ts"
import type { Art } from "../splash/engine.ts"
import { hexRgb, mix, mul, tone } from "../bold/tones.ts"
import type { RGB } from "../bold/tones.ts"
import { aim } from "./light.ts"
import type { Light } from "./light.ts"

export type Plan = {
  id: string
  /** What this idea bets on: where the eye lands and why. */
  say: string
  light: Light; focus: { x: number; y: number; rx: number; ry: number; dim: number }
  /** Colour of every part; a part left out keeps the drawing's. `page` is the background. */
  color: Readonly<Record<string, string>>; page?: string
}
/** Parts that turn as one form. A part in none of them turns on its own. */
export type Masses = ReadonlyArray<ReadonlyArray<string>>
const luma = (c: RGB): number => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11

export const thumbs = async (art: Art, plans: ReadonlyArray<Plan>, masses: Masses, size = 760): Promise<{ canvas: HTMLCanvasElement; notes: Array<string> }> => {
  const F = await regionsOf(art, 2), s = Math.min(1, size / Math.max(art.w, art.h)), w = Math.round(art.w * s), h = Math.round(art.h * s), N = w * h, bg = F.names.indexOf("bg")
  const map = new Uint8Array(N), ink = new Float32Array(N), step = F.w / w
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = Math.min(F.w - 1, Math.floor((x + 0.5) * step)), Y = Math.min(F.h - 1, Math.floor((y + 0.5) * step))
    map[y * w + x] = F.map[Y * F.w + X]!
    let a = 0, n = 0
    for (let yy = Math.floor(y * step); yy < Math.min(F.h, (y + 1) * step); yy++) for (let xx = Math.floor(x * step); xx < Math.min(F.w, (x + 1) * step); xx++) { a += F.ink[yy * F.w + xx]!; n++ }
    ink[y * w + x] = a / n
  }
  const group = new Int32Array(F.names.length)
  F.names.forEach((n, i) => { const m = masses.findIndex((q) => q.includes(n)); group[i] = m < 0 ? 1000 + i : m })
  const zOf = F.names.map((n) => art.defs[n]?.z ?? 0), skin = F.names.map((n) => art.defs[n]?.kind === "skin"), head = art.head * s
  // every mass as a soft blob: its slope is a rough direction it faces
  const nx = new Float32Array(N), ny = new Float32Array(N)
  for (const id of new Set(group)) {
    const m = Float32Array.from(map, (q) => (group[q] === id && q !== bg ? 1 : 0)), area = m.reduce((a, b) => a + b, 0)
    if (area < 30) continue
    const r = Math.max(2, Math.min(head * 0.3, Math.sqrt(area) * 0.22)), b = blur(m, w, h, r, 2)
    for (let i = w + 1; i < N - w - 1; i++) if (m[i]) { nx[i] = (b[i - 1]! - b[i + 1]!) * r * 1.6; ny[i] = (b[i - w]! - b[i + w]!) * r * 1.6 }
  }
  const cells: Array<HTMLCanvasElement> = [], notes: Array<string> = []
  for (const p of plans) {
    const L = aim(p.light), dark = new Uint8Array(N)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, q = map[i]!
      if (!q || q === bg) continue
      if (nx[i]! * L.x * L.flat + ny[i]! * L.y * L.flat > 0.2 + L.z * 0.28 + (skin[q] ? 0.3 : 0)) { dark[i] = 1; continue }
      for (let t = 1; t < head * (skin[q] ? 0.06 : 0.1); t++) { const X = Math.round(x - L.x * t), Y = Math.round(y - L.y * t); if (X < 0 || Y < 0 || X >= w || Y >= h) break; const o = map[Y * w + X]!; if (o !== q && o !== bg && zOf[o]! > zOf[q]!) { dark[i] = 1; break } }
    }
    const page: RGB = p.page ? hexRgb(p.page) : [255, 255, 255], tones = F.names.map((n) => { const d = art.defs[n]; return d ? tone(p.color[n] ?? d.color, d.kind) : null })
    const im = new ImageData(w, h), out: Array<RGB> = []
    for (let i = 0; i < N; i++) {
      const t = tones[map[i]!], far = Math.max(0, Math.min(1, (Math.hypot(((i % w) / s - p.focus.x) / p.focus.rx, (Math.floor(i / w) / s - p.focus.y) / p.focus.ry) - 0.85) / 1.45))
      let c: RGB = !t || map[i] === bg ? page : dark[i] ? mul(t.base, t.s1) : t.base
      if (map[i] !== bg) c = mix(c, [c[0] * 0.77, c[1] * 0.785, c[2] * 0.87], far * p.focus.dim)
      c = mix(c, t && map[i] !== bg ? t.ink : [40, 34, 44], Math.min(1, ink[i]! * 1.15) * 0.85)
      out.push(c)
      im.data.set([c[0], c[1], c[2], 255], i * 4)
    }
    const a = document.createElement("canvas"), v = document.createElement("canvas")
    a.width = v.width = w; a.height = v.height = h
    a.getContext("2d")!.putImageData(im, 0, 0)
    const g = v.getContext("2d", { willReadFrequently: true })!
    g.filter = `blur(${head * 0.02}px)`; g.drawImage(a, 0, 0)
    const d = g.getImageData(0, 0, w, h)
    for (let i = 0; i < N; i++) { const l = luma([d.data[i * 4]!, d.data[i * 4 + 1]!, d.data[i * 4 + 2]!]), q = l < 85 ? 24 : l < 170 ? 122 : 236; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = q }
    g.putImageData(d, 0, 0)
    const inF: Array<number> = [], outF: Array<number> = []
    for (let i = 0; i < N; i++) if (map[i] !== bg && map[i]) (Math.hypot(((i % w) / s - p.focus.x) / p.focus.rx, (Math.floor(i / w) / s - p.focus.y) / p.focus.ry) < 1.15 ? inF : outF).push(luma(out[i]!))
    const med = (l: Array<number>): number => Math.round([...l].sort((m, n) => m - n)[l.length >> 1] ?? 0), low = (l: Array<number>): number => Math.round((100 * l.filter((x) => x < 85).length) / Math.max(1, l.length))
    notes.push(`${p.id}  focus ${med(inF)} against ${med(outF)}, dark share ${low(inF)}% / ${low(outF)}%  ${p.say}`)
    const c = document.createElement("canvas"), small = Math.round(w * 0.4)
    c.width = w + small + 8; c.height = h + 74
    const k = c.getContext("2d")!
    k.fillStyle = "#fff"; k.fillRect(0, 0, c.width, c.height)
    k.drawImage(a, 0, 0); k.imageSmoothingQuality = "high"; k.drawImage(v, w + 8, 0, small, Math.round(h * 0.4)); k.drawImage(a, w + 8, Math.round(h * 0.4) + 8, Math.round(w * 0.16), Math.round(h * 0.16))
    k.strokeStyle = "#333"; k.lineWidth = 2; k.beginPath(); k.arc(w + 8 + small * 0.75, h * 0.5, 16, 0, 7); k.moveTo(w + 8 + small * 0.75, h * 0.5); k.lineTo(w + 8 + small * 0.75 + L.x * 44, h * 0.5 + L.y * 44); k.stroke()
    k.fillStyle = "#15141a"; k.font = "700 30px Helvetica"; k.fillText(p.id.toUpperCase(), 10, h + 36); k.font = "15px Helvetica"
    const words = p.say.split(" "); let line = "", yy = h + 24
    for (const q of words) { if (k.measureText(`${line} ${q}`).width > c.width - 60) { k.fillText(line, 48, yy); line = ""; yy += 19 } line = line ? `${line} ${q}` : q }
    k.fillText(line, 48, yy)
    cells.push(c)
  }
  const cols = Math.min(3, cells.length), cw = cells[0]!.width + 18, ch = cells[0]!.height + 12, c = document.createElement("canvas")
  c.width = cols * cw; c.height = Math.ceil(cells.length / cols) * ch
  const g = c.getContext("2d")!
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height)
  cells.forEach((q, i) => g.drawImage(q, (i % cols) * cw, Math.floor(i / cols) * ch))
  return { canvas: c, notes }
}
