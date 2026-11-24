/** The splash look, measured on the references: pale lights, greyed shades, warmth only at the edge between them. */
import { css, hueTo, inGamut, tintTo, toLch } from "../cel/color.ts"
import type { LCH } from "../cel/color.ts"

export type RGB = readonly [number, number, number]
export type Kind = "skin" | "hair" | "cloth" | "dark" | "pale" | "sheer" | "metal" | "leaf" | "flat"
const rgb = (c: LCH): RGB => { const m = css(inGamut(c)).match(/[\d.]+/g)!.map(Number); return [m[0]!, m[1]!, m[2]!] }
/** HSV saturation of a display colour. */
export const hsv = (c: RGB): number => { const m = Math.max(...c); return m < 1 ? 0 : (m - Math.min(...c)) / m }
/** Pull chroma in until the colour is no more saturated than `cap`: shades on the references barely gain saturation. */
const capped = (c: LCH, cap: number): LCH => {
  let k = c
  for (let i = 0; i < 60 && hsv(rgb(k)) > cap; i++) k = { ...k, c: k.c * 0.95 }
  return k
}
export const hexRgb = (h: string): RGB => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
export type Tone = { base: RGB; s1: RGB; s1in: RGB; s2: RGB; s3: RGB; lt: RGB; hi: RGB; band: RGB; rim: RGB; ink: RGB; ao: RGB; outer: RGB }
export const tone = (hex: string, kind: Kind): Tone => {
  const b = toLch(hex)
  const base = rgb(b)
  if (kind === "skin") return {
    base,
    // nearest the light: rosy. Deep inside: grey-mauve. The band on the lit side: salmon.
    s1: hexRgb("#c9aaa4"), s1in: hexRgb("#b89b97"), s2: hexRgb("#a38386"), s3: hexRgb("#82626c"),
    lt: hexRgb("#fffaf7"), hi: [255, 255, 255], band: hexRgb("#e2b1a5"), rim: hexRgb("#eadfe4"), ink: hexRgb("#85635e"), ao: hexRgb("#cfa8a0"), outer: hexRgb("#654b49"),
  }
  const k: Record<Exclude<Kind, "skin">, readonly [number, number, number]> = { hair: [0.83, 0.655, 0.5], cloth: [0.7, 0.55, 0.45], dark: [0.71, 0.53, 0.42], pale: [0.86, 0.75, 0.62], sheer: [0.8, 0.64, 0.5], metal: [0.64, 0.43, 0.29], leaf: [0.76, 0.58, 0.46], flat: [0.85, 0.7, 0.55] }
  const [a, d, e] = k[kind]
  const cold = kind === "pale" ? 0.022 : kind === "hair" ? 0.012 : 0.01
  // how much saturation each shade may gain, and the floor that keeps a cool tint on greys
  const [g1, g2, g3, floor] = kind === "metal" ? [0.1, 0.2, 0.24, 0.3] : kind === "hair" ? [0.03, 0.04, 0.05, 0.17] : kind === "pale" ? [0.03, 0.05, 0.08, 0.13] : [0.04, 0.09, 0.12, 0.2]
  const cap = (g: number): number => Math.max(floor, hsv(base) + g)
  const s1 = capped(tintTo({ l: b.l * a, c: b.c * 0.92, h: b.h }, 285, cold), cap(g1))
  // the second shade heads for slate, whatever the colour was
  const s2 = capped(tintTo({ l: b.l * d, c: b.c * (kind === "hair" ? 0.55 : 0.9), h: b.h }, 270, kind === "hair" ? 0.026 : 0.016), cap(g2))
  const s3 = capped(tintTo({ l: b.l * e, c: b.c * (kind === "hair" ? 0.45 : 0.85), h: b.h }, 270, 0.026), cap(g3))
  return {
    base, s1: rgb(s1), s1in: rgb({ ...s1, l: s1.l * 0.97 }), s2: rgb(s2), s3: rgb(s3),
    lt: rgb({ l: Math.min(0.975, b.l + (kind === "hair" ? 0.095 : kind === "dark" ? 0.125 : 0.07)), c: b.c * 0.72, h: b.h }),
    hi: rgb({ l: kind === "dark" ? b.l + 0.2 : Math.min(0.99, b.l + (1 - b.l) * 0.8), c: b.c * (kind === "dark" ? 1.1 : 0.4), h: kind === "dark" ? b.h : hueTo(b.h, 80, 30) }),
    band: rgb(tintTo({ l: (b.l + s1.l) / 2, c: b.c * 0.9, h: b.h }, 48, 0.05)),
    rim: rgb(tintTo({ l: Math.min(0.92, b.l * 0.8 + 0.16), c: b.c * 0.6, h: b.h }, 285, 0.03)),
    ink: rgb(tintTo({ l: kind === "hair" ? 0.44 : Math.max(0.2, b.l * 0.36), c: b.c * 0.55, h: b.h }, 280, 0.012)), ao: rgb(s2),
    outer: rgb(tintTo({ l: kind === "hair" ? 0.35 : Math.max(0.2, Math.min(0.3, b.l * 0.42)), c: b.c * 0.6, h: b.h }, 280, 0.012)),
  }
}
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
