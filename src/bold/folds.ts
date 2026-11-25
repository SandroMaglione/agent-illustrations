/**
 * Where cloth breaks the cylinder. A fold is a ridge on the form: a crest with a plane on each side, widest in the middle and pointed at its
 * ends. It tilts the surface, nothing more; the light decides which of its planes is lit and which is shade, so every fold of a drawing agrees.
 */
import type { FormField } from "./formfield.ts"

/** "x,y x,y …" the crest, in line-art px. w: width of one plane at its widest; `steep`: tilt, negative for a valley; `side`: -1 or 1 keeps only the plane left or right of the direction of travel. */
export type Fold = { on: string; at: string; w: number; steep?: number; side?: -1 | 1; blunt?: "start" | "end" | "both" }
export const layFolds = (f: FormField, folds: ReadonlyArray<Fold>, map: Uint8Array, names: ReadonlyArray<string>, w: number, h: number, k: number): void => {
  for (const q of folds) {
    const on = new Set(q.on.split(/\s+/).map((n) => names.indexOf(n))), p = q.at.trim().split(/\s+/).map((t) => t.split(",").map((v) => Number(v) * k) as [number, number]), seg = p.slice(1).map((b, i) => Math.hypot(b[0] - p[i]![0], b[1] - p[i]![1])), all = seg.reduce((a, b) => a + b, 0), W = q.w * k, s = q.steep ?? 0.8
    const x0 = Math.max(0, Math.floor(Math.min(...p.map((t) => t[0])) - W)), x1 = Math.min(w - 1, Math.ceil(Math.max(...p.map((t) => t[0])) + W)), y0 = Math.max(0, Math.floor(Math.min(...p.map((t) => t[1])) - W)), y1 = Math.min(h - 1, Math.ceil(Math.max(...p.map((t) => t[1])) + W))
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * w + x
      if (!f.has[i] || !on.has(map[i]!)) continue
      let best = 1e9, along = 0, nx = 0, ny = 0, run = 0
      for (let j = 0; j < seg.length; j++) {
        const [ax, ay] = p[j]!, [bx, by] = p[j + 1]!, l = seg[j]! || 1, u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (l * l))), dx = x - ax - (bx - ax) * u, dy = y - ay - (by - ay) * u, d = Math.hypot(dx, dy)
        if (d < best) { best = d; along = run + u * l; const sg = Math.sign((bx - ax) * (y - ay) - (by - ay) * (x - ax)) || 1; nx = (-(by - ay) / l) * sg; ny = ((bx - ax) / l) * sg; if (q.side && sg !== q.side) best = 1e9 }
        run += l
      }
      const t = along / all, a = q.blunt === "start" || q.blunt === "both" ? 1 : Math.min(1, t / 0.45), b = q.blunt === "end" || q.blunt === "both" ? 1 : Math.min(1, (1 - t) / 0.45)
      if (best > W * Math.min(a, b)) continue
      f.nx[i] = f.nx[i]! + nx * s; f.ny[i] = f.ny[i]! + ny * s; f.bent[i] = 1
    }
  }
}
