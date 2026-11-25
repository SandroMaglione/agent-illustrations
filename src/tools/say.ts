/**
 * Shapes as statements about the drawing. Each returns the polygon it fills (line-art px) or a wall plus the side to fill.
 *   band s388[0..1] d 0 14 0        shadow hanging off one side (l r u d) of a line; widths in px along it, smooth between
 *                                   side `away` or `near`: from the light, and thinner where the line runs along it
 *   turn A B [.12]                  the shaded part of a tube between two rails, worked out from the light
 *   crest l r t b .9               the lit cap of the same ball; the number is how close to the light
 *   ball l r t b [.12]              the shaded part of a ball through four points, worked out from the light
 *   line s330@.9 s415@0 > s439@.5   draw the missing boundary (a curve through the points), fill the side where the last point is
 *   run s1[0..1] s2[1..0] ~.2 ...   a closed outline made of stretches of line and free curves (~ bulge, share of the chord)
 *   flow s29[0..1] s35[.2..1] .4 0 .3 0   a tapered strand that runs between two lines, at a share of the gap; widths as shares of the gap
 *   ring A B C ^ P .2 [~.2]         a highlight band through the points, one lobe between each two, `.2` of the way towards P thick
 *   warp! A B |                     the same, but 0 across is always the side nearer the light
 *   warp A B | 0,.2! .5,.3 1,.2! …  a free shape drawn in the space between two lines: across 0..1 from A to B, along 0..1 from first to last.
 *                                   A and B are stretches joined with + (points too); "!" marks a corner
 *   fill s1@.5:s2@.5:.5             the whole patch around a point
 *   all                             the whole part; `lift` then cuts light back out of it
 */
import type { P2 } from "../geo.ts"
import { loop } from "../cel/path.ts"
import { aim, terminator, UPPER_LEFT } from "./light.ts"
import type { Light } from "./light.ts"
import type { Refs } from "./refs.ts"

export type Made = { poly: Array<P2>; base: Array<P2> } | { wall: Array<P2>; toward: P2 } | { all: true }
/** A curve from a to b that bows by `bulge` of its length; positive bows to the left of travel. */
export const bow = (a: P2, b: P2, bulge: number): Array<P2> => {
  const dx = b[0] - a[0], dy = b[1] - a[1], m: P2 = [(a[0] + b[0]) / 2 + dy * bulge * 2, (a[1] + b[1]) / 2 - dx * bulge * 2]
  return Array.from({ length: 25 }, (_, i): P2 => { const t = i / 24, u = 1 - t; return [u * u * a[0] + 2 * u * t * m[0] + t * t * b[0], u * u * a[1] + 2 * u * t * m[1] + t * t * b[1]] })
}
/** `r` points either way: a wide band needs a calmer direction than a thin one. */
const normals = (p: ReadonlyArray<P2>, r: number): Array<P2> => p.map((_, i) => { const a = p[Math.max(0, i - r)]!, b = p[Math.min(p.length - 1, i + r)]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l] })
const SIDE: Readonly<Record<string, P2>> = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] }

