/** Turn statements into masks. A mask stops at the ink, runs under it to the centre line, and never leaves its parts. */
import { underInk } from "../bucket/segment.ts"
import type { P2 } from "../geo.ts"
import type { Light } from "./light.ts"
import type { Refs } from "./refs.ts"
import { make } from "./say.ts"

/** A mask kept only where it is: `m` covers the box x, y, w, h of the drawing. */
export type Patch = { x: number; y: number; w: number; h: number; m: Uint8Array }
export type Said = { id: string; say: string; on: ReadonlyArray<string>; in?: string }
export type Stamped = Patch & { id: string; px: number; note: string }
export type Sheet = { ink: Float32Array; map: Uint8Array; names: ReadonlyArray<string>; w: number; h: number; k: number; seg?: Int32Array; light?: Light }
/** Calls `f` with the index, in a drawing `w` wide, of every pixel of the patch. */
export const each = (p: Patch, w: number, f: (i: number) => void): void => { for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.m[y * p.w + x]) f((y + p.y) * w + x + p.x) }

export const stamper = (s: Sheet, R: Refs): ((q: Said, parents: ReadonlyMap<string, Patch>) => Stamped) => {
  const { ink, map, names, w, h, k } = s, N = w * h
  const c = document.createElement("canvas")
  c.width = w; c.height = h
  const g = c.getContext("2d", { willReadFrequently: true })!
  const paper = Uint8Array.from(ink, (v) => (v > 0.42 ? 0 : 1))
  // for every ink pixel, the paper it belongs to
  const near = underInk({ seg: Int32Array.from(paper, (v, i) => (v ? i + 1 : 0)), n: N }, ink, w, h).seg
  const lock = new Uint8Array(N), m = new Uint8Array(N), seen = new Uint8Array(N)
  const draw = (p: ReadonlyArray<P2>, how: "fill" | "stroke", width = 1): { x0: number; y0: number; x1: number; y1: number; at: (i: number) => number } => {
    const pad = Math.ceil(width) + 2, X = p.map((q) => q[0] * k), Y = p.map((q) => q[1] * k)
    const x0 = Math.max(0, Math.floor(Math.min(...X)) - pad), y0 = Math.max(0, Math.floor(Math.min(...Y)) - pad), x1 = Math.min(w, Math.ceil(Math.max(...X)) + pad), y1 = Math.min(h, Math.ceil(Math.max(...Y)) + pad)
    if (!p.length || x1 <= x0 || y1 <= y0) return { x0: 0, y0: 0, x1: 0, y1: 0, at: () => 0 }
    g.clearRect(x0, y0, x1 - x0, y1 - y0); g.beginPath()
    p.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)))
    if (how === "fill") { g.closePath(); g.fill() } else { g.lineWidth = width; g.lineCap = "round"; g.lineJoin = "round"; g.stroke() }
    const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data, W = x1 - x0
    return { x0, y0, x1, y1, at: (i) => { const x = i % w, y = (i / w) | 0; return x < x0 || x >= x1 || y < y0 || y >= y1 ? 0 : d[((y - y0) * W + x - x0) * 4 + 3]! } }
  }
  const spread = (from: ReadonlyArray<number>, ok: (i: number) => boolean, into: Uint8Array): Array<number> => {
    const got: Array<number> = []
    for (const i of from) if (ok(i) && !into[i]) { into[i] = 1; got.push(i) }
    for (let n = 0; n < got.length; n++) { const i = got[n]!, x = i % w; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < N && !into[j] && ok(j)) { into[j] = 1; got.push(j) } }
    return got
  }
  return (q, parents) => {
    const on = new Uint8Array(names.length)
    for (const n of q.on) { const i = names.indexOf(n); if (i > 0) on[i] = 1 }
    const parent = q.in ? parents.get(q.in) : undefined
    if (q.in && !parent) throw new Error(`#${q.id}: no shape #${q.in}`)
    let got: Array<number> = [], note = ""
    const made = make(q.say, R, s.light), free = (i: number): boolean => paper[i] === 1 && on[map[i]!] === 1
    if ("all" in made) { for (let i = 0; i < N; i++) if (free(i)) { m[i] = 1; got.push(i) } }
    else if ("wall" in made) {
      const wall = draw(made.wall, "stroke", 1.6), t0 = Math.round(made.toward[1] * k) * w + Math.round(made.toward[0] * k)
      const ok = (i: number): boolean => free(i) && wall.at(i) < 60
      let seed = -1, bd = 1e9
      for (let dy = -8 * k; dy <= 8 * k; dy++) for (let dx = -8 * k; dx <= 8 * k; dx++) { const j = t0 + dy * w + dx; if (j >= 0 && j < N && dx * dx + dy * dy < bd && ok(j)) { bd = dx * dx + dy * dy; seed = j } }
      if (seed < 0) throw new Error(`#${q.id}: the point to fill is not on ${q.on.join(" ")}`)
      // a bare fill keeps to one bucket patch: lines are rarely closed
      const pool = made.wall.length ? 0 : (s.seg?.[seed] ?? 0)
      got = spread([seed], pool ? (i) => ok(i) && s.seg![i] === pool : ok, m)
      const whole = spread([seed], free, seen)
      for (const i of whole) seen[i] = 0
      const share = got.length / whole.length
      note = `${Math.round(100 * share)}% of its patch`
      if (made.wall.length && share > 0.95) note += " LEAK: the wall does not close"
      const edge: Array<number> = []
      for (let y = wall.y0; y < wall.y1; y++) for (let x = wall.x0; x < wall.x1; x++) { const i = y * w + x; if (!m[i] && wall.at(i) >= 60 && free(i) && (m[i - 1] || m[i + 1] || m[i - w] || m[i + w])) edge.push(i) }
      for (const i of edge) m[i] = 1
      got.push(...edge)
    } else {
      const f = draw(made.poly, "fill"), ok = (i: number): boolean => f.at(i) > 127 && free(i)
      const from: Array<number> = []
      if (made.base.length) { const b = draw(made.base, "stroke", 2.4 * k); for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) { const i = y * w + x; if (b.at(i) > 127) from.push(i) } const f2 = draw(made.poly, "fill"); got = spread(from, (i) => f2.at(i) > 127 && free(i), m) }
      else for (let y = f.y0; y < f.y1; y++) for (let x = f.x0; x < f.x1; x++) { const i = y * w + x; if (ok(i)) { m[i] = 1; got.push(i) } }
    }
    let x0 = w, y0 = h, x1 = 0, y1 = 0
    for (const i of got) { const x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    // lines may be as thick as a filled corner: look that far around
    const pad = 16 * k
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad)
    const under: Array<number> = []
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * w + x; if (!paper[i] && near[i] && m[near[i]! - 1] && on[map[i]!]) under.push(i) }
    for (const i of under) m[i] = 1
    if (parent) each(parent, w, (i) => { lock[i] = 1 })
    const W = Math.max(0, x1 - x0 + 1), H = Math.max(0, y1 - y0 + 1), out = new Uint8Array(W * H)
    let px = 0
    for (const list of [got, under]) for (const i of list) { m[i] = 0; if (parent && !lock[i]) continue; const o = (((i / w) | 0) - y0) * W + (i % w) - x0; if (!out[o]) { out[o] = 1; if (paper[i]) px++ } }
    if (parent) each(parent, w, (i) => { lock[i] = 0 })
    px = Math.round(px / (k * k))
    if (px < 6) note += " DEAD: nothing visible"
    return { id: q.id, x: x0, y: y0, w: W, h: H, m: out, px, note: note.trim() }
  }
}
