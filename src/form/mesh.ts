/**
 * The blockout: a drawing's forms as low-poly meshes, in the drawing's own view. x right and y down in line-art px, z toward the viewer.
 * A form is built from what the line art shows (where its two outlines run) plus what it does not show (how deep it is, and which way
 * its cross-section curves), so it lands on the drawing by construction and the depth can be judged by turning it around.
 */
import { snapEnds } from "./snap.ts"

export type V3 = readonly [number, number, number]
export type Mesh = { v: Array<V3>; f: Array<readonly [number, number, number]> }
export type Part = { name: string; group: string; mesh: Mesh }
/** Cross-section: left outline x,y, right outline x,y, depth z of its middle, half depth, how far its front bows along the form (px, + = towards the next section), and how much nearer the right end lies than the left. */
export type Section = readonly [number, number, number, number, number, number, number?, number?]

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k]
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const len = (a: V3): number => Math.hypot(a[0], a[1], a[2])
export const unit = (a: V3): V3 => mul(a, 1 / (len(a) || 1))

export const join = (...m: ReadonlyArray<Mesh>): Mesh => { const o: Mesh = { v: [], f: [] }; for (const q of m) { const n = o.v.length; o.v.push(...q.v); for (const [a, b, c] of q.f) o.f.push([a + n, b + n, c + n]) } return o }

/** A cross-section's outline in the unit square: 2 is an ellipse, 4 is nearly a box. */
export const profile = (n: number, seg: number): Array<readonly [number, number]> => Array.from({ length: seg }, (_, i) => { const a = (i / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), e = 2 / n; return [Math.sign(c) * Math.abs(c) ** e, Math.sign(s) * Math.abs(s) ** e] as const })

/** Closed rings joined into a skin, both ends closed. */
export const skin = (rings: ReadonlyArray<ReadonlyArray<V3>>, caps = true): Mesh => {
  const m: Mesh = { v: rings.flat(), f: [] }, n = rings[0]!.length
  for (let j = 0; j + 1 < rings.length; j++) for (let i = 0; i < n; i++) { const a = j * n + i, b = j * n + ((i + 1) % n), c = a + n, d = b + n; m.f.push([a, b, c], [b, d, c]) }
  if (caps) for (const j of [0, rings.length - 1]) { const r = rings[j]!, c = mul(r.reduce(add, [0, 0, 0] as V3), 1 / n), k = m.v.length; m.v.push(c); for (let i = 0; i < n; i++) m.f.push(j ? [k, j * n + i, j * n + ((i + 1) % n)] : [k, (i + 1) % n, i]) }
  return m
}

/** Cubic through the sections, so a few of them give a smooth limb. */
const through = (s: ReadonlyArray<ReadonlyArray<number>>, per: number): Array<Array<number>> => {
  const out: Array<Array<number>> = []
  for (let j = 0; j + 1 < s.length; j++) {
    const p = [s[Math.max(0, j - 1)]!, s[j]!, s[j + 1]!, s[Math.min(s.length - 1, j + 2)]!]
    for (let e = 0; e < per; e++) { const t = e / per; out.push(s[j]!.map((_, q) => { const [a, b, c, d] = p.map((z) => z[q]!) as [number, number, number, number]; return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a))) })) }
  }
  out.push([...s[s.length - 1]!])
  return out
}

/** Sections moved onto the drawn border of the regions `on`. */
const onto = (o: { on?: string; reach?: number }, s: Array<Array<number>>): Array<Array<number>> => {
  if (!o.on) return s
  const e = snapEnds(o.on.split(/\s+/), s.map((q) => [[q[0]!, q[1]!, 0], [q[2]!, q[3]!, 0]] as const), o.reach ?? 12)
  return s.map((q, i) => [e[i]![0][0], e[i]![0][1], e[i]![1][0], e[i]![1][1], ...q.slice(4)])
}

