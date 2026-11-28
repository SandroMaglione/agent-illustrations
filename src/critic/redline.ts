/**
 * `ai_redline.png`: a transparent PNG at exactly the input's pixel size (the canvas, for a `.clip`), meant to be placed
 * once in CLIP STUDIO PAINT as a file object (File > Import > Create file object) and refreshed after every review
 * (Layer > File object > Update file object), so the marks follow the drawing without re-importing.
 *
 * It holds only what helps on the canvas: a box and a numbered pin per AI issue (1 = most important), a box or ring and an
 * "M" pin per measured major or minor finding, and the pose skeleton when there is one. Every stroke has a dark edge under
 * a bright colour, so it reads on light and dark areas alike.
 */
import { drawSkeleton, type Keypoints } from "./checks/pose.ts"
import { disc, line, ring, text, textWidth, type RGBA } from "./draw.ts"
import { blank, type Img } from "./image.ts"
import type { Finding } from "./stages.ts"

export const AI_COLOR: RGBA = [255, 30, 95, 245]
export const MEASURE_COLOR: RGBA = [255, 150, 0, 240]
const EDGE: RGBA = [12, 12, 18, 190]

const box = (img: Img, x: number, y: number, w: number, h: number, t: number, c: RGBA): void => {
  const e = t + Math.max(2, t * 0.8)
  for (const [tt, cc] of [[e, EDGE], [t, c]] as const) { line(img, x, y, x + w, y, tt, cc); line(img, x + w, y, x + w, y + h, tt, cc); line(img, x + w, y + h, x, y + h, tt, cc); line(img, x, y + h, x, y, tt, cc) }
}
/** A round pin with its label, centred on (x, y) and kept on the canvas. */
const pin = (img: Img, x: number, y: number, label: string, u: number, c: RGBA): void => {
  const fs = Math.max(1, Math.round(u * 3)), tw = textWidth(label, fs), r = Math.max(u * 13, tw / 2 + u * 5)
  const cx = Math.max(r + u, Math.min(img.w - r - u, x)), cy = Math.max(r + u, Math.min(img.h - r - u, y))
  disc(img, cx, cy, r + u * 1.5, EDGE); disc(img, cx, cy, r + u * 0.6, [255, 255, 255, 255]); disc(img, cx, cy, r - u * 0.4, c)
  text(img, label, cx - tw / 2, cy - (fs * 7) / 2, fs, [255, 255, 255, 255])
}

export const redline = (w: number, h: number, findings: Array<Finding>, o: { keypoints?: Keypoints | null; keypointScale?: number } = {}): Img => {
  const img = blank(w, h), u = Math.max(1, Math.max(w, h) / 1000), t = Math.max(2, u * 2.6)
  if (o.keypoints) drawSkeleton(img, o.keypoints, o.keypointScale ?? 1, Math.max(2, u * 2), true)
  // measured first, AI on top: the AI's numbered priorities are what the artist works through
  const marked = findings.filter((f) => f.label && (f.region || f.point) && (f.source === "ai" || f.severity !== "note"))
  for (const f of [...marked.filter((q) => q.source !== "ai"), ...marked.filter((q) => q.source === "ai")]) {
    const c = f.source === "ai" ? AI_COLOR : MEASURE_COLOR
    if (f.region) { const r = f.region; box(img, r.x, r.y, r.w, r.h, t, c); pin(img, r.x, r.y, f.label!, u, c) }
    else { const p = f.point!; ring(img, p.x, p.y, u * 24, t + 2 * u, EDGE); ring(img, p.x, p.y, u * 24, t, c); pin(img, p.x + u * 24, p.y - u * 24, f.label!, u, c) }
  }
  return img
}
