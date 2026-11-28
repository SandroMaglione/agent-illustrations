/**
 * Flip and squint: a mirrored copy (fresh eyes for leaning figures and lopsided faces) and a heavily blurred thumbnail
 * (what reads first from across the room). The squint view also measures where the strongest value contrast is once the
 * detail is gone, and how much contrast survives at all.
 */
import { blank, flipH, fit, resize, type Img } from "../image.ts"
import { blur, shrink, type Planes } from "../planes.ts"
import type { Finding } from "../stages.ts"

export type SquintMetrics = {
  /** std of L* in the blurred thumbnail: how much contrast survives the squint */ contrast: number
  /** the point of strongest local value contrast after blurring, in analysis px */ peak: { x: number; y: number; strength: number }
  thumbSize: [number, number]
}

export const squint = (P: Planes, flat: Img): { metrics: SquintMetrics; flipped: Img; blurred: Img; findings: Array<Finding> } => {
  const T = 160, s = T / Math.max(P.w, P.h), tw = Math.max(1, Math.round(P.w * s)), th = Math.max(1, Math.round(P.h * s))
  const small = shrink(P.L, P.w, P.h, tw, th), sigma = T / 70, bl = blur(small, tw, th, sigma)
  let mean = 0
  for (const v of bl) mean += v
  mean /= bl.length
  let varr = 0
  for (const v of bl) varr += (v - mean) ** 2
  // local contrast: the blurred value against its wider surround
  const wide = blur(bl, tw, th, sigma * 4)
  let best = { x: 0, y: 0, strength: 0 }
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { const d = Math.abs(bl[y * tw + x]! - wide[y * tw + x]!); if (d > best.strength) best = { x, y, strength: d } }
  // the colour squint image: blur each channel of a thumbnail of the picture
  const thumb = resize(fit(flat, T).img, tw, th), ch = [0, 1, 2].map((c) => blur(Float32Array.from({ length: tw * th }, (_, i) => thumb.rgba[i * 4 + c]!), tw, th, sigma))
  const disp = blank(tw, th)
  for (let i = 0; i < tw * th; i++) { for (let c = 0; c < 3; c++) disp.rgba[i * 4 + c] = Math.round(ch[c]![i]!); disp.rgba[i * 4 + 3] = 255 }
  const blurred = resize(disp, Math.round(tw * 3), Math.round(th * 3))
  const metrics: SquintMetrics = { contrast: Math.sqrt(varr / bl.length), peak: { x: (best.x + 0.5) / s, y: (best.y + 0.5) / s, strength: best.strength }, thumbSize: [tw, th] }
  const findings: Array<Finding> = []
  if (metrics.contrast < 10)
    findings.push({ source: "measure", check: "squint", severity: metrics.contrast < 7 ? "major" : "minor", title: "The picture disappears when squinting", detail: "After blurring away the detail, very little value contrast is left. From a distance (a thumbnail in a feed, a gacha banner) the figure will not separate from its background.", fix: "Group values into bigger, simpler masses: darken the background or the shadow side as one shape, keep the light on the figure. Check with View > Navigator at a small size.", evidence: `blurred L* std ${metrics.contrast.toFixed(1)}` })
  return { metrics, flipped: flipH(flat), blurred, findings }
}