/** A form between two drawn outlines. */
export const loft = (secs: ReadonlyArray<Section>, o: { n?: number; seg?: number; per?: number; caps?: boolean; shape?: ReadonlyArray<readonly [number, number]>; on?: string; reach?: number; tip?: number } = {}): Mesh => {
  const pf = o.shape ?? profile(o.n ?? 2.2, o.seg ?? 12), s = onto(o, through(secs.map((q) => [q[0], q[1], q[2], q[3], q[4], q[5], q[6] ?? 0, q[7] ?? 0]), o.per ?? 2))
  return skin(s.map((q, j) => {
    const [lx, ly, rx, ry, z, d, bow, yaw] = q as [number, number, number, number, number, number, number, number]
    const cx = (lx + rx) / 2, cy = (ly + ry) / 2, ax = (rx - lx) / 2, ay = (ry - ly) / 2, l = Math.hypot(ax, ay) || 1
    // the direction the form runs in on the page: the side of the section's line where the next one lies
    const A = s[Math.max(0, j - 1)]!, B = s[Math.min(s.length - 1, j + 1)]!, go = ((B[0]! + B[2]! - A[0]! - A[2]!) / 2) * -ay + ((B[1]! + B[3]! - A[1]! - A[3]!) / 2) * ax >= 0 ? 1 : -1
    // a form that comes toward the viewer is cut by rings that tip back: that is what foreshortening is
    const run = Math.hypot((B[0]! + B[2]! - A[0]! - A[2]!) / 2, (B[1]! + B[3]! - A[1]! - A[3]!) / 2) || 1, tip = Math.atan2(B[4]! - A[4]!, run) * (o.tip ?? 1), lean = bow - Math.sin(tip) * d, deep = d * Math.cos(tip)
    const px = (-ay / l) * go * lean, py = (ax / l) * go * lean
    return pf.map(([u, w]): V3 => [cx + ax * u + px * w, cy + ay * u + py * w, z + (yaw / 2) * u + deep * w])
  }), o.caps ?? true)
}

/** A round limb along a 3D axis: x,y,z,r and, where it is not round, the half depth. */
export const tube = (axis: ReadonlyArray<readonly [number, number, number, number, number?]>, o: { n?: number; seg?: number; per?: number; up?: V3 } = {}): Mesh => {
  const s = through(axis.map((q) => [q[0], q[1], q[2], q[3], q[4] ?? q[3]]), o.per ?? 2), pf = profile(o.n ?? 2, o.seg ?? 10)
  return skin(s.map((q, j) => {
    const A = s[Math.max(0, j - 1)]!, B = s[Math.min(s.length - 1, j + 1)]!, t = unit([B[0]! - A[0]!, B[1]! - A[1]!, B[2]! - A[2]!]), side = unit(cross(t, o.up ?? [0, 0, 1])), up = cross(side, t)
    return pf.map(([u, w]) => add([q[0]!, q[1]!, q[2]!], add(mul(side, u * q[3]!), mul(up, w * q[4]!))))
  }))
}

/** A ball, or an egg with three radii, turned in the page by `turn` degrees. */
export const ball = (c: V3, r: number | V3, o: { turn?: number; rows?: number; seg?: number } = {}): Mesh => {
  const [a, b, d] = typeof r === "number" ? [r, r, r] : r, rows = o.rows ?? 8, seg = o.seg ?? 12, t = ((o.turn ?? 0) * Math.PI) / 180, C = Math.cos(t), S = Math.sin(t)
  return skin(Array.from({ length: rows + 1 }, (_, j) => { const p = (Math.max(0.02, Math.min(0.98, j / rows)) * Math.PI), y = -Math.cos(p) * b, q = Math.sin(p); return Array.from({ length: seg }, (_, i): V3 => { const w = (i / seg) * Math.PI * 2, x = Math.cos(w) * q * a; return [c[0] + x * C - y * S, c[1] + x * S + y * C, c[2] + Math.sin(w) * q * d] }) }))
}

