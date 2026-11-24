/** One base colour per material; every other colour is derived in OKLCH by rule. */
export type LCH = { l: number; c: number; h: number }
const lin = (v: number): number => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const gam = (v: number): number => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)
export const toLch = (hex: string): LCH => {
  const n = parseInt(hex.slice(1), 16)
  const r = lin((n >> 16) / 255), g = lin(((n >> 8) & 255) / 255), b = lin((n & 255) / 255)
  const L = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const M = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const S = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const l = 0.2104542553 * L + 0.793617785 * M - 0.0040720468 * S
  const a = 1.9779984951 * L - 2.428592205 * M + 0.4505937099 * S
  const bb = 0.0259040371 * L + 0.7827717662 * M - 0.808675766 * S
  return { l, c: Math.hypot(a, bb), h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 }
}
export const css = ({ l, c, h }: LCH, alpha = 1): string => {
  const a = c * Math.cos((h * Math.PI) / 180), b = c * Math.sin((h * Math.PI) / 180)
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const v = [4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S, -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S, -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S]
  const [r, g, bl] = v.map((x) => Math.round(Math.min(1, Math.max(0, gam(Math.max(0, x)))) * 255))
  return alpha >= 1 ? `rgb(${r},${g},${bl})` : `rgba(${r},${g},${bl},${alpha})`
}
/** Pull chroma in until the colour exists in sRGB: clipping channels bends hue. */
export const inGamut = (k: LCH): LCH => {
  let c = k.c
  for (let i = 0; i < 40; i++) {
    const a = c * Math.cos((k.h * Math.PI) / 180), b = c * Math.sin((k.h * Math.PI) / 180)
    const L = (k.l + 0.3963377774 * a + 0.2158037573 * b) ** 3, M = (k.l - 0.1055613458 * a - 0.0638541728 * b) ** 3, S = (k.l - 0.0894841775 * a - 1.291485548 * b) ** 3
    const v = [4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S, -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S, -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S]
    if (v.every((x) => x >= -0.0005 && x <= 1.0005)) break
    c *= 0.94
  }
  return { ...k, c }
}
/** Add a tint vector: what a coloured ambient light does to a shadow. Never swings through green. */
export const tintTo = (k: LCH, hue: number, amount: number): LCH => {
  const r = Math.PI / 180
  const a = k.c * Math.cos(k.h * r) + amount * Math.cos(hue * r)
  const b = k.c * Math.sin(k.h * r) + amount * Math.sin(hue * r)
  return { l: k.l, c: Math.hypot(a, b), h: ((Math.atan2(b, a) / r) + 360) % 360 }
}
/** Turn a hue towards a target by at most `by` degrees. */
export const hueTo = (h: number, target: number, by: number): number => {
  let d = ((target - h + 540) % 360) - 180
  d = Math.sign(d) * Math.min(Math.abs(d), by)
  return (h + d + 360) % 360
}
