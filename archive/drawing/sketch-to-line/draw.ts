/**
 * Line art from forms. A rough sketch is redrawn as closed pieces, back to front. Regions come from the pieces themselves, so
 * nothing leaks, and so do the lines: wherever the edge of a piece shows there is one, and what lies on its two sides says
 * how heavy it is (docs/line-art.md):
 *   against the page           heaviest, black
 *   over another part          a little lighter; heavier on the side away from the light, lighter towards it
 *   inside one part            thin: there the render carries the form
 *   between joined pieces      none
 * Lines taper where they run out. Where two lines close in on each other the gap fills with ink: light does not get there.
 * Runs at any scale; needs a canvas.
 */
import { paperDistance } from "../bucket/segment.ts"
import { loops } from "../bold/contour.ts"
import type { P2 } from "../geo.ts"

export type Piece = { part: string; id?: string; d: string; join?: ReadonlyArray<string>; on?: ReadonlyArray<string>; grow?: number; w?: number }
/** `path`: x, y, pressure, one after the other, instead of `d` (scripts/ink.ts). */
export type Mark = { id?: string; d?: string; path?: ReadonlyArray<number>; w?: number; on?: ReadonlyArray<string>; ends?: "both" | "start" | "end" | "none" }
export type Drawn = { pieces: ReadonlyArray<Piece>; marks: ReadonlyArray<Mark>; blacks: ReadonlyArray<string>; sun: P2; skip?: ReadonlyArray<string>; trap?: number; weight?: number; edges?: boolean; sketch?: Sketch }
/**
 * The artist's own drawing is the line art: its pixels stay. `levels`: what is paper, what is full ink. `erase`: outlines inside which
 * only a share `keep` of the ink is left (searching lines). `soft`: the same for whole parts. Off the figure everything goes.
 */
export type Sketch = { src: string; levels: readonly [number, number]; gamma?: number; erase: ReadonlyArray<{ d: string; keep: number }>; soft?: Readonly<Record<string, number>> }

type V = { x: number; y: number; hard: boolean; gap: boolean }
const read = (d: string): Array<V> => d.trim().split(/\s+/).map((t) => { const [x, y] = t.replace(/[!=\-]+$/, "").split(",").map(Number); if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`cannot read "${t}" in ${d}`); return { x: x!, y: y!, hard: /!/.test(t.slice(-2)), gap: t.endsWith("-") } })
/** "x,y" is a point of a smooth line, "x,y!" a corner; "-" at the end: no line from here to the next point. One point per unit or so. */
export const trace = (d: string, closed: boolean): Array<{ p: P2; gap: boolean }> => {
  const v = read(d), n = v.length, out: Array<{ p: P2; gap: boolean }> = [], at = (i: number): V => v[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))]!
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const b = at(i), c = at(i + 1), a = b.hard ? b : at(i - 1), e = c.hard ? c : at(i + 2), L = Math.hypot(c.x - b.x, c.y - b.y) || 1e-6
    // tangents scaled to this piece, so a short stretch beside a long one does not overshoot
    const tan = (p: V, q: V, r: V): P2 => { const u = Math.hypot(q.x - p.x, q.y - p.y) || 1e-6, w = Math.hypot(r.x - q.x, r.y - q.y) || 1e-6; const tx = ((q.x - p.x) / u) * w + ((r.x - q.x) / w) * u, ty = ((q.y - p.y) / u) * w + ((r.y - q.y) / w) * u; return [(tx / (u + w)) * L, (ty / (u + w)) * L] }
    const m0: P2 = b.hard || (!closed && i === 0) ? [c.x - b.x, c.y - b.y] : tan(a, b, c), m1: P2 = c.hard || (!closed && i + 1 === n - 1) ? [c.x - b.x, c.y - b.y] : tan(b, c, e), steps = Math.max(2, Math.ceil(L / 1.2))
    for (let s = 0; s < steps; s++) { const t = s / steps, t2 = t * t, t3 = t2 * t, h0 = 2 * t3 - 3 * t2 + 1, h1 = t3 - 2 * t2 + t, h2 = -2 * t3 + 3 * t2, h3 = t3 - t2; out.push({ p: [h0 * b.x + h1 * m0[0] + h2 * c.x + h3 * m1[0], h0 * b.y + h1 * m0[1] + h2 * c.y + h3 * m1[1]], gap: b.gap }) }
  }
  if (!closed) { const e = v[n - 1]!; out.push({ p: [e.x, e.y], gap: false }) }
  return out
}
const area = (p: ReadonlyArray<{ p: P2 }>): number => p.reduce((s, { p: [x, y] }, i) => { const [u, w] = p[(i + 1) % p.length]!.p; return s + x * w - u * y }, 0)