/** Stretches of line and points joined into one rail, walked by its length. */
const rail = (said: string, R: Refs): ((v: number) => P2) => {
  const p = said.split("+").flatMap((t) => (/^s\d+(\[|$)/.test(t) ? R.run(t).p : [R.at(t)])), L = [0]
  for (let i = 1; i < p.length; i++) L.push(L[i - 1]! + Math.hypot(p[i]![0] - p[i - 1]![0], p[i]![1] - p[i - 1]![1]))
  return (v) => { const d = v * L.at(-1)!; let i = 1; while (i < L.length - 1 && L[i]! < d) i++; if (p.length < 2) return p[0]!; const u = (d - L[i - 1]!) / (L[i]! - L[i - 1]! || 1); return [p[i - 1]![0] + (p[i]![0] - p[i - 1]![0]) * u, p[i - 1]![1] + (p[i]![1] - p[i - 1]![1]) * u] }
}
export const make = (say: string, R: Refs, light: Light = UPPER_LEFT): Made => {
  const L = aim(light)
  const [verb, ...w] = say.trim().split(/\s+/)
  if (verb === "band") {
    const r = R.run(w[0]!), auto = w[1] === "away" || w[1] === "near", side = auto ? ([L.x * (w[1] === "away" ? 1 : -1), L.y * (w[1] === "away" ? 1 : -1)] as P2) : SIDE[w[1]!]!, widths = w.slice(2).map(Number), n = normals(r.p, 6 + Math.round(Math.max(...widths) * 0.7))
    let s = 0
    for (const q of n) s += q[0] * side[0] + q[1] * side[1]
    const sign = s < 0 ? -1 : 1, last = r.p.length - 1
    // a smooth profile through the stated widths, never dipping below zero
    const wide = (i: number): number => {
      const u = (i / last) * (widths.length - 1), j = Math.min(widths.length - 2, Math.floor(u)), t = u - j, at = (n: number): number => widths[Math.max(0, Math.min(widths.length - 1, n))]!
      const m0 = j ? (at(j + 1) - at(j - 1)) / 2 : at(1) - at(0), m1 = j + 2 < widths.length ? (at(j + 2) - at(j)) / 2 : at(j + 1) - at(j)
      return Math.max(0, (2 * t ** 3 - 3 * t * t + 1) * at(j) + (t ** 3 - 2 * t * t + t) * m0 + (3 * t * t - 2 * t ** 3) * at(j + 1) + (t ** 3 - t * t) * m1)
    }
    const far = r.p.map((q, i): P2 => { const c = auto ? Math.min(1, 0.25 + 1.1 * Math.max(0, (n[i]![0] * side[0] + n[i]![1] * side[1]) * sign)) : 1, d = wide(i) * c; const e = d + r.half[i]! * Math.min(1, d / 3); return [q[0] + n[i]![0] * sign * e, q[1] + n[i]![1] * sign * e] })
    return { poly: [...r.p, ...far.reverse()], base: r.p.map((q, i): P2 => [q[0] + n[i]![0] * sign * (r.half[i]! + 1), q[1] + n[i]![1] * sign * (r.half[i]! + 1)]) }
  }
  if (verb === "turn") {
    const A = rail(w[0]!, R), B = rail(w[1]!, R), t = Number(w[2] ?? 0.12), P: Array<P2> = [], Q: Array<P2> = []
    for (let i = 0; i <= 80; i++) {
      const a = A(i / 80), b = B(i / 80), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, side = ((b[0] - a[0]) * L.x + (b[1] - a[1]) * L.y) / l * L.flat, u = (terminator(Math.abs(side), L.z, t) + 1) / 2, from = side > 0 ? u : 1 - u
      P.push([a[0] + (b[0] - a[0]) * from, a[1] + (b[1] - a[1]) * from]); Q.push(side > 0 ? b : a)
    }
    return { poly: [...P, ...Q.reverse()], base: [] }
  }
  if (verb === "crest") {
    const [l, r, u, d] = w.slice(0, 4).map((x) => R.at(x)) as [P2, P2, P2, P2], th = Math.acos(Number(w[4] ?? 0.9)), cx = (l[0] + r[0]) / 2, cy = (u[1] + d[1]) / 2, rx = Math.abs(r[0] - l[0]) / 2, ry = Math.abs(d[1] - u[1]) / 2, poly: Array<P2> = []
    // the light as a direction: p along the fall (towards the light is minus), q across, z to the viewer
    for (let i = 0; i < 64; i++) { const f = (i / 64) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th), p = -L.flat * c + L.z * s * Math.cos(f), q = s * Math.sin(f), z = L.z * c + L.flat * s * Math.cos(f), m = Math.hypot(p, q) || 1, k = z < 0 ? 1 / m : 1; poly.push([cx + (p * L.x - q * L.y) * k * rx, cy + (p * L.y + q * L.x) * k * ry]) }
    return { poly, base: [] }
  }
  if (verb === "ball") {
    const [l, r, u, d] = w.slice(0, 4).map((x) => R.at(x)) as [P2, P2, P2, P2], t = Number(w[4] ?? 0.12), cx = (l[0] + r[0]) / 2, cy = (u[1] + d[1]) / 2, rx = Math.abs(r[0] - l[0]) / 2, ry = Math.abs(d[1] - u[1]) / 2, edge: Array<P2> = [], out: Array<P2> = []
    for (let i = 0; i <= 60; i++) {
      const q = -1 + i / 30, m = Math.sqrt(Math.max(0, 1 - q * q))
      let p0 = m
      for (let p = -m; p <= m; p += 0.01) if (-L.flat * p + L.z * Math.sqrt(Math.max(0, 1 - p * p - q * q)) < t && p > -m * 0.6) { p0 = p; break }
      const at = (p: number): P2 => [cx + (p * L.x - q * L.y) * rx, cy + (p * L.y + q * L.x) * ry]
      edge.push(at(p0)); out.push(at(Math.max(p0, m + 0.35)))
    }
    return { poly: [...edge, ...out.reverse()], base: [] }
  }
  if (verb === "all") return { all: true }
  if (verb === "fill") return { wall: [], toward: R.at(w[0]!) }
  if (verb === "line") {
    const cut = w.indexOf(">"), wall: Array<P2> = []
    let from: P2 | null = null, bulge = 0
    for (const t of w.slice(0, cut)) {
      if (t.startsWith("~")) { bulge = Number(t.slice(1)); continue }
      if (/^s\d+(\[|$)/.test(t)) { const r = R.run(t); if (from) wall.push(...bow(from, r.p[0]!, bulge)); wall.push(...r.p); from = r.p.at(-1)!; bulge = 0; continue }
      const p = R.at(t)
      if (from) wall.push(...bow(from, p, bulge)); else wall.push(p)
      from = p; bulge = 0
    }
    return { wall, toward: R.at(w[cut + 1]!) }
  }
  if (verb === "flow") {
    const a = R.run(w[0]!).p, b = R.run(w[1]!).p, at = Number(w[2]), widths = w.slice(3).map(Number), n = 60, l: Array<P2> = [], r: Array<P2> = []
    const on = (p: ReadonlyArray<P2>, t: number): P2 => { const i = t * (p.length - 1), j = Math.min(p.length - 2, Math.floor(i)), u = i - j; return [p[j]![0] + (p[j + 1]![0] - p[j]![0]) * u, p[j]![1] + (p[j + 1]![1] - p[j]![1]) * u] }
    const wide = (t: number): number => { const i = t * (widths.length - 1), j = Math.min(widths.length - 2, Math.floor(i)), u = (1 - Math.cos(Math.PI * (i - j))) / 2; return widths[j]! + (widths[j + 1]! - widths[j]!) * u }
    for (let i = 0; i <= n; i++) { const t = i / n, p = on(a, t), q = on(b, t), d = wide(t) / 2; l.push([p[0] + (q[0] - p[0]) * (at - d), p[1] + (q[1] - p[1]) * (at - d)]); r.push([p[0] + (q[0] - p[0]) * (at + d), p[1] + (q[1] - p[1]) * (at + d)]) }
    return { poly: [...l, ...r.reverse()], base: [] }
  }
  if (verb === "warp" || verb === "warp!") {
    const cut = w.indexOf("|"), a0 = rail(w[0]!, R), b0 = rail(w[1]!, R)
    let across = 0
    for (let i = 0; i <= 10; i++) { const p = a0(i / 10), q = b0(i / 10); across += (q[0] - p[0]) * L.x + (q[1] - p[1]) * L.y }
    const flip = verb === "warp!" && across < 0, A = flip ? b0 : a0, B = flip ? a0 : b0
    const uv = loop(w.slice(cut + 1).map((t) => t.replace(/(-?[\d.]+),(-?[\d.]+)/, (_, x: string, y: string) => `${Number(x) * 100},${Number(y) * 100}`)).join(" "), 14), poly: Array<P2> = []
    // a straight edge in this space is a curve on the drawing: it has to be walked, or it becomes a chord
    uv.forEach(([x0, y0], i) => { const [x1, y1] = uv[(i + 1) % uv.length]!, n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3)); for (let j = 0; j < n; j++) { const x = x0 + ((x1 - x0) * j) / n, v = Math.max(0, Math.min(1, (y0 + ((y1 - y0) * j) / n) / 100)), q = A(v), r = B(v); poly.push([q[0] + ((r[0] - q[0]) * x) / 100, q[1] + ((r[1] - q[1]) * x) / 100]) } })
    return { poly, base: [] }
  }
  if (verb === "ring") {
    const c = w.indexOf("^"), P = w.slice(0, c).map((t) => R.at(t)), C = R.at(w[c + 1]!), thick = w.slice(c + 2).filter((t) => !t.startsWith("~")).map(Number), lobe = Number((w.find((t) => t.startsWith("~")) ?? "~.18").slice(1))
    const t = (i: number): number => { const u = (i / Math.max(1, P.length - 1)) * (thick.length - 1), j = Math.min(Math.max(0, thick.length - 2), Math.floor(u)); return thick[j]! + ((thick[j + 1] ?? thick[j]!) - thick[j]!) * (u - j) }
    const up = (p: P2, s: number): P2 => [p[0] + (C[0] - p[0]) * s, p[1] + (C[1] - p[1]) * s], low: Array<P2> = [], top: Array<P2> = []
    // every lobe bows away from the crown below and, less, towards it above; between two lobes the band is pinched
    const away = (a: P2, b: P2, m: number): Array<P2> => { const side = (b[0] - a[0]) * (C[1] - a[1]) - (b[1] - a[1]) * (C[0] - a[0]); return bow(a, b, side > 0 ? m : -m) }
    for (let i = 0; i + 1 < P.length; i++) { const a = up(P[i]!, i ? t(i) * 0.3 : t(i) * 0.5), b = up(P[i + 1]!, i + 2 < P.length ? t(i + 1) * 0.3 : t(i + 1) * 0.5); low.push(...away(a, b, lobe)); top.push(...away(up(P[i]!, t(i) * (i ? 0.92 : 0.6)), up(P[i + 1]!, t(i + 1) * (i + 2 < P.length ? 0.92 : 0.6)), -lobe * 0.12)) }
    return { poly: [...low, ...top.reverse()], base: [] }
  }
  if (verb === "run") {
    const poly: Array<P2> = []
    let bulge = 0
    const tail: Array<string> = [...w]
    let from: P2 | null = null, first: P2 | null = null
    for (const t of tail) {
      if (t.startsWith("~")) { bulge = Number(t.slice(1)); continue }
      const p = /^s\d+(\[|$)/.test(t) ? R.run(t).p : [R.at(t)]
      if (from) poly.push(...bow(from, p[0]!, bulge).slice(1))
      poly.push(...p); first ??= p[0]!; from = p.at(-1)!; bulge = 0
    }
    if (bulge && from && first) poly.push(...bow(from, first, bulge).slice(1))
    return { poly, base: [] }
  }
  throw new Error(`cannot read "${say}"`)
}
