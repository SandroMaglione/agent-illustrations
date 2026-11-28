/**
 * Images for the critic: RGBA 8 bit in memory, read from PNG (every colour type, bit depth and interlace), JPEG and the
 * preview inside a `.clip`. Node only, no native modules.
 */
import { readFileSync } from "node:fs"
import { extname } from "node:path"
import { inflateSync } from "node:zlib"
import jpeg from "jpeg-js"
import { encodePng } from "../layers/png.ts"
import { readClipPreview } from "./clip.ts"

export type Img = { w: number; h: number; rgba: Uint8Array }
export type Source = { path: string; kind: "png" | "jpg" | "clip"; img: Img; canvas: { w: number; h: number }; notes: Array<string> }

export const blank = (w: number, h: number, fill: [number, number, number, number] = [0, 0, 0, 0]): Img => {
  const rgba = new Uint8Array(w * h * 4)
  if (fill.some((v) => v)) for (let i = 0; i < w * h; i++) rgba.set(fill, i * 4)
  return { w, h, rgba }
}

export const SUPPORTED = [".png", ".jpg", ".jpeg", ".clip"]
export const isSupported = (path: string): boolean => SUPPORTED.includes(extname(path).toLowerCase())

/** Reads a file (never writes it). A `.clip` gives its stored preview and the size of its canvas. */
export const loadSource = (path: string): Source => {
  const ext = extname(path).toLowerCase(), raw = readFileSync(path, { flag: "r" })
  if (ext === ".clip") {
    const p = readClipPreview(raw)
    const notes = [`preview read from the .clip (canvas ${p.canvas.w}x${p.canvas.h}, preview ${p.img.w}x${p.img.h})`]
    if (p.img.w !== p.canvas.w || p.img.h !== p.canvas.h) notes.push("the preview is smaller than the canvas: crops are limited to its resolution, the redline is drawn at canvas size")
    return { path, kind: "clip", img: p.img, canvas: p.canvas, notes }
  }
  const img = ext === ".png" ? decodeAnyPng(raw) : ext === ".jpg" || ext === ".jpeg" ? decodeJpeg(raw) : null
  if (!img) throw new Error(`unsupported file type ${ext}: use ${SUPPORTED.join(", ")}`)
  return { path, kind: ext === ".png" ? "png" : "jpg", img, canvas: { w: img.w, h: img.h }, notes: [] }
}

export const decodeJpeg = (b: Uint8Array): Img => {
  const d = jpeg.decode(b, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 2048, maxResolutionInMP: 400 })
  return { w: d.width, h: d.height, rgba: new Uint8Array(d.data.buffer, d.data.byteOffset, d.data.byteLength) }
}
export const encodeJpeg = (img: Img, quality = 88): Buffer => {
  // JPEG has no alpha: flatten over white first
  const flat = flatten(img)
  return Buffer.from(jpeg.encode({ width: img.w, height: img.h, data: Buffer.from(flat.rgba) }, quality).data)
}
export const toPng = (img: Img): Buffer => encodePng(img.rgba, img.w, img.h)

