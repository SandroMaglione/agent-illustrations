/** Per-pixel planes at analysis resolution, and the small set of raster operations the checks are built from. */
import { hsv, lstar, luminance, oklab } from "./color.ts"
import type { Img } from "./image.ts"

export type Planes = {
  w: number; h: number
  /** CIE L*, 0..100 */ L: Float32Array
  /** OKLab */ okL: Float32Array; a: Float32Array; b: Float32Array
  /** OKLab chroma */ C: Float32Array
  /** HSV */ S: Float32Array; V: Float32Array
  alpha: Float32Array
}

/** `img` must already be flattened over the page colour; `alphaFrom` keeps the original alpha for the silhouette. */
export const planes = (img: Img, alphaFrom: Img = img): Planes => {
  const n = img.w * img.h, P: Planes = { w: img.w, h: img.h, L: new Float32Array(n), okL: new Float32Array(n), a: new Float32Array(n), b: new Float32Array(n), C: new Float32Array(n), S: new Float32Array(n), V: new Float32Array(n), alpha: new Float32Array(n) }
  for (let i = 0; i < n; i++) {
    const r = img.rgba[i * 4]!, g = img.rgba[i * 4 + 1]!, b = img.rgba[i * 4 + 2]!
    P.L[i] = lstar(luminance(r, g, b))
    const [L, A, B] = oklab(r, g, b)
    P.okL[i] = L; P.a[i] = A; P.b[i] = B; P.C[i] = Math.hypot(A, B)
    const q = hsv(r, g, b)
    P.S[i] = q.s; P.V[i] = q.v
    P.alpha[i] = alphaFrom.rgba[i * 4 + 3]! / 255
  }
  return P
}

/** Separable Gaussian blur of one plane (edges clamped). */
export const blur = (src: Float32Array, w: number, h: number, sigma: number): Float32Array => {
  if (sigma <= 0.3) return Float32Array.from(src)
  const r = Math.ceil(sigma * 3), k = Float32Array.from({ length: r * 2 + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)))
  const sum = k.reduce((a, b) => a + b, 0)
  for (let i = 0; i < k.length; i++) k[i]! /= sum
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0
    for (let j = -r; j <= r; j++) s += src[y * w + Math.max(0, Math.min(w - 1, x + j))]! * k[j + r]!
    tmp[y * w + x] = s
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0
    for (let j = -r; j <= r; j++) s += tmp[Math.max(0, Math.min(h - 1, y + j)) * w + x]! * k[j + r]!
    out[y * w + x] = s
  }
  return out
}

/** Area-average a plane down by an integer-free factor to W x H. */
export const shrink = (src: Float32Array, w: number, h: number, W: number, H: number): Float32Array => {
  const out = new Float32Array(W * H), cnt = new Float32Array(W * H)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = Math.min(H - 1, Math.floor((y * H) / h)) * W + Math.min(W - 1, Math.floor((x * W) / w)); out[o]! += src[y * w + x]!; cnt[o]! += 1 }
  for (let i = 0; i < W * H; i++) out[i]! /= cnt[i]! || 1
  return out
}

export const percentile = (v: ArrayLike<number>, q: number, mask?: Uint8Array): number => {
  const a: Array<number> = []
  for (let i = 0; i < v.length; i++) if (!mask || mask[i]) a.push(v[i]!)
  if (!a.length) return 0
  a.sort((x, y) => x - y)
  return a[Math.min(a.length - 1, Math.max(0, Math.round(q * (a.length - 1))))]!
}

/** 4-connected components of a mask: label image (0 = none) and each component's area and box. */
export type Comp = { id: number; area: number; x0: number; y0: number; x1: number; y1: number; cx: number; cy: number; touchesBorder: boolean }
export const components = (mask: Uint8Array, w: number, h: number): { labels: Int32Array; comps: Array<Comp> } => {
  const labels = new Int32Array(w * h), comps: Array<Comp> = [], stack: Array<number> = []
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || labels[s]) continue
    const id = comps.length + 1, c: Comp = { id, area: 0, x0: w, y0: h, x1: 0, y1: 0, cx: 0, cy: 0, touchesBorder: false }
    labels[s] = id; stack.push(s)
    while (stack.length) {
      const p = stack.pop()!, x = p % w, y = (p - x) / w
      c.area++; c.cx += x; c.cy += y
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) c.touchesBorder = true
      if (x > 0 && mask[p - 1] && !labels[p - 1]) { labels[p - 1] = id; stack.push(p - 1) }
      if (x < w - 1 && mask[p + 1] && !labels[p + 1]) { labels[p + 1] = id; stack.push(p + 1) }
      if (y > 0 && mask[p - w] && !labels[p - w]) { labels[p - w] = id; stack.push(p - w) }
      if (y < h - 1 && mask[p + w] && !labels[p + w]) { labels[p + w] = id; stack.push(p + w) }
    }
    c.cx /= c.area; c.cy /= c.area
    comps.push(c)
  }
  return { labels, comps }
}

/** Binary dilation / erosion with a square of radius r (separable, so cheap). */
const morph = (m: Uint8Array, w: number, h: number, r: number, grow: boolean): Uint8Array => {
  const t = new Uint8Array(w * h), o = new Uint8Array(w * h), hit = grow ? 1 : 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = grow ? 0 : 1
    for (let j = Math.max(0, x - r); j <= Math.min(w - 1, x + r); j++) if (m[y * w + j] === hit) { v = hit; break }
    t[y * w + x] = v
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = grow ? 0 : 1
    for (let j = Math.max(0, y - r); j <= Math.min(h - 1, y + r); j++) if (t[j * w + x] === hit) { v = hit; break }
    o[y * w + x] = v
  }
  return o
}
export const dilate = (m: Uint8Array, w: number, h: number, r: number): Uint8Array => morph(m, w, h, r, true)
export const erode = (m: Uint8Array, w: number, h: number, r: number): Uint8Array => morph(m, w, h, r, false)

/** Bounding box of a mask, or null when empty. */
export const maskBox = (m: Uint8Array, w: number, h: number): { x: number; y: number; w: number; h: number } | null => {
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/** Deterministic PRNG (mulberry32): the same picture always gives the same palette. */
export const rng = (seed: number): (() => number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