/** Polygon triangles by ear clipping on the page. */
export const ears = (p: ReadonlyArray<readonly [number, number, ...Array<number>]>): Array<readonly [number, number, number]> => {
  const area = p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]!; return s + q[0] * r[1] - r[0] * q[1] }, 0), idx = p.map((_, i) => i), out: Array<readonly [number, number, number]> = []
  if (area < 0) idx.reverse()
  const side = (a: number, b: number, c: number): number => (p[b]![0] - p[a]![0]) * (p[c]![1] - p[a]![1]) - (p[b]![1] - p[a]![1]) * (p[c]![0] - p[a]![0])
  let guard = 0
  while (idx.length > 3 && guard++ < 4000) {
    let cut = -1
    for (let i = 0; i < idx.length && cut < 0; i++) {
      const a = idx[(i + idx.length - 1) % idx.length]!, b = idx[i]!, c = idx[(i + 1) % idx.length]!
      if (side(a, b, c) <= 1e-9) continue
      if (idx.every((q) => q === a || q === b || q === c || !(side(a, b, q) >= 0 && side(b, c, q) >= 0 && side(c, a, q) >= 0))) cut = i
    }
    if (cut < 0) cut = 0
    out.push([idx[(cut + idx.length - 1) % idx.length]!, idx[cut]!, idx[(cut + 1) % idx.length]!]); idx.splice(cut, 1)
  }
  if (idx.length === 3) out.push([idx[0]!, idx[1]!, idx[2]!])
  return out
}

/** A flat or bent piece with thickness: cloth panels, flaps, straps. The thickness goes back from the viewer, or along `to`. */
export const panel = (outline: ReadonlyArray<V3>, thick = 4, to: V3 = [0, 0, -1]): Mesh => {
  const n = outline.length, t = ears(outline), d = mul(to, thick), m: Mesh = { v: [...outline, ...outline.map((q) => add(q, d))], f: [] }
  for (const [a, b, c] of t) m.f.push([a, b, c], [a + n, c + n, b + n])
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; m.f.push([i, i + n, j], [j, i + n, j + n]) }
  return m
}
/** The same from text: "x,y,z x,y,z …". */
export const pts = (s: string): Array<V3> => s.trim().split(/\s+/).map((t) => { const [x, y, z] = t.split(",").map(Number); return [x!, y!, z ?? 0] as V3 })

/** A box from its four front corners and the vector to its back. */
export const box = (a: V3, b: V3, c: V3, d: V3, back: V3): Mesh => ({ v: [a, b, c, d, add(a, back), add(b, back), add(c, back), add(d, back)], f: [[0, 1, 2], [0, 2, 3], [5, 4, 7], [5, 7, 6], [4, 0, 3], [4, 3, 7], [1, 5, 6], [1, 6, 2], [4, 5, 1], [4, 1, 0], [3, 2, 6], [3, 6, 7]] })

