/**
 * Eye rig. The agent names the drawn lines; every layer is placed from them, in shares of the eye's own size.
 * The artist's lash and lid stay. The ink inside the opening (iris, pupil) is redrawn, because it needs the iris's colour.
 */
import type { P2 } from "../geo.ts"
import { mix } from "../splash/tones.ts"
import type { RGB } from "../splash/tones.ts"
import type { Refs } from "./refs.ts"

export type Iris = { deep: RGB; mid: RGB; light: RGB; glow: RGB; ring: RGB }
export type EyeSpec = {
  /** Upper lash, lower lid, the two sides of the iris: lines. A lid nobody drew is a few points. */
  lash: ReadonlyArray<string>; lid: ReadonlyArray<string>; iris: ReadonlyArray<string>
  /** The crease above the lash, and the points where the lash ends. */
  crease?: ReadonlyArray<string>; tips?: ReadonlyArray<string>
  /** Height of the iris over its width. */
  tall?: number; color: Iris
  /** Width of the pupil over its height: 1 is round, 0.4 is a slit. */
  slit?: number
  /** Degrees the eye leans, when its lash runs far past the corner and says too much. */
  lean?: number
  /** Cheek colour under the eye, with its short strokes. */
  blush?: number
  /** Cheek shift along the eye, in iris widths: away from the nose. */
  cheek?: number
  /** Lash that runs over the hair: lines that stay the darkest ink whatever they cross. */
  flick?: ReadonlyArray<string>
}
export type Eye = { hole: Array<P2>; under: (g: CanvasRenderingContext2D) => void; over: (g: CanvasRenderingContext2D) => void; note: string; tips: ReadonlyArray<{ x: number; y: number; r: number }>; flick: ReadonlyArray<{ p: ReadonlyArray<P2>; half: number }>; blush?: { x: number; y: number; rx: number; ry: number; a: number } }
const rgba = (c: RGB, a = 1): string => `rgba(${c.map((v) => Math.round(v)).join(",")},${a})`

/** Least squares cubic y(x); `keep` drops the points that fall on the wrong side and fits again. */
const cubic = (p: ReadonlyArray<P2>, keep?: (residual: number) => boolean): ((x: number) => number) => {
  const X = Math.max(...p.map((q) => Math.abs(q[0]))) || 1
  let use = [...p], c = [0, 0, 0, 0]
  for (let pass = 0; pass < (keep ? 6 : 1); pass++) {
    const A = Array.from({ length: 4 }, () => new Array<number>(5).fill(0))
    for (const [x, y] of use) { const b = [1, x / X, (x / X) ** 2, (x / X) ** 3]; for (let i = 0; i < 4; i++) { for (let j = 0; j < 4; j++) A[i]![j] = A[i]![j]! + b[i]! * b[j]!; A[i]![4] = A[i]![4]! + b[i]! * y } }
    for (let i = 0; i < 4; i++) A[i]![i] = A[i]![i]! + 1e-4 * use.length * (i > 1 ? 8 : 1)
    for (let i = 0; i < 4; i++) { let m = i; for (let r = i; r < 4; r++) if (Math.abs(A[r]![i]!) > Math.abs(A[m]![i]!)) m = r; [A[i], A[m]] = [A[m]!, A[i]!]; for (let r = 0; r < 4; r++) if (r !== i) { const f = A[r]![i]! / A[i]![i]!; for (let j = i; j < 5; j++) A[r]![j] = A[r]![j]! - f * A[i]![j]! } }
    c = A.map((r, i) => r[4]! / r[i]!)
    if (!keep) break
    const cc = c, left = p.filter(([x, y]) => keep(y - (cc[0]! + (cc[1]! * x) / X + cc[2]! * (x / X) ** 2 + cc[3]! * (x / X) ** 3)))
    if (left.length < 10) break
    use = left
  }
  return (x) => c[0]! + (c[1]! * x) / X + c[2]! * (x / X) ** 2 + c[3]! * (x / X) ** 3
}