/** PNG of every kind the format allows: grey, RGB, palette (with tRNS), grey+alpha, RGBA; 1-16 bit; Adam7. */
export const decodeAnyPng = (png: Uint8Array): Img => {
  const b = Buffer.from(png)
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG")
  let p = 8, w = 0, h = 0, depth = 8, type = 6, interlace = 0
  let palette: Uint8Array | null = null, trns: Uint8Array | null = null
  const parts: Array<Buffer> = []
  while (p + 8 <= b.length) {
    const n = b.readUInt32BE(p), t = b.toString("ascii", p + 4, p + 8), d = b.subarray(p + 8, p + 8 + n)
    if (t === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]!; type = d[9]!; interlace = d[12]! }
    else if (t === "PLTE") palette = new Uint8Array(d)
    else if (t === "tRNS") trns = new Uint8Array(d)
    else if (t === "IDAT") parts.push(d)
    else if (t === "IEND") break
    p += 12 + n
  }
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type as 0 | 2 | 3 | 4 | 6]
  if (!ch || !w || !h) throw new Error(`unsupported PNG (colour type ${type})`)
  const bitsPP = ch * depth, bpp = Math.max(1, bitsPP >> 3), raw = inflateSync(Buffer.concat(parts)), out = new Uint8Array(w * h * 4)
  const max = (1 << depth) - 1
  const sample = (row: Uint8Array, x: number, c: number): number => {
    if (depth === 8) return row[x * ch + c]!
    if (depth === 16) return (row[(x * ch + c) * 2]! << 8) | row[(x * ch + c) * 2 + 1]!
    const bit = (x * ch + c) * depth, byte = row[bit >> 3]!, shift = 8 - depth - (bit & 7)
    return (byte >> shift) & max
  }
  const to8 = (v: number): number => (depth === 16 ? v >> 8 : depth === 8 ? v : Math.round((v * 255) / max))
  const trnsKey = (i: number): number => (trns ? trns.length >= i * 2 + 2 ? (trns[i * 2]! << 8) | trns[i * 2 + 1]! : -1 : -1)
  const put = (row: Uint8Array, x: number, X: number, Y: number): void => {
    const o = (Y * w + X) * 4
    if (type === 3) {
      const i = sample(row, x, 0)
      out[o] = palette?.[i * 3] ?? 0; out[o + 1] = palette?.[i * 3 + 1] ?? 0; out[o + 2] = palette?.[i * 3 + 2] ?? 0; out[o + 3] = trns && i < trns.length ? trns[i]! : 255
    } else if (type === 0 || type === 4) {
      const g = sample(row, x, 0)
      out[o] = out[o + 1] = out[o + 2] = to8(g)
      out[o + 3] = type === 4 ? to8(sample(row, x, 1)) : g === trnsKey(0) ? 0 : 255
    } else {
      const r = sample(row, x, 0), gg = sample(row, x, 1), bb = sample(row, x, 2)
      out[o] = to8(r); out[o + 1] = to8(gg); out[o + 2] = to8(bb)
      out[o + 3] = type === 6 ? to8(sample(row, x, 3)) : r === trnsKey(0) && gg === trnsKey(1) && bb === trnsKey(2) ? 0 : 255
    }
  }
  let pos = 0
  // one pass: rows of `pw` pixels, placed at (x0 + i*dx, y0 + j*dy)
  const pass = (pw: number, ph: number, x0: number, y0: number, dx: number, dy: number): void => {
    if (!pw || !ph) return
    const stride = Math.ceil((pw * bitsPP) / 8)
    let prev = new Uint8Array(stride), cur = new Uint8Array(stride)
    for (let j = 0; j < ph; j++) {
      const f = raw[pos]!, s = raw.subarray(pos + 1, pos + 1 + stride)
      pos += 1 + stride
      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? cur[x - bpp]! : 0, up = prev[x]!, c = x >= bpp ? prev[x - bpp]! : 0
        let v = s[x]!
        if (f === 1) v += a
        else if (f === 2) v += up
        else if (f === 3) v += (a + up) >> 1
        else if (f === 4) { const q = a + up - c, pa = Math.abs(q - a), pb = Math.abs(q - up), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c }
        cur[x] = v & 255
      }
      for (let i = 0; i < pw; i++) put(cur, i, x0 + i * dx, y0 + j * dy)
      ;[prev, cur] = [cur, prev]
    }
  }
  if (!interlace) pass(w, h, 0, 0, 1, 1)
  else for (const [x0, y0, dx, dy] of [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]] as const) pass(Math.ceil((w - x0) / dx), Math.ceil((h - y0) / dy), x0, y0, dx, dy)
  return { w, h, rgba: out }
}

/** Over white, alpha 255: what an exported picture looks like on a page. */
export const flatten = (img: Img, bg: [number, number, number] = [255, 255, 255]): Img => {
  const o = new Uint8Array(img.rgba.length)
  for (let i = 0; i < img.w * img.h; i++) {
    const a = img.rgba[i * 4 + 3]! / 255
    for (let c = 0; c < 3; c++) o[i * 4 + c] = Math.round(img.rgba[i * 4 + c]! * a + bg[c]! * (1 - a))
    o[i * 4 + 3] = 255
  }
  return { w: img.w, h: img.h, rgba: o }
}

