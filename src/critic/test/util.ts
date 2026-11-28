/** Test helpers: synthetic pictures and a PNG writer for every colour type the decoder must read. */
import { deflateSync } from "node:zlib"
import { blank, type Img } from "../image.ts"

const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (b: Uint8Array): number => { let c = 0xffffffff; for (const x of b) c = table[(c ^ x) & 255]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (t: string, d: Uint8Array): Buffer => { const l = Buffer.alloc(4), e = Buffer.alloc(4), b = Buffer.concat([Buffer.from(t), d]); l.writeUInt32BE(d.length); e.writeUInt32BE(crc(b)); return Buffer.concat([l, b, e]) }

/**
 * A PNG from rows of samples (one number per channel per pixel, already at `depth`), filter 0, optionally Adam7.
 * `sample(x, y)` returns the channel values of one pixel.
 */
export const writePng = (w: number, h: number, type: number, depth: number, sample: (x: number, y: number) => Array<number>, o: { palette?: Array<[number, number, number]>; trns?: Array<number>; interlace?: boolean } = {}): Buffer => {
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type as 0]!
  const rows = (pw: number, ph: number, x0: number, y0: number, dx: number, dy: number): Buffer => {
    const stride = Math.ceil((pw * ch * depth) / 8), out = Buffer.alloc((stride + 1) * ph)
    for (let j = 0; j < ph; j++) {
      const row = out.subarray(j * (stride + 1) + 1, (j + 1) * (stride + 1))
      for (let i = 0; i < pw; i++) sample(x0 + i * dx, y0 + j * dy).forEach((v, c) => {
        const k = i * ch + c
        if (depth === 16) row.writeUInt16BE(v, k * 2)
        else if (depth === 8) row[k] = v
        else { const bit = k * depth; row[bit >> 3]! |= v << (8 - depth - (bit & 7)) }
      })
    }
    return out
  }
  const raw = !o.interlace ? rows(w, h, 0, 0, 1, 1) : Buffer.concat(([[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]] as const).map(([x0, y0, dx, dy]) => { const pw = Math.ceil((w - x0) / dx), ph = Math.ceil((h - y0) / dy); return pw && ph ? rows(pw, ph, x0, y0, dx, dy) : Buffer.alloc(0) }))
  const head = Buffer.alloc(13)
  head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = depth; head[9] = type; head[12] = o.interlace ? 1 : 0
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head)]
  if (o.palette) parts.push(chunk("PLTE", Buffer.from(o.palette.flat())))
  if (o.trns) parts.push(chunk("tRNS", Buffer.from(o.trns)))
  parts.push(chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)))
  return Buffer.concat(parts)
}

export const px = (img: Img, x: number, y: number): Array<number> => Array.from(img.rgba.subarray((y * img.w + x) * 4, (y * img.w + x) * 4 + 4))

/** A character-sheet stand-in: white page, an outlined ellipse "figure" filled with `fill`, rotated by `deg` (top to the right when positive). */
export const figure = (o: { w?: number; h?: number; fill?: [number, number, number]; deg?: number; rx?: number; ry?: number; cx?: number; cy?: number; bg?: [number, number, number, number] } = {}): Img => {
  const w = o.w ?? 300, h = o.h ?? 420, img = blank(w, h, o.bg ?? [255, 255, 255, 255]), a = ((o.deg ?? 0) * Math.PI) / 180
  const cx = o.cx ?? w / 2, cy = o.cy ?? h / 2, rx = o.rx ?? w * 0.18, ry = o.ry ?? h * 0.4, fill = o.fill ?? [90, 120, 200]
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // rotate the point into the ellipse's frame; positive deg tilts the top to the right
    const dx = x - cx, dy = y - cy, u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a), r = (u / rx) ** 2 + (v / ry) ** 2
    if (r <= 1) img.rgba.set(r > 0.93 ? [20, 20, 25, 255] : [...fill, 255], (y * w + x) * 4)
  }
  return img
}

export const fillRect = (img: Img, x0: number, y0: number, w: number, h: number, c: [number, number, number]): void => {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) img.rgba.set([...c, 255], (y * img.w + x) * 4)
}