/** A ring of a round wire: centre, radius, wire, and the direction the hole looks in. */
export const torus = (c: V3, r: number | readonly [number, number], wire: number, look: V3 = [0, 0, 1], seg = 16, ring = 6): Mesh => {
  const w = unit(look), u = unit(cross(w, Math.abs(w[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), v = cross(w, u), [ra, rb] = typeof r === "number" ? [r, r] : r, m: Mesh = { v: [], f: [] }
  for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2, dir = add(mul(u, Math.cos(a) * ra), mul(v, Math.sin(a) * rb)), o = unit(dir); for (let j = 0; j < ring; j++) { const b = (j / ring) * Math.PI * 2; m.v.push(add(c, add(dir, add(mul(o, Math.cos(b) * wire), mul(w, Math.sin(b) * wire))))) } }
  for (let i = 0; i < seg; i++) for (let j = 0; j < ring; j++) { const a = i * ring + j, b = i * ring + ((j + 1) % ring), c2 = ((i + 1) % seg) * ring + j, d = ((i + 1) % seg) * ring + ((j + 1) % ring); m.f.push([a, b, c2], [b, d, c2]) }
  return m
}

export type Pose = { yaw: number; pitch: number; roll: number; k: number; x: number; y: number; z: number }
/** Model space to the page: turn left/right, nod, tilt, scale, move. */
export const place = (p: Pose, q: V3): V3 => {
  const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw), cp = Math.cos(p.pitch), sp = Math.sin(p.pitch), cr = Math.cos(p.roll), sr = Math.sin(p.roll)
  const x1 = q[0] * cy + q[2] * sy, z1 = -q[0] * sy + q[2] * cy, y2 = q[1] * cp + z1 * sp, z2 = -q[1] * sp + z1 * cp
  return [(x1 * cr - y2 * sr) * p.k + p.x, (x1 * sr + y2 * cr) * p.k + p.y, z2 * p.k + p.z]
}
/** The pose that puts model landmarks on their drawn places. */
export const solve = (marks: ReadonlyArray<readonly [V3, readonly [number, number], number?]>, start: Pose, hold: ReadonlyArray<string> = []): { pose: Pose; err: number } => {
  let p = { ...start }
  const keys = (["yaw", "pitch", "roll", "k", "x", "y"] as const).filter((q) => !hold.includes(q)), res = (q: Pose): Array<number> => marks.flatMap(([m, [x, y], w = 1]) => { const r = place(q, m); return [(r[0] - x) * w, (r[1] - y) * w] }), cost = (q: Pose): number => res(q).reduce((a, b) => a + b * b, 0)
  let damp = 1
  for (let it = 0; it < 200; it++) {
    const r0 = res(p), J = keys.map((key) => { const e = key === "x" || key === "y" || key === "k" ? 0.01 : 1e-4, r = res({ ...p, [key]: p[key] + e }); return r.map((v, i) => (v - r0[i]!) / e) })
    const n = keys.length, A = J.map((a, i) => [...J.map((b, j) => a.reduce((s, v, q) => s + v * b[q]!, 0) * (i === j ? 1 + damp : 1)), -a.reduce((s, v, q) => s + v * r0[q]!, 0)])
    for (let i = 0; i < n; i++) { let m = i; for (let j = i; j < n; j++) if (Math.abs(A[j]![i]!) > Math.abs(A[m]![i]!)) m = j; [A[i], A[m]] = [A[m]!, A[i]!]; for (let j = 0; j < n; j++) if (j !== i) { const f = A[j]![i]! / (A[i]![i]! || 1e-12); for (let c = i; c <= n; c++) A[j]![c]! -= f * A[i]![c]! } }
    const q = { ...p }; keys.forEach((key, i) => { q[key] += A[i]![n]! / (A[i]![i]! || 1e-12) })
    if (cost(q) < cost(p)) { p = q; damp *= 0.5 } else damp *= 3
  }
  return { pose: p, err: Math.sqrt(cost(p) / marks.length) }
}
export const move = (m: Mesh, f: (v: V3) => V3): Mesh => ({ v: m.v.map(f), f: m.f })
/** Mirror on x = 0 and keep both halves. */
export const both = (m: Mesh): Mesh => join(m, { v: m.v.map(([x, y, z]): V3 => [-x, y, z]), f: m.f.map(([a, b, c]) => [a, c, b] as const) })

/** A bent sheet between two edges that run side by side: bulge lifts its middle, along the sheet's own front. */
export const strip = (a: ReadonlyArray<V3>, b: ReadonlyArray<V3>, o: { bulge?: number; thick?: number; across?: number; per?: number; on?: string; reach?: number } = {}): Mesh => {
  let A = through(a, o.per ?? 2) as Array<Array<number>>, B = through(b, o.per ?? 2) as Array<Array<number>>
  if (o.on) { const e = snapEnds(o.on.split(/\s+/), A.map((q, i) => [q as unknown as V3, B[i] as unknown as V3] as const), o.reach ?? 10); A = e.map((q) => [...q[0]]); B = e.map((q) => [...q[1]]) }
  const n = o.across ?? 3, t = o.thick ?? 4
  return skin(A.map((q, j) => {
    const p = q as unknown as V3, r = B[j] as unknown as V3, nx = A[Math.min(A.length - 1, j + 1)] as unknown as V3, pv = A[Math.max(0, j - 1)] as unknown as V3
    let f = unit(cross(sub(r, p), sub(nx, pv)))
    if (f[2] < 0) f = mul(f, -1)
    const row = Array.from({ length: n + 1 }, (_, i) => add(add(p, mul(sub(r, p), i / n)), mul(f, (o.bulge ?? 0) * 4 * (i / n) * (1 - i / n))))
    return [...row, ...row.map((v) => add(v, mul(f, -t))).reverse()]
  }))
}

/** What lies at x,y in a list of meshes: the nearest surface to the viewer. Beyond their edge, the closest point of it counts. */
export const height = (list: ReadonlyArray<Mesh>, w = 1024, h = 1536): ((x: number, y: number) => number) => {
  const z = new Float32Array(w * h).fill(-1e9)
  for (const m of list) for (const [ia, ib, ic] of m.f) {
    const a = m.v[ia]!, b = m.v[ib]!, c = m.v[ic]!, area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    if (Math.abs(area) < 1e-6) continue
    for (let y = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))); y <= Math.min(h - 1, Math.max(a[1], b[1], c[1])); y++) for (let x = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))); x <= Math.min(w - 1, Math.max(a[0], b[0], c[0])); x++) { const wb = ((x - a[0]) * (c[1] - a[1]) - (y - a[1]) * (c[0] - a[0])) / area, wc = ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0])) / area, wa = 1 - wb - wc; if (wa >= -0.01 && wb >= -0.01 && wc >= -0.01) z[y * w + x] = Math.max(z[y * w + x]!, wa * a[2] + wb * b[2] + wc * c[2]) }
  }
  return (X, Y) => { const x = Math.round(X), y = Math.round(Y); for (let r = 0; r < 120; r++) { let best = -1e9, bd = 1e9; for (let i = 0; i < Math.max(1, r * 8); i++) { const a = (i / Math.max(1, r * 8)) * 6.2832, u = Math.round(x + Math.cos(a) * r), v = Math.round(y + Math.sin(a) * r), q = u >= 0 && v >= 0 && u < w && v < h ? z[v * w + u]! : -1e9; if (q > -1e8) { const d = Math.hypot(u - x, v - y); if (d < bd) { bd = d; best = q } } } if (best > -1e8) return best } return 0 }
}

