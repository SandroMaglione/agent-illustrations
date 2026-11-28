/**
 * Value: perceptual greyscale, a 3-value (notan) map, the L* histogram, and flags for muddy mid-tones.
 *
 * Greyscale is CIE L*, not an RGB average: a pixel's grey has the same perceived lightness as its colour (saturated blues
 * and reds no longer look lighter than they are). The 3-value map splits L* with a three-class Otsu threshold over the
 * figure (or the whole image when there is no reliable silhouette), so it shows the value groups the picture actually has.
 */
import { encodeSrgb, lstarToY } from "../color.ts"
import type { Img } from "../image.ts"
import type { Planes } from "../planes.ts"
import { components, percentile } from "../planes.ts"
import type { Finding } from "../stages.ts"

export type ValueMetrics = {
  over: "figure" | "image"
  p5: number; p50: number; p95: number; range: number
  /** share of pixels with L* in 30..70 */ midShare: number
  darkShare: number; lightShare: number
  thresholds: [number, number]
  /** share of pixels in the dark / mid / light group of the 3-value map */ groups: [number, number, number]
  /** mean L* of each group, and the smallest step between neighbouring groups */ means: [number, number, number]; minStep: number
  /** mid-value, low-chroma pixels: grey mud */ mudShare: number
  histogram: Array<number>
}

/** Three-class Otsu on a 0..100 histogram: the two thresholds that best separate dark, mid and light. */
export const otsu3 = (hist: ArrayLike<number>): [number, number] => {
  const n = hist.length, P = new Float64Array(n + 1), S = new Float64Array(n + 1)
  for (let i = 0; i < n; i++) { P[i + 1] = P[i]! + hist[i]!; S[i + 1] = S[i]! + hist[i]! * i }
  const T = P[n]!, mu = S[n]! / (T || 1)
  let best = -1, t1 = Math.floor(n / 3), t2 = Math.floor((2 * n) / 3)
  const cls = (a: number, b: number): number => { const w = P[b]! - P[a]!; if (w <= 0) return 0; const m = (S[b]! - S[a]!) / w; return w * (m - mu) ** 2 }
  for (let a = 1; a < n - 1; a++) for (let b = a + 1; b < n; b++) { const v = cls(0, a) + cls(a, b) + cls(b, n); if (v > best) { best = v; t1 = a; t2 = b } }
  return [t1, t2]
}

