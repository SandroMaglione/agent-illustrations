/** The line. Ink stays ink: black wherever something is in shade or lies behind, a dark colour only inside a lit plane. Thick lines are slimmed, filled blacks never. */
import { paperDistance } from "../bucket/segment.ts"
import { blur } from "../lineart/flood.ts"
import { smooth } from "../geo.ts"
import type { P2 } from "../geo.ts"
import type { Stroke } from "../tools/strokes.ts"
import { BLACK, mix, mul } from "./tones.ts"
import type { Kind, RGB, Tone } from "./tones.ts"

/** Local thickness: the largest disc of ink that covers each ink pixel. */
const thickness = (d: Float32Array, w: number, h: number): Float32Array => {
  const src = new Int32Array(d.length), o = new Float32Array(d.length)
  for (let i = 0; i < d.length; i++) src[i] = d[i]! > 0 ? i : -1
  const take = (i: number, j: number): void => { const a = src[j]!; if (a < 0 || src[i]! < 0 || d[a]! <= d[src[i]!]!) return; const dx = (a % w) - (i % w), dy = ((a / w) | 0) - ((i / w) | 0); if (dx * dx + dy * dy <= (d[a]! + 0.7) ** 2) src[i] = a }
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (src[i]! < 0) continue; take(i, i - 1); take(i, i - w); take(i, i - w - 1); take(i, i - w + 1) }
    for (let y = h - 2; y > 0; y--) for (let x = w - 2; x > 0; x--) { const i = y * w + x; if (src[i]! < 0) continue; take(i, i + 1); take(i, i + w); take(i, i + w + 1); take(i, i + w - 1) }
  }
  for (let i = 0; i < d.length; i++) o[i] = src[i]! < 0 ? 0 : d[src[i]!]!
  return o
}
/** The soft rim of a stroke belongs to the stroke: it takes the largest thickness nearby. */
const grown = (t: Float32Array, w: number, h: number, r: number): Float32Array => {
  let a = t
  for (const st of [1, w]) { const o = Float32Array.from(a); for (let i = r * st; i < a.length - r * st; i++) { let m = a[i]!; for (let d = 1; d <= r; d++) { const p = a[i - d * st]!, q = a[i + d * st]!; if (p > m) m = p; if (q > m) m = q } o[i] = m } a = o }
  return a
}
/** A hand draws a line in one go: small wobbles go, corners stay. */
const calm = (p: ReadonlyArray<P2>): ReadonlyArray<P2> => {
  const n = p.length
  if (n < 9) return p
  return p.map((q, i) => {
    const r = Math.min(4, i, n - 1 - i)
    if (r < 2) return q
    const a = p[i - r]!, b = p[i + r]!, u = [q[0] - a[0], q[1] - a[1]] as const, v = [b[0] - q[0], b[1] - q[1]] as const, c = (u[0] * v[0] + u[1] * v[1]) / ((Math.hypot(...u) || 1) * (Math.hypot(...v) || 1))
    if (c < 0.8) return q
    let x = 0, y = 0, t = 0
    for (let d = -r; d <= r; d++) { const e = 1 + Math.cos((Math.PI * d) / (r + 1)); x += p[i + d]![0] * e; y += p[i + d]![1] * e; t += e }
    return [x / t, y / t] as P2
  })
}
export type LineIn = {
  ink: Float32Array; map: Uint8Array; w: number; h: number; k: number; head: number; bg: number
  kinds: ReadonlyArray<Kind | undefined>; z: ReadonlyArray<number>; tones: ReadonlyArray<Tone | null>; face: number
  strokes: ReadonlyArray<Stroke>; fall: P2
  /** Round the eyes the artist's own ink is kept, at full weight. */
  eyes: ReadonlyArray<{ x: number; y: number; r: number }>
  /** Parts with printed marks. */
  /** Inside one form a short thick spot takes the line's colour: only a real filled black stays black. */
  softWedges?: boolean
  print: Uint8Array
  /** How far back each part lies. */
  back: ReadonlyArray<number>
  /** 1 where a pixel is in shade. */
  dark: Float32Array
}
/** RGBA of the line layer, and half the width of the drawing's own contour. Strokes are redrawn from their centre line; filled blacks, the face and crumbs keep the artist's pixels. */
export const lineLayer = (q: LineIn): { image: ImageData; half: number } => {
  const { ink, map, w, h, k, head, bg, kinds, z, tones, dark } = q, N = w * h, disc = thickness(paperDistance(Float32Array.from(ink, (v) => (v > 0.42 ? 0 : 1)), w, h, 0.5), w, h), wide = grown(disc, w, h, Math.round(1.2 * k)), im = new ImageData(w, h)
  const lens = q.strokes.flatMap((s) => s.half.filter((_, i) => i % 4 === 0)).sort((a, b) => a - b), half = Math.max(1.1, lens[Math.floor(lens.length * 0.75)] ?? 2) * k
  const mk = (): CanvasRenderingContext2D => { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d", { willReadFrequently: true })!; g.scale(k, k); return g }
  const thin = mk(), full = mk(), at = (x: number, y: number): number => { const X = Math.round(x * k), Y = Math.round(y * k); return X < 0 || Y < 0 || X >= w || Y >= h ? bg : map[Y * w + X]! }
  // widths of the references, half of each: silhouette about 1% of the head, inside about 0.6%
  const outer = Math.max(0.5, head * 0.0034), inner = Math.max(0.34, head * 0.0019)
  // filled blacks are wide areas; the thick spot where lines meet is not one
  const black = Math.max(half * 1.5, head * k * 0.0135), solid = new Float32Array(N), seen = new Uint8Array(N)
  for (let i = 0; i < N; i++) if (disc[i]! >= black && !seen[i]) { const c = [i]; seen[i] = 1; for (let n = 0; n < c.length; n++) { const j = c[n]!, x = j % w; for (const m of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w]) if (m >= 0 && m < N && !seen[m] && disc[m]! >= black) { seen[m] = 1; c.push(m) } } if (c.length > 11 * black * black) for (const j of c) solid[j] = 1 }
  // a black keeps its pointed corners: it spreads into the ink around it as long as that ink is still wide
  { let edge: Array<number> = []; for (let i = 0; i < N; i++) if (solid[i]) edge.push(i); for (let step = 0; step < black * 3 && edge.length; step++) { const next: Array<number> = []; for (const j of edge) for (const m of [j - 1, j + 1, j - w, j + w]) if (m >= 0 && m < N && !solid[m] && ink[m]! > 0.1 && disc[m]! >= black * 0.6) { solid[m] = 1; next.push(m) } edge = next } for (let r = 0; r < Math.round(k); r++) { const o = solid.slice(); for (let i = w; i < N - w; i++) if (!o[i] && (o[i - 1] || o[i + 1] || o[i - w] || o[i + w])) solid[i] = 1 } }
  const cell = new Map<string, Set<number>>(), key = (x: number, y: number): string => `${Math.floor(x / 4)},${Math.floor(y / 4)}`
  q.strokes.forEach((s, n) => { for (const [x, y] of s.p) { const c = key(x, y); const e = cell.get(c); if (e) e.add(n); else cell.set(c, new Set([n])) } })
  const alone = (n: number, x: number, y: number): boolean => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (const m of cell.get(`${Math.floor(x / 4) + dx},${Math.floor(y / 4) + dy}`) ?? []) if (m !== n) return false; return true }
  const core = (x: number, y: number): boolean => { const X = Math.round(x * k), Y = Math.round(y * k); return X >= 0 && Y >= 0 && X < w && Y < h && solid[Y * w + X]! > 0 }
  // a drawing whose lines are already fine is left as the artist inked it
  const fine = half < head * k * 0.0105
  for (const [id, s] of fine ? [] : [...q.strokes.entries()]) {
    // an end that no ink supports was guessed by the tracer
    const inked = ([x, y]: P2): boolean => (ink[Math.round(y * k) * w + Math.round(x * k)] ?? 0) > 0.4
    let from = 0, to = s.p.length
    while (from < to - 2 && !inked(s.p[from]!)) from++
    while (to > from + 2 && !inked(s.p[to - 1]!)) to--
    const p = calm(s.p.slice(from, to)), hw = s.half.slice(from, to), n = p.length
    // dots and crumbs stay as drawn
    if (n < 2 || (s.len < 13 * Math.max(...s.half) && alone(id, ...p[0]!) && alone(id, ...p[n - 1]!)) || (s.loop && s.len < head * 0.12)) continue
    // a line swells into a filled black over the last few px, the way ink does
    const fat = new Float32Array(n)
    for (let i = 0; i < n; i++) if (core(p[i]![0], p[i]![1])) fat[i] = 1
    for (let pass = 0; pass < 2; pass++) { for (let i = 1; i < n; i++) fat[i] = Math.max(fat[i]!, fat[i - 1]! - 0.11); for (let i = n - 2; i >= 0; i--) fat[i] = Math.max(fat[i]!, fat[i + 1]! - 0.11) }
    const nr = p.map((_, i): P2 => { const a = p[Math.max(0, i - 2)]!, b = p[Math.min(n - 1, i + 2)]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l] })
    const raw = p.map(([x, y], i) => {
      const H = hw[i]!, d = H + 2.2, A = at(x + nr[i]![0] * d, y + nr[i]![1] * d), B = at(x - nr[i]![0] * d, y - nr[i]![1] * d), page = A === bg || B === bg, za = A === bg ? -1 : z[A] ?? 0, zb = B === bg ? -1 : z[B] ?? 0, over = za !== zb
      // an edge turned away from the light carries more weight
      const facing = over ? (za > zb ? -1 : 1) * (nr[i]![0] * q.fall[0] + nr[i]![1] * q.fall[1]) : 0
      const goal = (page ? outer : over ? outer * 0.82 : inner) * (1 + 0.45 * Math.max(0, facing))
      const f = fat[i]! * fat[i]!
      return H <= goal ? H : goal + (H - goal) * Math.max(0.1, f)
    })
    const wd = raw.map((_, i) => { let t = 0, c = 0; for (let d = -4; d <= 4; d++) { const v = raw[i + d]; if (v !== undefined) { t += v; c++ } } return t / c })
    const ribbon = (g: CanvasRenderingContext2D, f: (i: number) => number): void => { g.beginPath(); for (let i = 0; i < n; i++) { const e = f(i); const x = p[i]![0] + nr[i]![0] * e, y = p[i]![1] + nr[i]![1] * e; if (i) g.lineTo(x, y); else g.moveTo(x, y) } for (let i = n - 1; i >= 0; i--) { const e = f(i); g.lineTo(p[i]![0] - nr[i]![0] * e, p[i]![1] - nr[i]![1] * e) } g.closePath(); g.fill() }
    ribbon(thin, (i) => wd[i]!)
    for (const i of [0, n - 1]) { thin.beginPath(); thin.arc(p[i]![0], p[i]![1], Math.max(0.1, wd[i]!), 0, 7); thin.fill() }
    ribbon(full, (i) => hw[i]! + 1.6)
    for (const i of [0, n - 1]) { full.beginPath(); full.arc(p[i]![0], p[i]![1], hw[i]! + 2.4, 0, 7); full.fill() }
  }
  const T = thin.getImageData(0, 0, w, h).data, F = full.getImageData(0, 0, w, h).data
  const shade = blur(dark, w, h, 2 * k, 1)
  // what a line does is a matter of the whole stroke, not of one pixel: inside one form or between two, and how heavy
  const flag = new Float32Array(N), fat2 = new Float32Array(N), some = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    if (ink[i]! < 0.06) continue
    const n = map[i]!, x = i % w, y = (i / w) | 0, r = Math.max(2, Math.round(wide[i]! + 2 * k))
    let one = n !== bg
    if (one) for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]] as const) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && map[Y * w + X] !== n) { one = false; break } }
    some[i] = 1; flag[i] = one ? 1 : 0; fat2[i] = Math.min(2.4, wide[i]! / half)
  }
  const rr = Math.max(1, 2.2 * k), bs = blur(some, w, h, rr, 2), bf = blur(flag, w, h, rr, 2), bw = blur(fat2, w, h, rr, 2)
  for (let i = 0; i < N; i++) {
    const n = map[i]!, v = ink[i]!, t0 = T[i * 4 + 3]! / 255
    if (v < 0.06 && t0 < 0.01) continue
    const raw = fine ? smooth(0.1, 0.8, v) : smooth(0.22, 0.6, v), near = q.eyes.some((e) => ((i % w) / k - e.x) ** 2 + (((i / w) | 0) / k - e.y) ** 2 < e.r * e.r), mine = fine || near || n === q.face, keep = mine || !F[i * 4 + 3] ? 1 : solid[i]!, a = mine ? raw : Math.max(t0, raw * keep)
    if (a < 0.01) continue
    const x = i % w, y = (i / w) | 0, r = Math.max(2, Math.round(wide[i]! + 2))
    let page = n === bg, lo = z[n] ?? 0, hi = lo, skin = kinds[n] === "skin", other = -1
    for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]] as const) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const m = map[Y * w + X]!; if (m !== n) other = m; if (m === bg) page = true; else if (m) { lo = Math.min(lo, z[m] ?? 0); hi = Math.max(hi, z[m] ?? 0); if (kinds[m] === "skin") skin = true } }
    const inside = smooth(0.35, 0.75, bf[i]! / Math.max(0.01, bs[i]!)) * (page ? 0 : 1), heavy = q.print[n] ? 1 : q.softWedges ? 0 : smooth(1.3, 1.9, bw[i]! / Math.max(0.01, bs[i]!)), t = tones[n] ?? tones[other < 0 ? 0 : other] ?? null, sh = smooth(0.25, 0.7, shade[i]!)
    let c: RGB = BLACK, soft = 1
    if (t && n !== q.face) {
      // a line inside one form only says where it bends: a darker step of the colour it lies on. A line between forms separates, and stays dark
      const own = skin ? mix([196, 128, 124], [126, 62, 74], sh) : mix(mul(t.base, t.s1), mul(t.base, t.s2), 0.35 + 0.65 * sh)
      const sep = mix(BLACK, skin ? [92, 40, 46] : t.ink, 0.3)
      c = mix(sep, own, inside * (1 - heavy * 0.85))
      soft = 1 - 0.12 * inside * (1 - heavy)
    }
    { const d = page ? Math.max(0, ...[n, other].filter((m) => m >= 0 && m !== bg).map((m) => q.back[m] ?? 0)) : Math.min(q.back[n] ?? 0, other < 0 || other === bg ? 1 : q.back[other] ?? 0); if (d) c = mix(c, [150, 148, 186], d * 0.55) }
    im.data[i * 4] = c[0]; im.data[i * 4 + 1] = c[1]; im.data[i * 4 + 2] = c[2]; im.data[i * 4 + 3] = a * soft * 255
  }
  return { image: im, half }
}
