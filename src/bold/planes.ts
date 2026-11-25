/**
 * Where a form turns away, measured along the light from drawn line to drawn line. A plane's edge is then always a copy
 * of a line the artist drew, moved along the light: straight where the line is straight, pointed where the form is pointed.
 */
import { underInk } from "../bucket/segment.ts"
import { blur } from "../lineart/flood.ts"
import { aim } from "../tools/light.ts"
import type { Light } from "../tools/light.ts"
import type { P2 } from "../geo.ts"

export type Form = {
  on: ReadonlyArray<string>
  /** "patch": every closed patch is its own form. "part": every part. "mass": all parts together. */
  by?: "patch" | "part" | "mass"
  /** Share of the form, across the light, that is turned away: 0.3 a little, 0.5 half. 1 and more: none. */
  turn?: number
  /** Never wider than this share of head height. */
  most?: number
  /** Which way this form turns away, when it is not the light's own direction: across a limb. */
  to?: P2
}
type Regions = { ink: Float32Array; map: Uint8Array; names: ReadonlyArray<string>; w: number; h: number; z: ReadonlyArray<number> }
/** Per pixel: px to the form's edge along the light, px back to its near edge, place across the light (0..1), and whether it is turned. */
export type Planes = { far: Float32Array; near: Float32Array; side: Float32Array; turned: Float32Array; id: Int32Array }

/**
 * Distance ahead of and behind every pixel to its form's own edge, along a direction. What lies on top of a form is no edge of it:
 * the search goes on underneath until something lower, or another form at the same height, begins.
 */
export const chords = (id: Int32Array, z: Float32Array, w: number, h: number, dx: number, dy: number, only: (n: number) => boolean, far: Float32Array, near: Float32Array): void => {
  const flip = Math.abs(dx) > Math.abs(dy), A = flip ? w : h, B = flip ? h : w, slope = flip ? dy / dx : dx / dy, sign = (flip ? dx : dy) >= 0 ? 1 : -1, unit = Math.hypot(1, slope), shift = Math.ceil(Math.abs(slope) * A)
  const at = new Int32Array(A), up = new Int32Array(A), dn = new Int32Array(A), st = new Int32Array(A + 1)
  const ends = (i: number, j: number): boolean => i < 0 || j < 0 || z[j]! < z[i]! || (z[j] === z[i] && id[j] !== id[i])
  for (let b0 = -shift; b0 < B + shift; b0++) {
    for (let a = 0; a < A; a++) { const b = b0 + Math.round(a * slope); at[a] = b < 0 || b >= B ? -1 : flip ? b * w + a : a * w + b }
    let n = 0
    for (let a = 0; a < A; a++) { const j = at[a]!; while (n && ends(at[st[n - 1]!]!, j)) up[st[--n]!] = a; if (j < 0) { n = 0; continue } st[n++] = a }
    while (n) up[st[--n]!] = A
    for (let a = A - 1; a >= 0; a--) { const j = at[a]!; while (n && ends(at[st[n - 1]!]!, j)) dn[st[--n]!] = a; if (j < 0) { n = 0; continue } st[n++] = a }
    while (n) dn[st[--n]!] = -1
    for (let a = 0; a < A; a++) { const i = at[a]!; if (i < 0 || !id[i] || !only(id[i]!)) continue; const f = (up[a]! - a) * unit, e = (a - dn[a]!) * unit; far[i] = sign > 0 ? f : e; near[i] = sign > 0 ? e : f }
  }
}
/** One label per form; the ink around a form is its own up to the middle of the line, so a line inside a form is no edge. */
export const formIds = (q: Regions, forms: ReadonlyArray<Form>): { id: Int32Array; of: Array<Form | null> } => {
  const { ink, map, names, w, h } = q, N = w * h, id = new Int32Array(N), of: Array<Form | null> = [null], rule = new Map<number, Form>(), key = new Map<string, number>()
  for (const f of forms) for (const n of f.on) { const i = names.indexOf(n); if (i > 0) rule.set(i, f) }
  const label = (k: string, f: Form): number => { let n = key.get(k); if (!n) { n = of.length; of.push(f); key.set(k, n) } return n }
  for (let s = 0; s < N; s++) {
    const f = rule.get(map[s]!)
    if (!f || id[s] || ink[s]! > 0.42) continue
    if (f.by !== "patch") { id[s] = label(f.by === "mass" ? `m${forms.indexOf(f)}` : `p${map[s]}`, f); continue }
    const n = of.length, st = [s], m = map[s]!
    of.push(f); id[s] = n
    for (let t = 0; t < st.length; t++) { const i = st[t]!, x = i % w; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < N && !id[j] && map[j] === m && ink[j]! <= 0.42) { id[j] = n; st.push(j) } }
  }
  const all = underInk({ seg: id, n: of.length }, ink, w, h).seg, out = new Int32Array(N)
  // ink belongs to the nearest form of its own part
  for (let i = 0; i < N; i++) { const n = all[i]!; if (n && rule.get(map[i]!) === of[n]) out[i] = n }
  return { id: out, of }
}
export const planes = (q: Regions, forms: ReadonlyArray<Form>, light: Light, head: number, k: number): Planes => {
  const { w, h } = q, N = w * h, L = aim(light), far = new Float32Array(N), near = new Float32Array(N), side = new Float32Array(N), turned = new Float32Array(N), { id, of } = formIds(q, forms)
  const zs = Float32Array.from(q.map, (m) => q.z[m] ?? 0)
  const dirs = new Map<string, Array<Form>>()
  for (const f of forms) { const d = f.to ?? ([L.x, L.y] as P2), s = d.join(); dirs.set(s, [...(dirs.get(s) ?? []), f]) }
  const lo = new Float32Array(of.length).fill(1e9), hi = new Float32Array(of.length).fill(-1e9), dir: Array<P2> = of.map((f) => { const d = f?.to ?? [L.x, L.y], l = Math.hypot(d[0]!, d[1]!); return [d[0]! / l, d[1]! / l] as P2 })
  for (const [s, fs] of dirs) { const [dx, dy] = s.split(",").map(Number), l = Math.hypot(dx!, dy!); chords(id, zs, w, h, dx! / l, dy! / l, (n) => fs.includes(of[n]!), far, near) }
  for (let i = 0; i < N; i++) { const n = id[i]!; if (!n) continue; const d = dir[n]!, p = -(i % w) * d[1] + ((i / w) | 0) * d[0]; if (p < lo[n]!) lo[n] = p; if (p > hi[n]!) hi[n] = p; side[i] = p }
  for (let i = 0; i < N; i++) {
    const n = id[i]!, f = of[n]
    if (!f) continue
    side[i] = (side[i]! - lo[n]!) / Math.max(1, hi[n]! - lo[n]!)
    const C = far[i]! + near[i]!, T = f.turn ?? 0.3
    if (T >= 1 || C < 2.2 * k) continue
    const d = Math.min(T * C, (f.most ?? 0.4) * head * k)
    turned[i] = Math.max(0, Math.min(1, d - far[i]! + 0.5))
  }
  // a pixel on its own does not decide: the plane is what most of its neighbours say
  const inside = new Float32Array(N)
  for (let i = 0; i < N; i++) inside[i] = id[i] ? 1 : 0
  const r = Math.max(1, head * 0.011 * k), a = blur(turned, w, h, r, 2), b = blur(inside, w, h, r, 2)
  for (let i = 0; i < N; i++) if (id[i]) turned[i] = a[i]! / b[i]! > 0.5 ? 1 : 0
  return { far, near, side, turned, id }
}
