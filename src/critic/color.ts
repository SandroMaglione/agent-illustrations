/** Colour maths the checks share: sRGB to linear, CIE L*, OKLab, HSV. All inputs 0..255. */

const LIN = Float32Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
export const linear = (v: number): number => LIN[v]!
export const encodeSrgb = (l: number): number => { const c = l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055; return Math.round(Math.max(0, Math.min(1, c)) * 255) }

/** Relative luminance Y (0..1) of an sRGB pixel. */
export const luminance = (r: number, g: number, b: number): number => 0.2126 * LIN[r]! + 0.7152 * LIN[g]! + 0.0722 * LIN[b]!
/** CIE L* (0..100) from Y: perceived lightness, the value a painter means. */
export const lstar = (Y: number): number => (Y > 216 / 24389 ? 116 * Math.cbrt(Y) - 16 : (24389 / 27) * Y)
export const lstarToY = (L: number): number => (L > 8 ? ((L + 16) / 116) ** 3 : L / (24389 / 27))

export type Lab = [number, number, number]
/** OKLab (L 0..1, a/b about -0.4..0.4): distances in it track how different two colours look. */
export const oklab = (r: number, g: number, b: number): Lab => {
  const R = LIN[r]!, G = LIN[g]!, B = LIN[b]!
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}
export const oklabToSrgb = ([L, a, b]: Lab): [number, number, number] => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [encodeSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), encodeSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), encodeSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)]
}
export const deltaE = (p: Lab, q: Lab): number => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])

/** HSV saturation and value, 0..1. */
export const hsv = (r: number, g: number, b: number): { h: number; s: number; v: number } => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s: mx ? d / mx : 0, v: mx / 255 }
}
export const hex = (r: number, g: number, b: number): string => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`

/** A perceptual heat ramp (dark blue, teal, yellow, red) for heatmaps, t in 0..1. */
export const heat = (t: number): [number, number, number] => {
  const stops: Array<[number, number, number, number]> = [[0, 20, 20, 60], [0.35, 30, 120, 150], [0.6, 120, 200, 90], [0.8, 250, 210, 40], [1, 235, 40, 30]]
  const x = Math.max(0, Math.min(1, t))
  for (let i = 1; i < stops.length; i++) {
    const [t1, r1, g1, b1] = stops[i]!, [t0, r0, g0, b0] = stops[i - 1]!
    if (x <= t1) { const k = (x - t0) / (t1 - t0); return [Math.round(r0 + (r1 - r0) * k), Math.round(g0 + (g1 - g0) * k), Math.round(b0 + (b1 - b0) * k)] }
  }
  return [235, 40, 30]
}
