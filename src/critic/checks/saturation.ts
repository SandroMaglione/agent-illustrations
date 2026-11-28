/**
 * Saturation: a heatmap of HSV saturation weighted by value (a dark pixel cannot shout however saturated it is), the
 * hotspots that may pull the eye from the focal point, and the dominant palette by k-means in OKLab.
 */
import { heat, hex, oklabToSrgb, type Lab } from "../color.ts"
import type { Img } from "../image.ts"
import { components, rng, type Planes } from "../planes.ts"
import type { Finding } from "../stages.ts"

export type Swatch = { hex: string; share: number; L: number; chroma: number }
export type Hotspot = { x: number; y: number; w: number; h: number; area: number; cx: number; cy: number; mean: number }
export type SatMetrics = { meanSat: number; p95Sat: number; hotShare: number; hotspots: Array<Hotspot>; palette: Array<Swatch>; over: "figure" | "image" }

/** Colourfulness of a pixel: HSV S times V, so a saturated dark counts for little. */
const loud = (P: Planes, i: number): number => P.S[i]! * Math.min(1, P.V[i]! * 1.25)

export const saturation = (P: Planes, fg: Uint8Array | null): { metrics: SatMetrics; heatmap: Img; findings: Array<Finding> } => {
  const n = P.w * P.h, use = fg ?? new Uint8Array(n).fill(1), hot = new Uint8Array(n), out = new Uint8Array(n * 4)
  let sum = 0, cnt = 0, hotN = 0
  const vals: Array<number> = []
  for (let i = 0; i < n; i++) {
    const s = loud(P, i)
    // heat over a faded greyscale, so the picture stays readable under it
    const g = P.L[i]! * 2.55 * 0.4 + 120, [r, gg, b] = heat(s), k = Math.min(1, s * 1.4)
    out[i * 4] = Math.round(g * (1 - k) + r * k); out[i * 4 + 1] = Math.round(g * (1 - k) + gg * k); out[i * 4 + 2] = Math.round(g * (1 - k) + b * k); out[i * 4 + 3] = 255
    if (!use[i]) continue
    sum += s; cnt++
    if (i % 3 === 0) vals.push(s)
    if (s > 0.72 && P.C[i]! > 0.13) { hot[i] = 1; hotN++ }
  }
  vals.sort((a, b) => a - b)
  const { comps } = components(hot, P.w, P.h)
  const hotspots: Array<Hotspot> = comps.filter((c) => c.area > n * 0.002).sort((a, b) => b.area - a.area).slice(0, 6).map((c) => ({ x: c.x0, y: c.y0, w: c.x1 - c.x0 + 1, h: c.y1 - c.y0 + 1, area: c.area / n, cx: c.cx, cy: c.cy, mean: 0 }))
  const metrics: SatMetrics = { meanSat: sum / (cnt || 1), p95Sat: vals[Math.floor(vals.length * 0.95)] ?? 0, hotShare: hotN / (cnt || 1), hotspots, palette: palette(P, use), over: fg ? "figure" : "image" }
  const findings: Array<Finding> = []
  if (metrics.hotShare > 0.3)
    findings.push({ source: "measure", check: "saturation", severity: metrics.hotShare > 0.45 ? "major" : "minor", title: "Too much of the figure is at full saturation", detail: `${Math.round(metrics.hotShare * 100)}% of the ${metrics.over} is highly saturated. When everything is loud nothing is: the focal point loses its pull and the colours vibrate.`, fix: "Keep full saturation for the focal area and one accent; pull the rest down with a Hue/Saturation/Luminosity correction layer clipped to the costume folders (Saturation -15 to -30), or desaturate the big flats themselves.", evidence: `hot share ${Math.round(metrics.hotShare * 100)}%, mean S·V ${metrics.meanSat.toFixed(2)}` })
  return { metrics, heatmap: { w: P.w, h: P.h, rgba: out }, findings }
}

/** k-means++ in OKLab on a fixed sample, k clusters, seeded: the same file always gives the same palette. */
export const palette = (P: Planes, use: Uint8Array, k = 7): Array<Swatch> => {
  const n = P.w * P.h, step = Math.max(1, Math.floor(n / 40000)), pts: Array<Lab> = []
  for (let i = 0; i < n; i += step) if (use[i] && P.alpha[i]! > 0.5) pts.push([P.okL[i]!, P.a[i]!, P.b[i]!])
  if (pts.length < k) return []
  const rand = rng(1234567), cent: Array<Lab> = [pts[Math.floor(rand() * pts.length)]!]
  const d2 = new Float64Array(pts.length)
  const dist = (p: Lab, q: Lab): number => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2
  while (cent.length < k) {
    let tot = 0
    for (let i = 0; i < pts.length; i++) { d2[i] = Math.min(...cent.map((c) => dist(pts[i]!, c))); tot += d2[i]! }
    let r = rand() * tot, j = 0
    while (j < pts.length - 1 && (r -= d2[j]!) > 0) j++
    cent.push(pts[j]!)
  }
  const lab = new Int32Array(pts.length)
  for (let it = 0; it < 20; it++) {
    for (let i = 0; i < pts.length; i++) { let b = 0, bd = Infinity; for (let c = 0; c < k; c++) { const d = dist(pts[i]!, cent[c]!); if (d < bd) { bd = d; b = c } } lab[i] = b }
    const acc = Array.from({ length: k }, () => [0, 0, 0, 0])
    for (let i = 0; i < pts.length; i++) { const a = acc[lab[i]!]!; a[0]! += pts[i]![0]; a[1]! += pts[i]![1]; a[2]! += pts[i]![2]; a[3]!++ }
    acc.forEach((a, c) => { if (a[3]) cent[c] = [a[0]! / a[3]!, a[1]! / a[3]!, a[2]! / a[3]!] })
  }
  const counts = new Array<number>(k).fill(0)
  for (let i = 0; i < pts.length; i++) counts[lab[i]!]!++
  // near-identical clusters are one colour to a viewer: merge below a just-noticeable OKLab distance
  const sw = cent.map((c, i) => ({ c, n: counts[i]! })).filter((s) => s.n > 0).sort((a, b) => b.n - a.n)
  const merged: Array<{ c: Lab; n: number }> = []
  for (const s of sw) { const m = merged.find((q) => Math.sqrt(dist(q.c, s.c)) < 0.035); if (m) { const t = m.n + s.n; m.c = [(m.c[0] * m.n + s.c[0] * s.n) / t, (m.c[1] * m.n + s.c[1] * s.n) / t, (m.c[2] * m.n + s.c[2] * s.n) / t]; m.n = t } else merged.push({ ...s }) }
  return merged.sort((a, b) => b.n - a.n).map((s) => { const [r, g, b] = oklabToSrgb(s.c); return { hex: hex(r, g, b), share: s.n / pts.length, L: s.c[0] * 100, chroma: Math.hypot(s.c[1], s.c[2]) } })
}
