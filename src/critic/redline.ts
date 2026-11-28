/**
 * The redline: a transparent PNG at the exact canvas size, to drop into CLIP STUDIO PAINT as a layer over the drawing
 * (File > Import > Image, or drag it onto the canvas; set the layer to Multiply or lower its opacity if you like). Each
 * finding with a place gets a numbered box or ring that matches the numbered list in the report; eye flow is an orange
 * path, the silhouette's main axis a cyan line, the focal area a dashed-looking green box.
 */
import { arrow, disc, line, rect, ring, text, textWidth, type RGBA } from "./draw.ts"
import { blank, type Box, type Img } from "./image.ts"
import type { Finding } from "./stages.ts"

const COLOR: Record<string, RGBA> = { major: [235, 30, 40, 235], minor: [255, 140, 0, 230], note: [40, 150, 255, 210] }

export type Guides = { flow?: Array<{ x: number; y: number }>; axis?: { x: number; y: number; tilt: number; length: number }; focus?: Box | null }

export const redline = (w: number, h: number, findings: Array<Finding>, g: Guides): Img => {
  const img = blank(w, h), u = Math.max(1, Math.round(Math.max(w, h) / 900)), t = u * 3, fs = u * 3
  if (g.focus) {
    const f = g.focus, seg = u * 14
    // dashed box: short segments around the edge
    for (const [x0, y0, x1, y1] of [[f.x, f.y, f.x + f.w, f.y], [f.x + f.w, f.y, f.x + f.w, f.y + f.h], [f.x + f.w, f.y + f.h, f.x, f.y + f.h], [f.x, f.y + f.h, f.x, f.y]] as const) {
      const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.floor(L / seg))
      for (let i = 0; i < n; i += 2) line(img, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, x0 + ((x1 - x0) * (i + 1)) / n, y0 + ((y1 - y0) * (i + 1)) / n, u * 2, [20, 200, 90, 220])
    }
    text(img, "FOCUS", f.x + u * 4, f.y + u * 4, fs, [255, 255, 255, 255], [20, 160, 70, 220])
  }
  if (g.axis) {
    const a = (g.axis.tilt * Math.PI) / 180, dx = Math.sin(a) * g.axis.length / 2, dy = -Math.cos(a) * g.axis.length / 2
    line(img, g.axis.x - dx, g.axis.y - dy, g.axis.x + dx, g.axis.y + dy, u * 2, [0, 200, 230, 200])
    line(img, g.axis.x, g.axis.y - g.axis.length / 2, g.axis.x, g.axis.y + g.axis.length / 2, u, [0, 200, 230, 110])
  }
  if (g.flow && g.flow.length > 1) {
    for (let i = 1; i < g.flow.length; i++) { const p = g.flow[i - 1]!, q = g.flow[i]!, k = Math.hypot(q.x - p.x, q.y - p.y), r = u * 14; if (k > r * 2) arrow(img, p.x + ((q.x - p.x) * r) / k, p.y + ((q.y - p.y) * r) / k, q.x - ((q.x - p.x) * r) / k, q.y - ((q.y - p.y) * r) / k, u * 2, [255, 150, 30, 200]) }
    g.flow.forEach((p, i) => { ring(img, p.x, p.y, u * 12, u * 2, [255, 150, 30, 220]); text(img, String.fromCharCode(65 + i), p.x - textWidth("A", fs) / 2, p.y - fs * 3.5, fs, [255, 150, 30, 255]) })
  }
  for (const f of findings) {
    if (f.n == null || (!f.region && !f.point)) continue
    const c = COLOR[f.severity]!, label = String(f.n)
    let lx: number, ly: number
    if (f.region) { const r = f.region; rect(img, r.x, r.y, r.w, r.h, t, c); lx = r.x; ly = r.y }
    else { const p = f.point!; ring(img, p.x, p.y, u * 26, t, c); disc(img, p.x, p.y, u * 2.5, c); lx = p.x + u * 20; ly = p.y - u * 34 }
    const tw = textWidth(label, fs * 1.4)
    // number tag just outside the top-left corner, kept on the canvas
    const tx = Math.max(u * 3, Math.min(w - tw - u * 6, lx - tw / 2)), ty = Math.max(u * 3, Math.min(h - fs * 12, ly - fs * 12))
    text(img, label, tx, ty, fs * 1.4, [255, 255, 255, 255], [c[0], c[1], c[2], 240])
  }
  return img
}
