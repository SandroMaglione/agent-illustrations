/** The target look, measured on the references: shadow is a coloured layer multiplied on top, never a greyed base. */
import { inGamut, toLch } from "../cel/color.ts"
import { smooth } from "../geo.ts"

export type RGB = readonly [number, number, number]
export type Kind = "skin" | "hair" | "cloth" | "pale" | "dark" | "leather" | "plastic" | "peel" | "leaf" | "metal" | "glass" | "flat" | "sheer"
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
export const mul = (a: RGB, m: RGB): RGB => [a[0] * m[0], a[1] * m[1], a[2] * m[2]]
export const luma = (c: RGB): number => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11
export const hexRgb = (h: string): RGB => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
export const hex = (c: RGB): string => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`
export const hsv = (c: RGB): number => { const m = Math.max(...c); return m < 1 ? 0 : (m - Math.min(...c)) / m }
const hueOf = (c: RGB): number => { const m = Math.max(...c), k = Math.min(...c), d = m - k; if (!d) return 0; const t = m === c[0] ? ((c[1] - c[2]) / d + 6) % 6 : m === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4; return t * 60 }
/** Same value, other hue: what moves inside a head of hair. */
export const turnHue = (c: RGB, by: number, chroma = 1): RGB => {
  const k = toLch(hex(c)), m = inGamut({ l: k.l, c: k.c * chroma, h: (k.h + by + 360) % 360 })
  const a = m.c * Math.cos((m.h * Math.PI) / 180), b = m.c * Math.sin((m.h * Math.PI) / 180)
  const L = (m.l + 0.3963377774 * a + 0.2158037573 * b) ** 3, M = (m.l - 0.1055613458 * a - 0.0638541728 * b) ** 3, S = (m.l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const gam = (v: number): number => 255 * (v <= 0.0031308 ? 12.92 * Math.max(0, v) : 1.055 * v ** (1 / 2.4) - 0.055)
  return [gam(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S), gam(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S), gam(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S)]
}
/** s1, s2 and half are factors on whatever colour lies below; the rest are colours. */
export type Tone = { base: RGB; neon: RGB; s1: RGB; s2: RGB; half: RGB; lt: RGB; term: RGB; bounce: RGB; gloss: RGB; ink: RGB; metal: { deep: RGB; dark: RGB; mid: RGB; light: RGB; hi: RGB } }
export const SUN: RGB = [255, 243, 214], SKY: RGB = [120, 142, 222], BLACK: RGB = [19, 15, 23]
/** The same colour, no lighter than a value: reflected light stays below the light. */
const under = (c: RGB, most: number): RGB => { const l = luma(c); return l > most ? mul(c, [most / l, most / l, most / l]) : c }
export const tone = (color: string, kind: Kind): Tone => {
  const base = hexRgb(color), l = luma(base), h = hueOf(base), s = hsv(base)
  // how warm the colour is: warm colours darken through rose, cool ones through violet blue
  const dh = Math.abs(((h - 32 + 540) % 360) - 180), warm = (1 - smooth(45, 95, dh)) * smooth(0.06, 0.28, s)
  const two = (cool: RGB, hot: RGB): RGB => mix(cool, hot, warm)
  const S: Record<Kind, readonly [RGB, RGB]> = {
    skin: [[0.85, 0.665, 0.71], [0.6, 0.37, 0.48]], hair: [two([0.66, 0.66, 0.84], [0.85, 0.655, 0.78]), two([0.42, 0.42, 0.62], [0.6, 0.4, 0.6])],
    cloth: [two([0.46, 0.52, 0.8], [0.6, 0.36, 0.62]), two([0.24, 0.27, 0.54], [0.32, 0.17, 0.44])], pale: [two([0.67, 0.685, 0.91], [0.71, 0.68, 0.9]), two([0.38, 0.4, 0.68], [0.44, 0.39, 0.66])],
    dark: [[0.5, 0.5, 0.66], [0.2, 0.2, 0.34]], leather: [two([0.54, 0.54, 0.7], [0.62, 0.49, 0.66]), two([0.26, 0.26, 0.4], [0.34, 0.24, 0.42])], plastic: [two([0.64, 0.65, 0.84], [0.78, 0.63, 0.8]), two([0.38, 0.38, 0.58], [0.5, 0.36, 0.6])],
    peel: [[0.86, 0.55, 0.85], [0.55, 0.3, 0.85]], leaf: [[0.46, 0.63, 0.72], [0.26, 0.38, 0.5]], metal: [[0.62, 0.6, 0.78], [0.36, 0.34, 0.52]], glass: [[0.6, 0.62, 0.84], [0.38, 0.4, 0.62]], flat: [[0.72, 0.7, 0.84], [0.5, 0.48, 0.64]], sheer: [[0.7, 0.66, 0.8], [0.5, 0.45, 0.64]],
  }
  const [s1, s2] = S[kind], shade = mul(base, s1)
  const cold = l < 105 ? [104, 146, 236] : kind === "skin" || kind === "peel" ? [250, 176, 218] : warm > 0.45 ? [214, 84, 214] : [156, 196, 255]
  return {
    neon: under(mix(shade, cold as unknown as RGB, l < 105 ? 0.72 : 0.66), kind === "dark" || kind === "leather" || l < 60 ? 84 : l * 0.84),
    base, s1, s2, half: kind === "skin" ? [0.965, 0.885, 0.89] : mix([1, 1, 1], s1, 0.44),
    lt: kind === "skin" ? [255, 252, 249] : mix(base, SUN, kind === "dark" || kind === "leather" ? 0.14 : kind === "hair" ? 0.42 : kind === "peel" ? 0.22 : 0.36),
    // where light turns into shade the colour is richest
    term: kind === "skin" ? [236, 172, 156] : turnHue(mix(base, shade, 0.4), warm > 0.5 ? -8 : 0, 1.35),
    bounce: kind === "skin" ? mix(shade, [246, 172, 148], 0.5) : l < 100 ? mix(shade, SKY, 0.5) : mix(shade, warm > 0.4 ? [255, 150, 110] : [150, 156, 236], 0.34),
    gloss: mix(base, l < 110 ? [170, 182, 222] : [255, 255, 255], l < 110 ? 0.32 : 0.7),
    ink: mix(mul(base, [0.3, 0.26, 0.32]), BLACK, 0.35),
    metal: { deep: mix(mul(base, [0.2, 0.17, 0.2]), BLACK, 0.4), dark: mul(base, [0.42, 0.37, 0.42]), mid: mul(base, [0.8, 0.78, 0.8]), light: mix(base, [255, 250, 236], 0.4), hi: mix(base, [255, 253, 246], 0.88) },
  }
}
