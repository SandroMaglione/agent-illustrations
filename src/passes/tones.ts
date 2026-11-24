/** Multipliers, not colours: a shadow is what the light does to whatever is printed there. */
import { css, hueTo, inGamut, tintTo, toLch } from "../cel/color.ts"
import type { LCH } from "../cel/color.ts"

export type RGB = readonly [number, number, number]
export type Kind = "skin" | "hair" | "cloth" | "nylon" | "denim" | "knit" | "horn" | "metal" | "gem" | "flat"
export const WARM = 80
export const COLD = 280

/** Edge from light to shade, in line-art pixels: this alone should name the material. */
export const EDGE: Readonly<Record<Kind, number>> = { skin: 0.55, hair: 0.45, cloth: 1.1, nylon: 0.7, denim: 0.95, knit: 1.4, horn: 0.4, metal: 0.35, gem: 0.35, flat: 0.4 }
export const GRAIN: Readonly<Record<Kind, number>> = { skin: 1.6, hair: 4, cloth: 6, nylon: 4.5, denim: 10, knit: 7, horn: 3, metal: 2, gem: 0, flat: 5 }

const rgb = (c: LCH): RGB => { const m = css(inGamut(c)).match(/[\d.]+/g)!.map(Number); return [m[0]!, m[1]!, m[2]!] }
const L: Readonly<Record<Kind, readonly [number, number, number]>> = {
  skin: [0.815, 0.655, 0.49], hair: [0.765, 0.605, 0.45], cloth: [0.69, 0.53, 0.4], nylon: [0.685, 0.53, 0.4], denim: [0.7, 0.55, 0.42], knit: [0.73, 0.58, 0.45], horn: [0.68, 0.5, 0.38], metal: [0.66, 0.46, 0.32], gem: [0.7, 0.5, 0.36], flat: [0.82, 0.66, 0.5],
}
export type Tone = { base: RGB; l: number; s1: RGB; s2: RGB; s3: RGB; lt: RGB; hi: RGB; band: RGB; rim: RGB; ink: RGB }
export const tone = (hex: string, kind: Kind): Tone => {
  const b = toLch(hex)
  const base = rgb(b)
  const down = (n: 0 | 1 | 2): LCH => {
    const l = b.l * L[kind][n] + (b.l < 0.4 ? 0.02 : 0)
    // skin: first shade stays in the blood, the deeper ones go to the ambient
    if (kind === "skin") return n === 0 ? { l, c: b.c + 0.034, h: hueTo(b.h, 26, 40) } : tintTo({ l, c: b.c + (n === 1 ? 0.045 : 0.03), h: hueTo(b.h, 8, 60) }, COLD, n === 1 ? 0.034 : 0.062)
    const cold = (kind === "hair" ? [0.034, 0.058, 0.074] : [0.03, 0.044, 0.056])[n]!
    // a dark cloth cannot carry as much tint as a pale one
    const air = cold * Math.min(1, 0.25 + l * 1.15)
    const warm = b.c > 0.06 && b.h > 10 && b.h < 118
    if (warm) {
      const turn = (n + 1) * 15 * Math.min(1, 0.4 + Math.max(0, b.h - 20) / 80)
      return tintTo({ l, c: b.c * (b.h < 45 ? [0.8, 0.62, 0.5] : [0.86, 0.72, 0.6])[n]!, h: (b.h - turn + 360) % 360 }, COLD + 12, air * (b.h < 45 ? 0.5 : 0.8))
    }
    return tintTo({ l, c: b.c * [0.95, 0.9, 0.85][n]!, h: b.h }, COLD, air)
  }
  const ratio = (c: LCH): RGB => { const v = rgb(c); return [v[0] / Math.max(6, base[0]), v[1] / Math.max(6, base[1]), v[2] / Math.max(6, base[2])] }
  const up = 1 - b.l
  return {
    base, l: b.l, s1: ratio(down(0)), s2: ratio(down(1)), s3: ratio(down(2)),
    lt: rgb(tintTo({ l: Math.min(0.97, b.l + Math.max(0.05, up * (kind === "hair" ? 0.72 : kind === "nylon" ? 0.46 : 0.26))), c: b.c * 0.96, h: hueTo(b.h, WARM, 10) }, WARM, kind === "skin" ? 0.012 : 0.026)),
    hi: rgb(tintTo({ l: Math.min(0.985, b.l + up * 0.8), c: b.c * 0.45, h: b.h }, WARM, 0.014)),
    band: rgb({ l: b.l * 0.925, c: b.c + 0.062, h: hueTo(b.h, 34, 40) }),
    rim: rgb(tintTo({ l: Math.min(0.9, b.l * 0.72 + 0.2), c: b.c * 0.5, h: b.h }, 238, 0.05)),
    ink: rgb(tintTo({ l: Math.max(0.17, b.l * L[kind][0] * 0.46), c: Math.min(0.1, b.c * 0.8 + (kind === "skin" ? 0.07 : 0.012)), h: kind === "skin" ? 28 : b.h }, kind === "skin" ? 20 : COLD, 0.02)),
  }
}
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