export const values = (P: Planes, fg: Uint8Array | null): { metrics: ValueMetrics; grey: Img; notan: Img; mud: Img; findings: Array<Finding> } => {
  const n = P.w * P.h, use = fg ?? new Uint8Array(n).fill(1)
  const hist = new Array<number>(101).fill(0)
  let count = 0, mid = 0, dark = 0, light = 0, mudN = 0
  const mudMask = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    if (!use[i]) continue
    const L = P.L[i]!
    hist[Math.max(0, Math.min(100, Math.round(L)))]!++; count++
    if (L >= 30 && L <= 70) mid++
    if (L < 30) dark++
    if (L > 75) light++
    // mud: a mid value with almost no chroma, the grey a colour turns into when it is mixed with its complement or black
    if (L >= 30 && L <= 70 && P.C[i]! < 0.035) { mudN++; mudMask[i] = 1 }
  }
  const N = count || 1
  const [t1, t2] = otsu3(hist)
  const groups: [number, number, number] = [0, 0, 0], sums: [number, number, number] = [0, 0, 0]
  const grey = new Uint8Array(n * 4), notan = new Uint8Array(n * 4), mud = new Uint8Array(n * 4)
  for (let i = 0; i < n; i++) {
    const L = P.L[i]!, g = encodeSrgb(lstarToY(L))
    grey[i * 4] = grey[i * 4 + 1] = grey[i * 4 + 2] = g; grey[i * 4 + 3] = 255
    const k = L < t1 ? 0 : L < t2 ? 1 : 2, v = [24, 128, 240][k]!
    notan[i * 4] = notan[i * 4 + 1] = notan[i * 4 + 2] = v; notan[i * 4 + 3] = 255
    if (use[i]) { groups[k]++; sums[k] += L }
    // mud map: the greyscale faded, mud in magenta
    const f = Math.round(g * 0.35 + 165)
    if (mudMask[i]) { mud[i * 4] = 230; mud[i * 4 + 1] = 40; mud[i * 4 + 2] = 200 } else { mud[i * 4] = mud[i * 4 + 1] = mud[i * 4 + 2] = f }
    mud[i * 4 + 3] = 255
  }
  const means = sums.map((s, k) => (groups[k] ? s / groups[k]! : NaN)) as [number, number, number]
  const minStep = Math.min(means[1] - means[0], means[2] - means[1])
  const m: ValueMetrics = {
    over: fg ? "figure" : "image",
    p5: percentile(P.L, 0.05, use), p50: percentile(P.L, 0.5, use), p95: percentile(P.L, 0.95, use), range: 0,
    midShare: mid / N, darkShare: dark / N, lightShare: light / N,
    thresholds: [t1, t2], groups: groups.map((g) => g / N) as [number, number, number], means, minStep, mudShare: mudN / N,
    histogram: hist.map((v) => v / N),
  }
  m.range = m.p95 - m.p5
  const findings: Array<Finding> = []
  const r1 = (v: number): string => v.toFixed(0), pc = (v: number): string => `${Math.round(v * 100)}%`
  const ev = `L* p5 ${r1(m.p5)}, p95 ${r1(m.p95)}, range ${r1(m.range)}; mid-tones ${pc(m.midShare)}; groups ${m.groups.map(pc).join(" / ")}`
  if (m.range < 45 || (m.midShare > 0.62 && m.range < 60))
    findings.push({ source: "measure", check: "values", severity: m.range < 35 ? "major" : "minor", title: "Values are compressed into the mid-tones", detail: `Most of the ${m.over} sits in a narrow band of lightness, so the 3-value map has no strong darks or lights to hold the shapes and the picture reads flat and muddy at thumbnail size.`, fix: "Push the darkest shadows and the lit planes apart: a Tone curve correction layer clipped over the figure folder (pull the low end down, lift the high end), or a Multiply shadow pass and an Add (Glow) light pass. Check in View > Color Profile > Preview (Greyscale) or with a Fill layer set to Color.", evidence: ev })
  if (Number.isFinite(minStep) && minStep < 18)
    findings.push({ source: "measure", check: "values", severity: minStep < 12 ? "major" : "minor", title: "Two value groups are too close", detail: `The mean lightness of neighbouring groups in the 3-value map differ by only ${r1(minStep)} L*. Shapes in those groups merge when the viewer squints.`, fix: "Decide which group each big shape belongs to (light, mid, dark) and move whole shapes, not pixels: Hue/Saturation/Luminosity on the flat layer, or a Tone curve clipped to that part's folder.", evidence: `group means ${means.map(r1).join(" / ")} L*` })
  if (m.groups.some((g) => g < 0.04))
    findings.push({ source: "measure", check: "values", severity: "minor", title: `The value plan lacks a ${["dark", "mid", "light"][m.groups.findIndex((g) => g < 0.04)]} group`, detail: "One of the three value groups covers less than 4% of the figure. A strong read usually needs all three, with one clearly dominant.", fix: "Add an accent of the missing value where you want the eye: deepest darks next to the face or the lightest light on the key-lit planes.", evidence: ev })
  if (m.mudShare > 0.22) {
    // where is the mud: the biggest blobs, for the redline
    const { comps } = components(mudMask, P.w, P.h), big = comps.filter((c) => c.area > n * 0.004).sort((a, b) => b.area - a.area).slice(0, 3)
    findings.push({ source: "measure", check: "values", severity: m.mudShare > 0.35 ? "major" : "minor", title: "Grey, low-chroma mid-tones (mud)", detail: `${pc(m.mudShare)} of the ${m.over} is a mid value with almost no chroma. In stylized anime rendering shadows usually shift hue (cooler or more saturated) instead of greying out.`, fix: "Paint shadows on a Multiply layer with a saturated, hue-shifted colour (e.g. a violet or warm red for skin) instead of grey or black, or recolour existing shadow layers with Edit > Tonal correction > Hue/Saturation/Luminosity.", evidence: `mud share ${pc(m.mudShare)} (L* 30-70, OKLab chroma < 0.035)`, region: big[0] ? { x: big[0].x0, y: big[0].y0, w: big[0].x1 - big[0].x0 + 1, h: big[0].y1 - big[0].y0 + 1 } : undefined })
  }
  return { metrics: m, grey: { w: P.w, h: P.h, rgba: grey }, notan: { w: P.w, h: P.h, rgba: notan }, mud: { w: P.w, h: P.h, rgba: mud }, findings }
}
