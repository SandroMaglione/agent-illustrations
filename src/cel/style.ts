/** A style is numbers. Nothing in here knows what is being drawn. */
import { css, hueTo, tintTo, toLch } from "./color.ts"
import type { LCH } from "./color.ts"

export type Kind = "skin" | "hair" | "cloth" | "hard" | "paint"
export type Mat = { base: string; kind: Kind }
export type Style = {
  id: string; label: string
  ground: string
  /** LINE: px at 1400 wide. */
  line: { silhouette: number; outline: number; inner: number; color: "black" | "tinted" | "none"; pool: number; taper: number }
  /** VALUE: how dark the shadow step is; `cool` is how much ambient of `hue` leaks into it. */
  shade: { l: number; c: number; cool: number; hue: number; deep: number; skinL: number; skinC: number }
  /** EDGE: the width of the boundary, and an extra saturated band on skin. */
  edge: { soft: number; clothSoft: number; band: number; bandC: number; fold: number }
  light: { dir: readonly [number, number]; auto: number; rim: number; rimC: string; hi: number }
  /** SURFACE */
  grad: number; grain: number; halftone: number
  sep: number; blush: boolean; decals: boolean
  /** optional global colour remap */
  tint?: (c: LCH, kind: Kind) => LCH
  after?: "print" | "soft"
}

/** Numbers measured off the reference (see docs/earlier/style-notes.md). */
export const SPLASH: Style = {
  id: "splash", label: "Splash cel", ground: "#ffffff",
  line: { silhouette: 4, outline: 2.4, inner: 1.5, color: "black", pool: 3, taper: 1 },
  shade: { l: 0.68, c: 0.72, cool: 0.026, hue: 285, deep: 0.8, skinL: 0.79, skinC: 1.75 },
  edge: { soft: 0.5, clothSoft: 2.6, band: 5.5, bandC: 2.6, fold: 20 },
  light: { dir: [-0.56, -0.83], auto: 1, rim: 2.6, rimC: "#8fa3d8", hi: 1 },
  grad: 1, grain: 1, halftone: 0, sep: 1.5, blush: true, decals: true,
}
export const STYLES: ReadonlyArray<Style> = [
  SPLASH,
  {
    ...SPLASH, id: "cel90", label: "90s cel", ground: "#f3efe6",
    line: { silhouette: 3.6, outline: 3, inner: 2.4, color: "tinted", pool: 1.4, taper: 0.5 },
    shade: { l: 0.74, c: 0.98, cool: 0.02, hue: 320, deep: 0.86, skinL: 0.83, skinC: 2.1 },
    edge: { soft: 0.3, clothSoft: 0.3, band: 0, bandC: 1, fold: 20 },
    light: { ...SPLASH.light, rim: 0, hi: 1.2 }, grad: 0, grain: 0.35, sep: 0, after: "soft",
    tint: (c) => ({ ...c, c: c.c * 1.12 }),
  },
  {
    ...SPLASH, id: "flat", label: "Lineless poster", ground: "#f2d9a6",
    line: { silhouette: 0, outline: 0, inner: 2.2, color: "tinted", pool: 0, taper: 1 },
    shade: { l: 0.7, c: 1, cool: 0.05, hue: 340, deep: 0.82, skinL: 0.76, skinC: 2.4 },
    edge: { soft: 0.3, clothSoft: 0.3, band: 0, bandC: 1, fold: 20 },
    light: { ...SPLASH.light, auto: 1.5, rim: 0, hi: 0.8 }, grad: 0, grain: 1.5, sep: 0, blush: false,
  },
  {
    ...SPLASH, id: "manga", label: "Screentone", ground: "#fbfaf6",
    line: { silhouette: 6, outline: 3, inner: 2, color: "black", pool: 4, taper: 1 },
    shade: { l: 0.45, c: 0, cool: 0, hue: 0, deep: 0.2, skinL: 0.55, skinC: 0 },
    edge: { soft: 0.2, clothSoft: 0.2, band: 0, bandC: 1, fold: 20 },
    light: { ...SPLASH.light, rim: 0, hi: 1 }, grad: 0, grain: 0, halftone: 1, sep: 3, blush: false,
    tint: (c, k) => ({ l: k === "skin" ? 1 : c.l > 0.8 ? 1 : c.l < 0.44 ? 0.17 : c.l < 0.58 ? 0.6 : 0.9, c: 0, h: 0 }),
  },
  {
    ...SPLASH, id: "soft", label: "Soft paint", ground: "#e9edf2",
    line: { silhouette: 2, outline: 1.8, inner: 1.3, color: "tinted", pool: 1.2, taper: 1 },
    shade: { l: 0.74, c: 0.95, cool: 0.034, hue: 285, deep: 0.84, skinL: 0.8, skinC: 2 },
    edge: { soft: 9, clothSoft: 14, band: 12, bandC: 2.2, fold: 20 },
    light: { ...SPLASH.light, auto: 1.7, rim: 4, hi: 0.8 }, grad: 1.5, grain: 0.6, sep: 0,
  },
  {
    ...SPLASH, id: "dusk", label: "Dusk key", ground: "#2a2340",
    line: { silhouette: 5, outline: 2.4, inner: 1.6, color: "black", pool: 3, taper: 1 },
    shade: { l: 0.56, c: 0.5, cool: 0.085, hue: 288, deep: 0.78, skinL: 0.6, skinC: 1.8 },
    edge: { soft: 0.5, clothSoft: 1.2, band: 5, bandC: 3, fold: 20 },
    light: { dir: [-0.86, -0.5], auto: 2.6, rim: 5, rimC: "#6f7cff", hi: 1.2 }, grad: 1, grain: 1.2, sep: 0,
    tint: (c, k) => ({ l: c.l * 0.93, c: c.c * 1.05 + 0.02, h: hueTo(c.h, 55, k === "skin" ? 6 : 16) }),
  },
]