/** Area-average downscale (or nearest upscale) to fit `long` on the longer side. Returns the image and the factor. */
export const fit = (img: Img, long: number): { img: Img; scale: number } => {
  const s = Math.min(1, long / Math.max(img.w, img.h))
  if (s === 1) return { img, scale: 1 }
  return { img: resize(img, Math.max(1, Math.round(img.w * s)), Math.max(1, Math.round(img.h * s))), scale: s }
}

/** Box-filter resample: exact area averages when shrinking, bilinear-free nearest when growing. */
export const resize = (img: Img, W: number, H: number): Img => {
  const out = new Uint8Array(W * H * 4), sx = img.w / W, sy = img.h / H
  if (sx <= 1 && sy <= 1) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const s = (Math.min(img.h - 1, Math.floor(y * sy)) * img.w + Math.min(img.w - 1, Math.floor(x * sx))) * 4
      out.set(img.rgba.subarray(s, s + 4), (y * W + x) * 4)
    }
    return { w: W, h: H, rgba: out }
  }
  const acc = new Float64Array(5)
  for (let y = 0; y < H; y++) {
    const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy))
    for (let x = 0; x < W; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx))
      acc.fill(0)
      for (let yy = y0; yy < y1 && yy < img.h; yy++) for (let xx = x0; xx < x1 && xx < img.w; xx++) {
        const s = (yy * img.w + xx) * 4, a = img.rgba[s + 3]!
        // premultiplied, so transparent pixels do not bleed their colour
        acc[0]! += img.rgba[s]! * a; acc[1]! += img.rgba[s + 1]! * a; acc[2]! += img.rgba[s + 2]! * a; acc[3]! += a; acc[4]! += 1
      }
      const o = (y * W + x) * 4, A = acc[3]!
      if (A > 0) { out[o] = Math.round(acc[0]! / A); out[o + 1] = Math.round(acc[1]! / A); out[o + 2] = Math.round(acc[2]! / A) }
      out[o + 3] = Math.round(A / acc[4]!)
    }
  }
  return { w: W, h: H, rgba: out }
}

export const flipH = (img: Img): Img => {
  const o = new Uint8Array(img.rgba.length)
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) o.set(img.rgba.subarray((y * img.w + x) * 4, (y * img.w + x) * 4 + 4), (y * img.w + img.w - 1 - x) * 4)
  return { w: img.w, h: img.h, rgba: o }
}

export type Box = { x: number; y: number; w: number; h: number }
export const clampBox = (b: Box, W: number, H: number): Box => {
  const x = Math.max(0, Math.min(W - 1, Math.round(b.x))), y = Math.max(0, Math.min(H - 1, Math.round(b.y)))
  return { x, y, w: Math.max(1, Math.min(W - x, Math.round(b.w))), h: Math.max(1, Math.min(H - y, Math.round(b.h))) }
}
export const crop = (img: Img, b: Box): Img => {
  const c = clampBox(b, img.w, img.h), o = new Uint8Array(c.w * c.h * 4)
  for (let y = 0; y < c.h; y++) o.set(img.rgba.subarray(((c.y + y) * img.w + c.x) * 4, ((c.y + y) * img.w + c.x + c.w) * 4), y * c.w * 4)
  return { w: c.w, h: c.h, rgba: o }
}
export const scaleBox = (b: Box, s: number): Box => ({ x: b.x * s, y: b.y * s, w: b.w * s, h: b.h * s })

/** One channel (0..1) as a grey image. */
export const greyImage = (v: Float32Array, w: number, h: number, map: (x: number) => number = (x) => x): Img => {
  const o = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) { const g = Math.round(Math.max(0, Math.min(1, map(v[i]!))) * 255); o[i * 4] = o[i * 4 + 1] = o[i * 4 + 2] = g; o[i * 4 + 3] = 255 }
  return { w, h, rgba: o }
}
