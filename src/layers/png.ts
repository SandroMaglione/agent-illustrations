/** PNG in and out, RGBA 8 bit, without a browser. Enough for layers and for the renders Chromium writes. */
import { deflateSync, inflateSync } from "node:zlib"

const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (b: Uint8Array): number => { let c = 0xffffffff; for (const x of b) c = table[(c ^ x) & 255]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (t: string, d: Buffer): Buffer => { const l = Buffer.alloc(4), e = Buffer.alloc(4), b = Buffer.concat([Buffer.from(t), d]); l.writeUInt32BE(d.length); e.writeUInt32BE(crc(b)); return Buffer.concat([l, b, e]) }

export const encodePng = (rgba: Uint8Array, w: number, h: number): Buffer => {
  const raw = Buffer.alloc((w * 4 + 1) * h), head = Buffer.alloc(13)
  for (let y = 0; y < h; y++) raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1)
  head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))])
}

/** RGBA out of a non-interlaced 8-bit RGB or RGBA PNG. */
export const decodePng = (png: Uint8Array): { w: number; h: number; rgba: Uint8Array } => {
  const b = Buffer.from(png), parts: Array<Buffer> = []
  let p = 8, w = 0, h = 0, type = 0
  while (p < b.length) {
    const n = b.readUInt32BE(p), t = b.toString("ascii", p + 4, p + 8), d = b.subarray(p + 8, p + 8 + n)
    if (t === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); type = d[9]!; if (d[8] !== 8 || d[12] !== 0 || (type !== 2 && type !== 6)) throw new Error("only 8-bit RGB/RGBA, not interlaced") }
    if (t === "IDAT") parts.push(d)
    p += 12 + n
  }
  const bpp = type === 6 ? 4 : 3, row = w * bpp, raw = inflateSync(Buffer.concat(parts)), out = new Uint8Array(w * h * 4), cur = new Uint8Array(row), prev = new Uint8Array(row)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (row + 1)]!, s = raw.subarray(y * (row + 1) + 1, (y + 1) * (row + 1))
    for (let x = 0; x < row; x++) {
      const a = x >= bpp ? cur[x - bpp]! : 0, up = prev[x]!, c = x >= bpp ? prev[x - bpp]! : 0
      const pr = (): number => { const q = a + up - c, pa = Math.abs(q - a), pb = Math.abs(q - up), pc = Math.abs(q - c); return pa <= pb && pa <= pc ? a : pb <= pc ? up : c }
      cur[x] = (s[x]! + (f === 0 ? 0 : f === 1 ? a : f === 2 ? up : f === 3 ? (a + up) >> 1 : pr())) & 255
    }
    for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; out[o] = cur[x * bpp]!; out[o + 1] = cur[x * bpp + 1]!; out[o + 2] = cur[x * bpp + 2]!; out[o + 3] = bpp === 4 ? cur[x * bpp + 3]! : 255 }
    prev.set(cur)
  }
  return { w, h, rgba: out }
}
