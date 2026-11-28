/** Antialiased-enough raster drawing for overlays: thick lines, discs, rings, boxes, arrows and a 5x7 pixel font. */
import type { Img } from "./image.ts"

export type RGBA = [number, number, number, number]

const blend = (img: Img, x: number, y: number, c: RGBA, cover = 1): void => {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return
  const o = (y * img.w + x) * 4, a = (c[3] / 255) * cover, A = img.rgba[o + 3]! / 255, out = a + A * (1 - a)
  if (out <= 0) return
  for (let k = 0; k < 3; k++) img.rgba[o + k] = Math.round((c[k]! * a + img.rgba[o + k]! * A * (1 - a)) / out)
  img.rgba[o + 3] = Math.round(out * 255)
}

/** Filled disc with a one-pixel soft edge. */
export const disc = (img: Img, cx: number, cy: number, r: number, c: RGBA): void => {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), cov = Math.max(0, Math.min(1, r + 0.5 - d))
    if (cov > 0) blend(img, x, y, c, cov)
  }
}

/** A thick line as a capsule: every pixel within t/2 of the segment, covered once. */
export const line = (img: Img, x0: number, y0: number, x1: number, y1: number, t: number, c: RGBA): void => {
  const r = t / 2, dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1
  for (let y = Math.floor(Math.min(y0, y1) - r - 1); y <= Math.ceil(Math.max(y0, y1) + r + 1); y++) for (let x = Math.floor(Math.min(x0, x1) - r - 1); x <= Math.ceil(Math.max(x0, x1) + r + 1); x++) {
    const px = x + 0.5, py = y + 0.5, k = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L2)), d = Math.hypot(px - (x0 + k * dx), py - (y0 + k * dy)), cov = Math.max(0, Math.min(1, r + 0.5 - d))
    if (cov > 0) blend(img, x, y, c, cov)
  }
}

export const rect = (img: Img, x: number, y: number, w: number, h: number, t: number, c: RGBA): void => {
  line(img, x, y, x + w, y, t, c); line(img, x + w, y, x + w, y + h, t, c); line(img, x + w, y + h, x, y + h, t, c); line(img, x, y + h, x, y, t, c)
}
export const ring = (img: Img, cx: number, cy: number, r: number, t: number, c: RGBA): void => {
  for (let y = Math.floor(cy - r - t); y <= Math.ceil(cy + r + t); y++) for (let x = Math.floor(cx - r - t); x <= Math.ceil(cx + r + t); x++) {
    const d = Math.abs(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r), cov = Math.max(0, Math.min(1, t / 2 + 0.5 - d))
    if (cov > 0) blend(img, x, y, c, cov)
  }
}
export const arrow = (img: Img, x0: number, y0: number, x1: number, y1: number, t: number, c: RGBA): void => {
  const a = Math.atan2(y1 - y0, x1 - x0), head = t * 5
  line(img, x0, y0, x1, y1, t, c)
  for (const s of [-1, 1]) line(img, x1, y1, x1 - head * Math.cos(a + s * 0.45), y1 - head * Math.sin(a + s * 0.45), t, c)
}

// 5x7 glyphs, one row per entry, bit 4 = leftmost column
const FONT: Record<string, Array<number>> = {
  "0": [14, 17, 19, 21, 25, 17, 14], "1": [4, 12, 4, 4, 4, 4, 14], "2": [14, 17, 1, 2, 4, 8, 31], "3": [31, 2, 4, 2, 1, 17, 14], "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14], "6": [6, 8, 16, 30, 17, 17, 14], "7": [31, 1, 2, 4, 8, 8, 8], "8": [14, 17, 17, 14, 17, 17, 14], "9": [14, 17, 17, 15, 1, 2, 12],
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [28, 18, 17, 17, 17, 18, 28], E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31], M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17], Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31], " ": [0, 0, 0, 0, 0, 0, 0], "-": [0, 0, 0, 31, 0, 0, 0], ".": [0, 0, 0, 0, 0, 12, 12], ":": [0, 12, 12, 0, 12, 12, 0], "/": [1, 1, 2, 4, 8, 16, 16],
  "?": [14, 17, 1, 2, 4, 0, 4], "!": [4, 4, 4, 4, 4, 0, 4], "%": [24, 25, 2, 4, 8, 19, 3], "+": [0, 4, 4, 31, 4, 4, 0], "(": [2, 4, 8, 8, 8, 4, 2], ")": [8, 4, 2, 2, 2, 4, 8],
}
export const textWidth = (s: string, scale: number): number => s.length * 6 * scale - scale

/** Text in the 5x7 font, `scale` pixels per font pixel, on an optional plate. */
export const text = (img: Img, s: string, x: number, y: number, scale: number, c: RGBA, plate?: RGBA): void => {
  const str = s.toUpperCase()
  if (plate) for (let yy = y - scale * 2; yy < y + 9 * scale; yy++) for (let xx = x - scale * 2; xx < x + textWidth(str, scale) + scale * 2; xx++) blend(img, Math.round(xx), Math.round(yy), plate)
  ;[...str].forEach((ch, i) => {
    const g = FONT[ch] ?? FONT["?"]!
    g.forEach((row, ry) => { for (let rx = 0; rx < 5; rx++) if (row & (16 >> rx)) for (let yy = 0; yy < scale; yy++) for (let xx = 0; xx < scale; xx++) blend(img, Math.round(x + (i * 6 + rx) * scale + xx), Math.round(y + ry * scale + yy), c) })
  })
}