/** Even triangles inside an outline: its edge cut fine, a grid inside it, Delaunay. */
export const even = (outline: ReadonlyArray<V3>, step: number): { v: Array<V3>; f: Array<readonly [number, number, number]>; rim: number } => {
  const v: Array<V3> = outline.flatMap((a, i) => { const b = outline[(i + 1) % outline.length]!, n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); return Array.from({ length: n }, (_, e): V3 => add(a, mul(sub(b, a), e / n))) }), rim = v.length
  const inside = (x: number, y: number): boolean => { let c = false; for (let i = 0, j = rim - 1; i < rim; j = i++) { const [ax, ay] = v[i]!, [bx, by] = v[j]!; if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) c = !c } return c }
  const xs = v.map((q) => q[0]), ys = v.map((q) => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  for (let y = y0 + step / 2, r = 0; y < y1; y += step * 0.87, r++) for (let x = x0 + (r % 2 ? step / 2 : 0); x < x1; x += step) if (inside(x, y) && v.slice(0, rim).every((q) => Math.hypot(q[0] - x, q[1] - y) > step * 0.55)) { let e = 0, w = 0; for (let i = 0; i < rim; i++) { const d = 1 / (1 + (v[i]![0] - x) ** 2 + (v[i]![1] - y) ** 2); e += v[i]![2] * d; w += d } v.push([x, y, e / w]) }
  const n = v.length, p: Array<readonly [number, number]> = [...v.map(([x, y], i) => [x + Math.sin(i * 12.9) * 0.01, y + Math.cos(i * 7.7) * 0.01] as const), [x0 - 5000, y0 - 5000], [x1 + 5000, y0 - 5000], [(x0 + x1) / 2, y1 + 9000]]
  let t: Array<readonly [number, number, number]> = [[n, n + 1, n + 2]]
  for (let i = 0; i < n; i++) {
    const [x, y] = p[i]!, edge = new Map<string, readonly [number, number]>()
    t = t.filter(([a, b, c]) => {
      const [ax, ay] = p[a]!, [bx, by] = p[b]!, [cx, cy] = p[c]!, d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)), ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d, uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d
      if (Math.hypot(x - ux, y - uy) > Math.hypot(ax - ux, ay - uy)) return true
      for (const [q, r] of [[a, b], [b, c], [c, a]] as const) { if (edge.has(`${r},${q}`)) edge.delete(`${r},${q}`); else edge.set(`${q},${r}`, [q, r]) }
      return false
    })
    for (const [q, r] of edge.values()) t.push([q, r, i])
  }
  return { v, rim, f: t.filter((q) => q.every((i) => i < n)).filter(([a, b, c]) => inside((v[a]![0] + v[b]![0] + v[c]![0]) / 3, (v[a]![1] + v[b]![1] + v[c]![1]) / 3)) }
}