export const eye = (s: EyeSpec, R: Refs, ink: Float32Array, w: number, k: number): Eye => {
  const pts = (l: ReadonlyArray<string>): Array<P2> => l.flatMap((r) => (/^s\d+(\[|$)/.test(r) ? R.run(r).p : [R.at(r)]))
  const lashC = pts(s.lash), lidC = pts(s.lid)
  // the eye's own frame: x from corner to corner, y down
  const xs = [...lashC].sort((a, b) => a[0] - b[0]), a = xs[0]!, b = xs.at(-1)!, tilt = s.lean === undefined ? Math.atan2(b[1] - a[1], b[0] - a[0]) : (s.lean * Math.PI) / 180, cs = Math.cos(tilt), sn = Math.sin(tilt), O: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const inn = ([x, y]: P2): P2 => [(x - O[0]) * cs + (y - O[1]) * sn, -(x - O[0]) * sn + (y - O[1]) * cs]
  const out = ([x, y]: P2): P2 => [O[0] + x * cs - y * sn, O[1] + x * sn + y * cs]
  const inkAt = (p: P2): number => { const [x, y] = out(p); return ink[Math.round(y * k) * w + Math.round(x * k)] ?? 0 }
  // both edges of the lash, without the bumps where iris and pupil hang from it
  const span = [inn(a)[0], inn(b)[0]] as const, low: Array<P2> = [], top: Array<P2> = []
  const mid = cubic(lashC.map(inn))
  for (let x = span[0]; x <= span[1]; x += 0.5) { let y = mid(x); if (inkAt([x, y]) < 0.5) continue; while (inkAt([x, y]) > 0.42 && y < mid(x) + 30) y += 0.25; low.push([x, y]); y = mid(x); while (inkAt([x, y]) > 0.42 && y > mid(x) - 30) y -= 0.25; top.push([x, y]) }
  const lashLow = cubic(low, (r) => r < 0.8), lashTop = cubic(top, (r) => r > -0.8), lid = cubic(lidC.map(inn))
  // iris: a circle through both arcs once the frame is squeezed by `tall`
  const tall = s.tall ?? 1.15, q = pts(s.iris).map(inn).map(([x, y]): P2 => [x, y / tall])
  const m = q.reduce((p, v): P2 => [p[0] + v[0] / q.length, p[1] + v[1] / q.length], [0, 0] as P2)
  let suu = 0, svv = 0, suv = 0, su = 0, sv = 0
  for (const [x, y] of q) { const u = x - m[0], v = y - m[1], z = u * u + v * v; suu += u * u; svv += v * v; suv += u * v; su += (u * z) / 2; sv += (v * z) / 2 }
  const det = suu * svv - suv * suv, ux = (su * svv - sv * suv) / det, uy = (sv * suu - su * suv) / det
  let cx = m[0] + ux, cy = (m[1] + uy) * tall, rx = Math.sqrt(ux * ux + uy * uy + (suu + svv) / q.length)
  const ry = rx * tall, half = Math.max(...lidC.map(inn).map(([x]) => Math.abs(x)), (span[1] - span[0]) / 2)
  const open = (x: number): number => lid(x) - lashLow(x), H = Math.max(...Array.from({ length: 41 }, (_, i) => open(cx - rx + (i / 20) * rx)))
  const line = (f: (x: number) => number, from: number, to: number): Array<P2> => Array.from({ length: 49 }, (_, i): P2 => { const x = from + ((to - from) * i) / 48; return [x, f(x)] })
  const x0 = low[0]![0] + 1, x1 = low.at(-1)![0] - 1, lidP = (lidC.length > 12 ? lidC.map(inn) : line(lid, Math.min(...lidC.map((p) => inn(p)[0])), Math.max(...lidC.map((p) => inn(p)[0])))).sort((p, v) => v[0] - p[0])
  const opening = [...line((x) => lashLow(x) - 3, x0, x1), ...lidP], hole = [...line((x) => lashLow(x) + 0.3, x0, x1), ...lidP.map(([x, y]): P2 => [x, Math.max(lashLow(x) + 0.3, y - 1.4)])].map(out)
  const path = (g: CanvasRenderingContext2D, p: ReadonlyArray<P2>): void => { g.beginPath(); p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath() }
  const frame = (g: CanvasRenderingContext2D, f: () => void): void => { g.save(); g.translate(...O); g.rotate(tilt); f(); g.restore() }
  const C = s.color, oval = (g: CanvasRenderingContext2D, x: number, y: number, rrx: number, rry: number, t = 0): void => { g.beginPath(); g.ellipse(x, y, rrx, rry, t, 0, 7) }
  const lashAt = (x: number): number => lashLow(x)
  const under = (g: CanvasRenderingContext2D): void => frame(g, () => {
    const K = Math.hypot(g.getTransform().a, g.getTransform().b)
    // lid tint between the crease and the lash, lower lid warmth
    if (s.crease) { const cr = cubic(pts(s.crease).map(inn)), cx0 = Math.max(span[0], cx - rx * 2.4, Math.min(...pts(s.crease).map((p) => inn(p)[0]))), cx1 = Math.min(span[1], cx + rx * 1.9, Math.max(...pts(s.crease).map((p) => inn(p)[0]))); path(g, [...line(cr, cx0, cx1), ...line((x) => lashTop(x) + 2, cx1, cx0)]); const t = lashTop(cx), d = t - cr((cx0 + cx1) / 2), gr = g.createLinearGradient(0, t - d, 0, t + d * 0.3); gr.addColorStop(0, "rgba(232,150,132,.12)"); gr.addColorStop(1, "rgba(206,104,96,.42)"); g.fillStyle = gr; g.filter = `blur(${half * 0.06 * K}px)`; g.fill(); g.filter = "none" }
    { const E = Math.min(H, ry * 0.8), y = lid(cx) + E * 0.35, gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, "rgba(240,150,130,.34)"); gr.addColorStop(1, "rgba(240,150,130,0)"); g.save(); g.translate((x0 + x1) / 2, y); g.scale((x1 - x0) * 0.55, E * 0.75); g.fillStyle = gr; g.fillRect(-1, -1, 2, 2); g.restore() }
    if (s.blush) { g.strokeStyle = "rgba(232,140,118,.55)"; g.lineCap = "round"; g.lineWidth = rx * 0.065; for (let i = 0; i < 4; i++) { const x = cx - rx * 0.7 + (s.cheek ?? 0) * rx * 2 + i * rx * 0.5, y = lid(cx) + ry * 1.35; g.beginPath(); g.moveTo(x + rx * 0.14, y - ry * 0.28); g.lineTo(x - rx * 0.14, y + ry * 0.28); g.stroke() } }
    path(g, opening); g.save(); g.clip()
    g.fillStyle = "#fcf8f6"; g.fillRect(-200, -200, 400, 400)
    // the lash and the lid throw one crisp shadow on the ball of the eye
    path(g, [...line((x) => lashAt(x) - 6, x0 - 4, x1 + 4), ...line((x) => lashAt(x) + Math.min(Math.max(0, open(x)), ry * 1.15) * (0.34 + 0.12 * ((x - cx) / half) ** 2) * Math.min(1, Math.max(0, (x - x0) / (half * 0.22))) ** 0.5, x1 + 4, x0)]); g.fillStyle = "#c3bccb"; g.fill()
    // iris
    g.save(); oval(g, cx, cy, rx, ry); g.clip()
    const yT = Math.min(lashAt(cx), cy - ry * 0.2), yB = Math.min(lid(cx), cy + ry), gr = g.createLinearGradient(0, yT, 0, yB)
    gr.addColorStop(0, rgba(C.deep)); gr.addColorStop(0.4, rgba(C.mid)); gr.addColorStop(1, rgba(C.light)); g.fillStyle = gr; g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2)
    // dark rim, bright crescent opposite the light, crisp shadow of the lash
    const rim = g.createRadialGradient(0, 0, 0.62, 0, 0, 1); rim.addColorStop(0, rgba(C.deep, 0)); rim.addColorStop(1, rgba(C.deep, 0.55)); g.save(); g.translate(cx, cy); g.scale(rx, ry); g.fillStyle = rim; g.fillRect(-1, -1, 2, 2); g.restore()
    const hB = yB - yT
    g.save(); oval(g, cx + rx * 0.08, yB - hB * 0.02, rx * 0.62, hB * 0.3); g.clip(); oval(g, cx, cy, rx * 0.86, ry * 0.95); g.fillStyle = rgba(C.glow, 0.95); g.fill(); g.restore()
    path(g, [...line((x) => lashAt(x) - 6, cx - rx, cx + rx), ...line((x) => lashAt(x) + hB * (0.27 + 0.07 * ((x - cx) / rx) ** 2), cx + rx, cx - rx)]); g.fillStyle = rgba(C.deep, 0.82); g.fill()
    // pupil with its ring, two bright chips beside it
    const pr = Math.min(rx * 0.33, hB * 0.42), py = Math.max(cy, yT + hB * 0.34)
    g.lineWidth = rx * 0.07; g.strokeStyle = rgba(C.glow, 0.55); g.beginPath(); g.ellipse(cx, py, pr * 1.62, pr * 1.75, 0, Math.PI * 0.78, Math.PI * 1.12); g.stroke(); g.beginPath(); g.ellipse(cx, py, pr * 1.62, pr * 1.75, 0, -Math.PI * 0.2, Math.PI * 0.08); g.stroke()
    oval(g, cx, py, pr * (s.slit ?? 1), pr * (s.slit ? 1.5 : 1.14)); g.fillStyle = rgba(mix(C.deep, [8, 10, 16], 0.6), 0.95); g.fill()
    oval(g, cx, py + pr * (s.slit ? 0.75 : 0.35), pr * 0.55 * (s.slit ?? 1), pr * 0.6); g.fillStyle = rgba(C.mid, 0.5); g.fill()
    g.restore()
    // outline, heavier at the top and open at the bottom
    g.lineCap = "round"; g.strokeStyle = rgba(C.ring, 0.95); g.lineWidth = rx * 0.11; g.beginPath(); g.ellipse(cx, cy, rx - rx * 0.05, ry - rx * 0.05, 0, Math.PI * 0.74, Math.PI * 2.26); g.stroke()
    g.restore()
  })
  const over = (g: CanvasRenderingContext2D): void => {
    frame(g, () => {
      // lash core: the darkest mark in the picture
      { const m = (x: number): number => (x - x0) / (x1 - x0), f = (x: number): number => Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, m(x))))) ** 0.6; path(g, [...line((x) => lashLow(x) - (lashLow(x) - lashTop(x)) * 0.62 * f(x), x0, x1), ...line((x) => lashLow(x) + 0.2, x1, x0)]); g.fillStyle = "rgba(18,10,14,.85)"; g.fill() }
      // the eye's colour glints on the lash above the iris
      const t = (lashTop(cx) + lashLow(cx)) / 2; g.save(); path(g, [...line((x) => lashTop(x) + 1.2, cx - rx, cx + rx), ...line((x) => lashLow(x) - 1.2, cx + rx, cx - rx)]); g.clip(); const z = g.createRadialGradient(0, 0, 0, 0, 0, 1); z.addColorStop(0, rgba(C.mid, 0.7)); z.addColorStop(1, rgba(C.mid, 0)); g.translate(cx - rx * 0.1, t + 1); g.scale(rx * 0.62, Math.max(2, (lashLow(cx) - lashTop(cx)) * 0.42)); g.fillStyle = z; g.fillRect(-1, -1, 2, 2); g.restore()
      // lights: one large on the side of the light, across the edge of the lash, one small opposite
      const hB = Math.min(lid(cx), cy + ry) - lashAt(cx), r = Math.min(rx * 0.24, hB * 0.27), lx = cx - rx * 0.52
      g.fillStyle = "#fff"; g.save(); g.translate(lx, Math.max(lashAt(lx) + r * 0.55, cy - ry * 0.5)); g.rotate(-0.35); oval(g, 0, 0, r, r * 1.16); g.fill(); g.restore()
      const sx = cx + rx * 0.62; oval(g, sx, Math.min(lid(sx), cy + ry * 0.8) - r * 0.95, r * 0.42, r * 0.42); g.fillStyle = "rgba(255,255,252,.95)"; g.fill()
      // the lower lid is darkest under the iris
      if (lid(cx) < cy + ry * 0.9) { g.beginPath(); line(lid, cx - rx * 0.1, cx + rx * 0.72).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineCap = "round"; g.lineWidth = rx * 0.09; g.strokeStyle = "rgba(44,26,30,.8)"; g.stroke() }
    })
  }
  const cheek = out([cx - rx * 0.1 + (s.cheek ?? 0) * rx * 2, lid(cx) + ry * 1.5])
  const flick = (s.flick ?? []).map((t) => { const r = R.run(t); return { p: r.p, half: Math.max(...r.half) } })
  return { flick, ...(s.blush ? { blush: { x: cheek[0], y: cheek[1], rx: rx * 2.4, ry: ry * 1.25, a: s.blush } } : {}), tips: (s.tips ?? []).map((t) => { const [x, y] = R.at(t); return { x, y, r: half * 0.34 } }), hole, under, over, note: `iris ${out([cx, cy]).map((v) => v.toFixed(1)).join(",")} r ${rx.toFixed(1)}x${ry.toFixed(1)} tilt ${((tilt * 180) / Math.PI).toFixed(0)} open ${H.toFixed(1)}` }
}
