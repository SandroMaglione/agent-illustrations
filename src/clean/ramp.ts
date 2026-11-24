/** Six tones from one base colour. Light adds warm, shadow adds cold, always as a tint vector (never a hue spin). */
import { css, hueTo, inGamut, tintTo, toLch } from "../cel/color.ts"
import type { LCH } from "../cel/color.ts"

export type RGB = readonly [number, number, number]
export type Ramp = { hi: RGB; light: RGB; base: RGB; s1: RGB; s2: RGB; s3: RGB; cold: RGB; bounce: RGB; edge: RGB; line: RGB }
export type MatKind = "skin" | "hair" | "cloth" | "hard" | "flat"
/** Hue of the key light and of the ambient that fills the shadows (OKLCH degrees). */
export const WARM = 78
export const COLD = 278

const rgb = (c: LCH): RGB => { const m = css(inGamut(c)).match(/[\d.]+/g)!.map(Number); return [m[0]!, m[1]!, m[2]!] }
/** Yellows and oranges reach cold through red and violet; tinting them straight to blue only makes mud. */
const step = (b: LCH, l: number, keep: number, cold: number): LCH => {
  const warm = b.c > 0.06 && b.h > 10 && b.h < 118
  if (!warm) return tintTo({ l: b.l * l, c: b.c * keep, h: b.h }, COLD, cold)
  const turn = (1 - l) * 130 * Math.min(1, 0.45 + Math.max(0, b.h - 20) / 90)
  const h = b.h - Math.min(turn, b.h + 25)
  return tintTo({ l: b.l * (l + 0.01), c: b.c * (0.35 + keep * 0.55), h: (h + 360) % 360 }, COLD + 12, cold * 0.9)
}

export const ramp = (hex: string, kind: MatKind): Ramp => {
  const b = toLch(hex)
  const up = 1 - b.l
  const white = b.l > 0.88
  const skin = kind === "skin"
  const k = white ? 0.05 : 0
  const s1 = skin ? tintTo({ l: b.l * 0.83, c: b.c * 1.15, h: hueTo(b.h, 20, 30) }, COLD, 0.03) : step(b, 0.8 + k, 0.86, white ? 0.042 : 0.034)
  const s2 = skin ? tintTo({ l: b.l * 0.665, c: b.c * 1.15, h: hueTo(b.h, 10, 40) }, COLD, 0.062) : step(b, 0.625 + k * 1.4, 0.74, white ? 0.072 : 0.05)
  const s3 = skin ? tintTo({ l: b.l * 0.5, c: b.c, h: hueTo(b.h, 0, 50) }, COLD, 0.085) : step(b, 0.47 + k * 1.6, 0.62, white ? 0.092 : 0.062)
  return {
    hi: rgb(tintTo({ l: Math.min(0.985, b.l + up * 0.72 + 0.05), c: b.c * 0.4, h: b.h }, WARM, 0.03)),
    light: rgb(tintTo({ l: Math.min(0.975, b.l + up * 0.32 + (b.l < 0.6 ? 0.05 : 0.015)), c: b.c * 0.96, h: hueTo(b.h, WARM, 12) }, WARM - (skin ? 12 : 0), skin ? 0.012 : 0.034)),
    base: rgb(b), s1: rgb(s1), s2: rgb(s2), s3: rgb(s3),
    cold: rgb(tintTo({ ...s1, l: s1.l * 0.965, c: s1.c * 0.85 }, 255, 0.03)),
    bounce: rgb(tintTo({ ...s2, l: s2.l + 0.13, c: s2.c * 0.7 }, 232, 0.06)),
    edge: rgb({ l: b.l * (skin ? 0.9 : 0.88), c: Math.min(0.2, b.c * (skin ? 2 : 1.25) + 0.02), h: skin ? 38 : hueTo(b.h, 40, 15) }),
    line: rgb(tintTo({ l: Math.max(0.16, b.l * (skin ? 0.34 : 0.27)), c: Math.min(0.1, b.c + (skin ? 0.05 : 0.015)), h: skin ? 25 : b.h }, COLD, 0.022)),
  }
}
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