export const drawnRegions = (q: Drawn, W: number, H: number, head: number, k: number, pencil?: Float32Array): { ink: Float32Array; w: number; h: number; names: Array<string>; map: Uint8Array } => {
  const w = Math.round(W * k), h = Math.round(H * k), N = w * h, mk = (): CanvasRenderingContext2D => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c.getContext("2d", { willReadFrequently: true })! }
  const tmp = mk(), names = ["", "bg"], ids = new Int16Array(N), partOf: Array<number> = [1], T = q.pieces.map((p) => trace(p.d, true))
  // depth order: what comes later lies in front
  q.pieces.forEach((p, n) => {
    if (!names.includes(p.part)) names.push(p.part)
    partOf.push(names.indexOf(p.part))
    const ok = p.on ? new Set(q.pieces.flatMap((o, i) => (p.on!.includes(o.part) || (o.id && p.on!.includes(o.id)) ? [i + 1] : []))) : null, t = T[n]!
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
    for (const { p: [x, y] } of t) { x0 = Math.min(x0, x * k); y0 = Math.min(y0, y * k); x1 = Math.max(x1, x * k); y1 = Math.max(y1, y * k) }
    const X = Math.max(0, Math.floor(x0) - 2), Y = Math.max(0, Math.floor(y0) - 2), BW = Math.min(w, Math.ceil(x1) + 2) - X, BH = Math.min(h, Math.ceil(y1) + 2) - Y
    if (BW < 1 || BH < 1) return
    tmp.clearRect(X, Y, BW, BH); tmp.beginPath(); t.forEach(({ p: [x, y] }, i) => (i ? tmp.lineTo(x * k, y * k) : tmp.moveTo(x * k, y * k))); tmp.fillStyle = "#000"; tmp.fill()
    const a = tmp.getImageData(X, Y, BW, BH).data, shown = ok ? new Uint8Array(BW * BH) : null
    // what is wound round a form stands a little off it, and no more
    const near = ok && p.grow ? paperDistance(Float32Array.from({ length: BW * BH }, (_, j) => (ok.has(ids[(((j / BW) | 0) + Y) * w + (j % BW) + X]!) ? 1 : 0)), BW, BH, 0.5) : null
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) if (a[(y * BW + x) * 4 + 3]! > 127) { const i = (y + Y) * w + x + X; if (!ok || (near ? near[y * BW + x]! <= p.grow! * k : ok.has(ids[i]!))) { ids[i] = n + 1; if (shown) shown[y * BW + x] = 1 } }
    // clipped, its edge is another one: read it off again, without the steps of the pixels
    if (shown) {
      const L = loops(shown, BW, BH).sort((u, v) => v.length - u.length)[0]
      if (L && L.length > 20) { const r = Math.round(2.2 * k), m = L.length, c = L.map((_, j) => { let x = 0, y = 0; for (let d = -r; d <= r; d++) { const p = L[(j + d + m) % m]!; x += p[0]; y += p[1] } return [x / (2 * r + 1), y / (2 * r + 1)] as P2 }); T[n] = c.filter((_, j) => j % Math.max(1, Math.round(k * 0.8)) === 0).map(([x, y]) => ({ p: [(x + X) / k, (y + Y) / k] as P2, gap: false })) }
    }
  })
  const map = Uint8Array.from(ids, (v) => partOf[v]!), line = mk(), base = head * 0.0078 * (q.weight ?? 1)
  const idAt = (x: number, y: number): number => { const X = Math.round(x * k), Y = Math.round(y * k); return X < 0 || Y < 0 || X >= w || Y >= h ? 0 : ids[Y * w + X]! }
  line.fillStyle = "#000"
  /** A stroke of changing width. */
  const ribbon = (p: ReadonlyArray<P2>, wd: ReadonlyArray<number>): void => {
    const n = p.length
    if (n < 2) return
    const L: Array<P2> = [], R: Array<P2> = []
    for (let i = 0; i < n; i++) { const a = p[Math.max(0, i - 1)]!, b = p[Math.min(n - 1, i + 1)]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l, t = wd[i]! / 2; L.push([p[i]![0] + nx * t, p[i]![1] + ny * t]); R.push([p[i]![0] - nx * t, p[i]![1] - ny * t]) }
    line.beginPath(); [...L, ...R.reverse()].forEach(([x, y], i) => (i ? line.lineTo(x * k, y * k) : line.moveTo(x * k, y * k))); line.closePath(); line.fill()
    for (const i of [0, n - 1]) { line.beginPath(); line.arc(p[i]![0] * k, p[i]![1] * k, (wd[i]! / 2) * k, 0, 7); line.fill() }
  }
  if (q.edges !== false) T.forEach((t, n) => {
    const piece = q.pieces[n]!, me = n + 1, m = t.length, s = area(t) > 0 ? 1 : -1, kind: Array<number> = [], wide: Array<number> = []
    for (let i = 0; i < m; i++) {
      const [x, y] = t[i]!.p, a = t[(i - 2 + m) % m]!.p, b = t[(i + 2) % m]!.p, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = (s * (b[1] - a[1])) / l, ny = (-s * (b[0] - a[0])) / l, e = Math.max(1.1, 1.2 / k)
      const inn = idAt(x - nx * e, y - ny * e), out = idAt(x + nx * e, y + ny * e)
      let z = 0
      if (inn === me && !t[i]!.gap) {
        if (out === 0) z = 3
        else if (out === me) z = 0
        else { const o = q.pieces[out - 1]!; z = piece.join?.some((j) => j === o.part || j === o.id) || o.join?.some((j) => j === piece.part || j === piece.id) ? 0 : o.part === piece.part ? 1 : 2 }
      }
      const far = nx * q.sun[0] + ny * q.sun[1]
      kind.push(z); wide.push(base * (piece.w ?? 1) * (z === 3 ? 1.15 : z === 2 ? 0.92 : 0.56) * (z ? 1 + (far > 0 ? 0.34 : 0.22) * far : 1))
    }
    // runs where the edge shows
    if (kind.every((z) => z > 0)) { ribbon([...t.map((v) => v.p), t[0]!.p], [...even(wide), wide[0]!]); return }
    const start = kind.findIndex((z, i) => z > 0 && !kind[(i - 1 + m) % m])
    if (start < 0) return
    for (let c = 0, i = start; c < m; ) {
      while (c < m && !kind[i % m]) { c++; i++ }
      const run: Array<number> = []
      while (c < m && kind[i % m]) { run.push(i % m); c++; i++ }
      if (run.length < 3) continue
      const ends = [run[0]!, run.at(-1)!].map((j, e) => { if (kind[j] === 3) return false; const [x, y] = t[(j + (e ? 1 : -1) + m) % m]!.p; return idAt(x, y) === me || t[(j + (e ? 1 : -1) + m) % m]!.gap }), wd = even(run.map((j) => wide[j]!)), tail = Math.min(run.length / 2.2, head * 0.075)
      // it runs out where it joins; where something covers it, it just goes under
      ribbon(run.map((j) => t[j]!.p), wd.map((v, j) => v * (ends[0] ? 0.16 + 0.84 * Math.min(1, j / tail) ** 0.8 : 1) * (ends[1] ? 0.16 + 0.84 * Math.min(1, (run.length - 1 - j) / tail) ** 0.8 : 1)))
    }
  })
  // lines inside a form
  for (const m of q.marks) {
    const inked = m.path ? Array.from({ length: m.path.length / 3 }, (_, i) => m.path!.slice(i * 3, i * 3 + 3)) : null
    const p: Array<P2> = inked ? inked.map(([x, y]): P2 => [x!, y!]) : trace(m.d!, false).map((v) => v.p), n = p.length, e = m.ends ?? "both", tail = inked ? Math.min(n / 2.05, head * 0.14) : n / 2.1, ok = m.on ? new Set(m.on) : null, wd = p.map((_, i) => base * 0.62 * (inked ? 0.42 + 1.5 * inked[i]![2]! : 1) * (m.w ?? 1) * (e === "both" || e === "start" ? 0.12 + 0.88 * Math.min(1, i / tail) ** 0.8 : 1) * (e === "both" || e === "end" ? 0.12 + 0.88 * Math.min(1, (n - 1 - i) / tail) ** 0.8 : 1))
    if (!ok) { ribbon(p, wd); continue }
    let run: Array<number> = []
    const flush = (): void => { if (run.length > 1) ribbon(run.map((i) => p[i]!), run.map((i) => wd[i]!)); run = [] }
    p.forEach(([x, y], i) => { const o = idAt(x, y); if (o && (ok.has(q.pieces[o - 1]!.part) || ok.has(q.pieces[o - 1]!.id ?? ""))) run.push(i); else flush() })
    flush()
  }
  for (const d of q.blacks) { const t = trace(d, true); line.beginPath(); t.forEach(({ p: [x, y] }, i) => (i ? line.lineTo(x * k, y * k) : line.moveTo(x * k, y * k))); line.fill() }
  const A = line.getImageData(0, 0, w, h).data, ink = Float32Array.from({ length: N }, (_, i) => A[i * 4 + 3]! / 255)
  if (q.sketch && pencil) {
    const [lo, hi] = q.sketch.levels, keep = new Float32Array(N).fill(1)
    for (const e of q.sketch.erase) { tmp.clearRect(0, 0, w, h); tmp.filter = `blur(${2 * k}px)`; tmp.beginPath(); trace(e.d, true).forEach(({ p: [x, y] }, i) => (i ? tmp.lineTo(x * k, y * k) : tmp.moveTo(x * k, y * k))); tmp.fillStyle = "#000"; tmp.fill(); tmp.filter = "none"; const a = tmp.getImageData(0, 0, w, h).data; for (let i = 0; i < N; i++) keep[i] = keep[i]! * (1 - (a[i * 4 + 3]! / 255) * (1 - e.keep)) }
    const soft = names.map((n) => q.sketch!.soft?.[n] ?? 1), off = paperDistance(Float32Array.from(ids, (v) => (v ? 1 : 0)), w, h, 0.5)
    for (let i = 0; i < N; i++) {
      const v = Math.max(0, Math.min(1, (pencil[i]! - lo) / (hi - lo))) ** (q.sketch.gamma ?? 1) * keep[i]! * (ids[i] ? soft[map[i]!]! : Math.max(0, 1 - Math.max(0, off[i]! - 1 * k) / (1.4 * k)))
      if (v > ink[i]!) ink[i] = v
    }
  }
  // tight spots: grown and shrunk again, what stays filled is where light does not get in
  const r = (q.trap ?? head * 0.0042) * k
  if (r > 0.5) {
    const skip = new Uint8Array(names.length); for (const s of q.skip ?? []) { const n = names.indexOf(s); if (n > 0) skip[n] = 1 }
    const near = paperDistance(ink, w, h, 0.5), grown = Float32Array.from(near, (d) => (d <= r ? 1 : 0)), back = paperDistance(grown.map((v) => 1 - v), w, h, 0.5)
    for (let i = 0; i < N; i++) if (grown[i] && !skip[map[i]!] && ids[i]) { const v = Math.max(0, Math.min(1, back[i]! - r + 0.5)); if (v > ink[i]!) ink[i] = v }
  }
  return { ink, w, h, names, map }
}
const even = (v: ReadonlyArray<number>): Array<number> => v.map((_, i) => { let s = 0, n = 0; for (let d = -7; d <= 7; d++) { const u = v[i + d]; if (u !== undefined) { s += u; n++ } } return s / n })
