/**
 * A painted eye, between the artist's lines, as pieces: each is drawn on its own and is a layer of its own in the file an
 * illustrator gets (`src/layers`). `draw` is what the picture shows, cut by the opening; `free` is the whole shape, for a
 * layer clipped to the white: the iris goes on under the lid, so it can be moved.
 */
import { path } from "./shadows.ts"

type G = CanvasRenderingContext2D
/** One thing drawn on the canvas with a name. `clip`: clipped to the first layer of its folder. `over`: above the lines. `print`: printed on a thing. */
export type Detail = { name: string; folder?: string; clip?: boolean; over?: boolean; print?: boolean; draw: (g: G) => void; free?: (g: G) => void }
export type Eye = { open: string; x: number; y: number; rx: number; ry: number; turn: number; shade: string }
type Spot = { name: string; x: number; y: number; rx: number; ry: number; color: string }
export type EyeLook = {
  /** Half the size of the square the white fills, in line-art px. */
  reach: readonly [number, number]
  white: string; shade: string; rim: string
  /** The coloured part, as shares of the iris. */
  inner: readonly [number, number]
  stops: ReadonlyArray<readonly [number, string]>
  spokes: { n: number; from: number; span: number; half: number; out: number; color: string }
  glow: ReadonlyArray<{ name: string; inner: number; outer: number; n: number; color: string }>
  /** The lid's shadow on the iris: right edge, middle and left edge, as shares of ry. */
  lid: { right: number; mid: number; left: number; color: string }
  pupil: Spot; spark: Spot
  lights: ReadonlyArray<Spot>
  star: { x: number; y: number; r: number; color: string }
}
export const fill = (g: G, d: string, c: string): void => { path(g, d, 1); g.fillStyle = c; g.fill() }

export const eyeDetails = (folder: string, e: Eye, q: EyeLook): Array<Detail> => {
  const { rx, ry } = e
  const el = (g: G, x: number, y: number, a: number, b: number, c: string): void => { g.beginPath(); g.ellipse(x, y, a, b, 0, 0, 7); g.fillStyle = c; g.fill() }
  /** In the iris's own axes, cut by the opening or whole. */
  const at = (f: (g: G) => void, within: boolean) => (cut: boolean) => (g: G): void => { g.save(); if (cut) { path(g, e.open, 1); g.clip() } g.translate(e.x, e.y); g.rotate(e.turn); if (within) { g.beginPath(); g.ellipse(0, 0, rx * q.inner[0], ry * q.inner[1], 0, 0, 7); g.clip() } f(g); g.restore() }
  const piece = (name: string, f: (g: G) => void, within = true): Detail => { const p = at(f, within); return { name, folder, clip: true, draw: p(true), free: p(false) } }
  const opened = (f: (g: G) => void) => (g: G): void => { g.save(); path(g, e.open, 1); g.clip(); f(g); g.restore() }
  const crescent = (g: G, inner: number, outer: number, n: number, c: string): void => { g.beginPath(); for (let i = 0; i <= 40; i++) { const a = 0.22 + (i / 40) * 2.7; g.lineTo(Math.cos(a) * rx * outer, Math.sin(a) * ry * outer) } for (let i = 40; i >= 0; i--) { const t = i / 40, a = 0.22 + t * 2.7, w = Math.abs(Math.sin(t * Math.PI * n)), r = outer - (outer - inner) * Math.sin(t * Math.PI) ** 0.6 * (0.62 + 0.38 * w); g.lineTo(Math.cos(a) * rx * r, Math.sin(a) * ry * r) } g.fillStyle = c; g.fill() }
  const spot = (s: Spot) => (g: G): void => el(g, s.x * rx, s.y * ry, s.rx * rx, s.ry * ry, s.color)
  return [
    { name: "White", folder, draw: opened((g) => { g.fillStyle = q.white; g.fillRect(e.x - q.reach[0], e.y - q.reach[1], q.reach[0] * 2, q.reach[1] * 2) }) },
    { name: "White shade", folder, clip: true, draw: opened((g) => fill(g, e.shade, q.shade)), free: (g) => fill(g, e.shade, q.shade) },
    piece("Iris", (g) => el(g, 0, 0, rx, ry, q.rim), false),
    piece("Iris gradient", (g) => { const l = g.createLinearGradient(0, -ry, 0, ry); for (const [a, c] of q.stops) l.addColorStop(a, c); g.fillStyle = l; g.fillRect(-rx, -ry, rx * 2, ry * 2) }),
    piece("Iris rays", (g) => { const s = q.spokes; g.fillStyle = s.color; for (let i = 0; i < s.n; i++) { const a = s.from + (i / (s.n - 1)) * s.span; g.beginPath(); g.moveTo(Math.cos(a) * rx * 0.3, Math.sin(a) * ry * 0.3); g.lineTo(Math.cos(a - s.half) * rx * s.out, Math.sin(a - s.half) * ry * s.out); g.lineTo(Math.cos(a + s.half) * rx * s.out, Math.sin(a + s.half) * ry * s.out); g.fill() } }),
    ...q.glow.map((c) => piece(c.name, (g) => crescent(g, c.inner, c.outer, c.n, c.color))),
    piece("Lid shadow", (g) => { const l = q.lid; g.beginPath(); g.moveTo(-rx, -ry); g.lineTo(rx, -ry); g.lineTo(rx, l.right * ry); g.quadraticCurveTo(0, l.mid * ry, -rx, l.left * ry); g.fillStyle = l.color; g.fill() }),
    piece("Pupil", spot(q.pupil)), piece("Pupil light", spot(q.spark)),
  ]
}
/** The lights over the lines: the main one, the small ones, the star. */
export const eyeLights = (folder: string, e: Eye, q: EyeLook): Array<Detail> => {
  const at = (f: (g: G) => void) => (g: G): void => { g.save(); g.translate(e.x, e.y); g.rotate(e.turn); f(g); g.restore() }
  return [
    ...q.lights.map((s) => ({ name: s.name, folder, over: true, draw: at((g) => { g.beginPath(); g.ellipse(s.x * e.rx, s.y * e.ry, s.rx * e.rx, s.ry * e.ry, 0, 0, 7); g.fillStyle = s.color; g.fill() }) })),
    { name: "Star", folder, over: true, draw: at((g) => { const s = q.star; g.fillStyle = s.color; g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283, r = i % 2 ? 0.045 : s.r; g.lineTo(s.x * e.rx + Math.cos(a) * r * e.rx, s.y * e.ry + Math.sin(a) * r * e.ry * 1.15) } g.fill() }) },
  ]
}
/** The two functions a drawing needs, from its details. */
export const painted = (d: ReadonlyArray<Detail>): { details: ReadonlyArray<Detail>; face: (g: G) => void; over: (g: G) => void } => ({ details: d, face: (g) => { for (const q of d) if (!q.over) q.draw(g) }, over: (g) => { for (const q of d) if (q.over) q.draw(g) } })