export type Tones = { base: string; top: string; low: string; shade: string; shadeTop: string; deep: string; band: string; rim: string; hi: string; line: string }
export const tones = (m: Mat, s: Style): Tones => {
  let b = toLch(m.base)
  if (s.tint) b = s.tint(b, m.kind)
  const sk = m.kind === "skin"
  const g = s.grad * (m.kind === "hair" ? 0.055 : sk ? 0.006 : m.kind === "hard" ? 0.035 : 0.022)
  // white things still need a visible shadow, black things must not vanish
  const kl = s.shade.l >= 1 ? 1 : sk ? s.shade.skinL : b.l < 0.4 ? s.shade.l + 0.1 : b.l > 0.85 ? s.shade.l + 0.12 : s.shade.l
  const body: LCH = { l: b.l * kl, c: b.c * (sk ? s.shade.skinC : s.shade.c), h: sk ? hueTo(b.h, 25, 18) : b.h }
  const shade: LCH = s.shade.c === 0 ? { ...body, c: 0 } : sk ? tintTo(body, s.shade.hue, s.shade.cool * 0.25) : tintTo(body, s.shade.hue, s.shade.cool)
  const hue = shade.h
  const c = shade.c
  return {
    base: css(b), top: css({ ...b, l: b.l + g }), low: css({ ...b, l: b.l - g * 1.1, h: b.h }),
    shade: css(shade), shadeTop: css({ ...shade, l: shade.l + g }),
    deep: css({ l: b.l * (sk ? s.shade.skinL * 0.86 : kl * s.shade.deep), c: c * 0.92, h: sk ? hue : hueTo(hue, s.shade.hue, s.shade.cool * 400) }),
    band: css({ l: b.l * (sk ? 0.915 : (1 + kl) / 2), c: b.c * s.edge.bandC, h: sk ? hueTo(b.h, 30, 20) : b.h }),
    rim: css({ l: shade.l + (1 - shade.l) * 0.28, c: 0.06, h: toLch(s.light.rimC).h }),
    hi: css({ l: Math.min(1, b.l + (m.kind === "hair" ? 0.13 : 0.1)), c: b.c * 0.7, h: b.h }),
    line: s.line.color === "tinted" ? css({ l: Math.min(0.42, b.l * 0.42), c: Math.min(0.09, b.c + 0.025), h: hueTo(b.h, 20, 20) }) : "#0d0c10",
  }
}

/** The splash style added one decision at a time, for the breakdown sheet. */
const off = { l: 1, c: 1, cool: 0, hue: 285, deep: 1, skinL: 1, skinC: 1 }
const bare: Style = {
  ...SPLASH, line: { silhouette: 0, outline: 0, inner: 0, color: "black", pool: 0, taper: 1 }, shade: off,
  edge: { soft: 0.3, clothSoft: 0.3, band: 0, bandC: 1, fold: 0 }, light: { ...SPLASH.light, auto: 0, rim: 0, hi: 0 },
  grad: 0, grain: 0, sep: 0, blush: false, decals: false,
}
const steps: ReadonlyArray<readonly [string, Partial<Style>]> = [
  ["1 Flat shapes", {}],
  ["2 One even line", { line: { silhouette: 0, outline: 1.8, inner: 1.5, color: "black", pool: 0, taper: 1 } }],
  ["3 Line hierarchy", { line: SPLASH.line }],
  ["4 One hard shadow step", { shade: SPLASH.shade, light: { ...bare.light, auto: 1 } }],
  ["5 Edges per material", { edge: SPLASH.edge, light: { ...SPLASH.light, hi: 0 } }],
  ["6 Small marks and surface", SPLASH],
]
export const STEPS: ReadonlyArray<Style> = steps.reduce<Array<Style>>((acc, [label, o]) => [...acc, { ...(acc[acc.length - 1] ?? bare), ...o, id: "splash", label }], [])
