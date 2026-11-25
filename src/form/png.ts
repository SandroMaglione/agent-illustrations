/** A PNG from RGB bytes, without a browser. */
import { deflateSync } from "node:zlib"
const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (b: Buffer): number => { let c = 0xffffffff; for (const x of b) c = table[(c ^ x) & 255]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (t: string, d: Buffer): Buffer => { const l = Buffer.alloc(4), e = Buffer.alloc(4), b = Buffer.concat([Buffer.from(t), d]); l.writeUInt32BE(d.length); e.writeUInt32BE(crc(b)); return Buffer.concat([l, b, e]) }
export const png = (rgb: Uint8Array, w: number, h: number): Buffer => {
  const raw = Buffer.alloc((w * 3 + 1) * h), head = Buffer.alloc(13)
  for (let y = 0; y < h; y++) Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1)
  head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))])
}