/** Cloth that lies on a form: cut evenly, lifted to the form under it, then pulled taut, so it spans hollows instead of copying them. A third number in the outline adds to the lift there. */
export const drape = (outline: ReadonlyArray<V3>, on: (x: number, y: number) => number, off = 6, thick = 5, step = 14, taut = 25): Mesh => {
  const e = even(outline, step), f = e.f, low = e.v.map(([x, y, l]) => on(x, y) + off + l), next = e.v.map(() => new Set<number>())
  let z = [...low]
  for (const t of f) for (let i = 0; i < 3; i++) { next[t[i]!]!.add(t[(i + 1) % 3]!); next[t[i]!]!.add(t[(i + 2) % 3]!) }
  for (let k = 0; k < taut; k++) z = z.map((q, i) => { let s = 0; for (const j of next[i]!) s += z[j]!; return Math.max(low[i]!, 0.5 * q + (0.5 * s) / (next[i]!.size || 1)) })
  const v = e.v.map(([x, y], i): V3 => [x, y, z[i]!]), n = v.length, edge = new Map<string, readonly [number, number]>()
  for (const t of f) for (let i = 0; i < 3; i++) { const a = t[i]!, b = t[(i + 1) % 3]!, k = `${b},${a}`; if (edge.has(k)) edge.delete(k); else edge.set(`${a},${b}`, [a, b]) }
  return { v: [...v, ...v.map(([x, y, w]): V3 => [x, y, w - thick])], f: [...f, ...f.map(([a, b, c]) => [a + n, c + n, b + n] as const), ...[...edge.values()].flatMap(([a, b]) => [[a, a + n, b], [b, a + n, b + n]] as Array<readonly [number, number, number]>)] }
}

/** Page back to model space. */
export const unplace = (p: Pose, q: V3): V3 => {
  const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw), cp = Math.cos(p.pitch), sp = Math.sin(p.pitch), cr = Math.cos(p.roll), sr = Math.sin(p.roll)
  const X = (q[0] - p.x) / p.k, Y = (q[1] - p.y) / p.k, z2 = (q[2] - p.z) / p.k, x1 = X * cr + Y * sr, y2 = -X * sr + Y * cr, y = y2 * cp - z2 * sp, z1 = y2 * sp + z2 * cp
  return [x1 * cy - z1 * sy, y, x1 * sy + z1 * cy]
}
/** Closed control rings made fine both ways: around and along. */
export const smooth = (rings: ReadonlyArray<ReadonlyArray<V3>>, around = 2, along = 2): Array<Array<V3>> => {
  const loop = (r: ReadonlyArray<V3>): Array<V3> => r.flatMap((_, i) => Array.from({ length: around }, (_, e): V3 => { const n = r.length, p = [r[(i + n - 1) % n]!, r[i]!, r[(i + 1) % n]!, r[(i + 2) % n]!] as const, t = e / around; return [0, 1, 2].map((q) => { const [a, b, c, d] = p.map((z) => z[q as 0]) as [number, number, number, number]; return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a))) }) as unknown as V3 }))
  const fine = rings.map(loop), flat = through(fine.map((r) => r.flatMap((v) => [...v])), along)
  return flat.map((r) => Array.from({ length: r.length / 3 }, (_, i): V3 => [r[i * 3]!, r[i * 3 + 1]!, r[i * 3 + 2]!]))
}
