/** Every drawn line as an object: centre, width, ends. Coordinates are line-art px, whatever scale it was traced at. */
import { paperDistance } from "../bucket/segment.ts"
import type { P2 } from "../geo.ts"

export type Stroke = { id: number; p: ReadonlyArray<P2>; half: ReadonlyArray<number>; len: number; loop: boolean }

const tidy = (v: ReadonlyArray<P2>, r: number, loop: boolean): Array<P2> => {
  const n = v.length
  return v.map((q, i) => {
    let x = 0, y = 0, s = 0
    const m = loop ? r : Math.min(r, i, n - 1 - i)
    for (let d = -m; d <= m; d++) { const w = 1 + Math.cos((Math.PI * d) / (r + 1)), p = v[(i + d + n) % n]!; x += p[0] * w; y += p[1] * w; s += w }
    return s ? [x / s, y / s] : q
  })
}

/** Zhang-Suen thinning, then staircase corners removed so that a path pixel has exactly two neighbours. */
const thin = (on: Uint8Array, w: number, h: number): { s: Uint8Array; px: Array<number> } => {
  const s = on.slice()
  for (let x = 0; x < w; x++) { s[x] = 0; s[w * h - 1 - x] = 0 }
  for (let y = 0; y < h; y++) { s[y * w] = 0; s[y * w + w - 1] = 0 }
  let px: Array<number> = []
  for (let i = 0; i < s.length; i++) if (s[i]) px.push(i)
  for (let more = true; more;) {
    more = false
    for (const step of [0, 1]) {
      const del: Array<number> = []
      for (const i of px) {
        if (!s[i]) continue
        const a = s[i - w]!, b = s[i - w + 1]!, c = s[i + 1]!, d = s[i + w + 1]!, e = s[i + w]!, f = s[i + w - 1]!, g = s[i - 1]!, q = s[i - w - 1]!
        const B = a + b + c + d + e + f + g + q
        if (B < 2 || B > 6) continue
        const turns = Number(!a && b) + Number(!b && c) + Number(!c && d) + Number(!d && e) + Number(!e && f) + Number(!f && g) + Number(!g && q) + Number(!q && a)
        if (turns !== 1 || (step === 0 ? (a & c & e) | (c & e & g) : (a & c & g) | (a & e & g))) continue
        del.push(i)
      }
      for (const i of del) s[i] = 0
      if (del.length) more = true
    }
    px = px.filter((i) => s[i])
  }
  for (const i of px) {
    const a = s[i - w], c = s[i + 1], e = s[i + w], g = s[i - 1]
    if ((a && c && !s[i + w - 1]) || (c && e && !s[i - w - 1]) || (e && g && !s[i - w + 1]) || (g && a && !s[i + w + 1])) s[i] = 0
  }
  return { s, px: px.filter((i) => s[i]) }
}

/** `part` (one label per pixel) keeps lines that separate different things from being joined into one. */
export const strokesOf = (ink: Float32Array, w: number, h: number, k: number, part: Uint8Array): Array<Stroke> => {
  const on = Uint8Array.from(ink, (v) => (v > 0.42 ? 1 : 0)), din = paperDistance(Float32Array.from(on, (v) => (v ? 0 : 1)), w, h, 0.5)
  const { s, px } = thin(on, w, h)
  const around = [-w, -w + 1, 1, w + 1, w, w - 1, -1, -w - 1]
  const nb = (i: number): Array<number> => around.map((d) => i + d).filter((j) => s[j])
  const deg = new Uint8Array(w * h), node = new Int32Array(w * h)
  for (const i of px) deg[i] = nb(i).length
  const nodes: Array<{ px: Array<number>; end: boolean }> = [{ px: [], end: false }]
  for (const i of px) if (deg[i] !== 2 && !node[i]) {
    const st = [i], got: Array<number> = []
    node[i] = nodes.length
    while (st.length) { const q = st.pop()!; got.push(q); if (deg[q]! > 2) for (const j of nb(q)) if (deg[j]! > 2 && !node[j]) { node[j] = nodes.length; st.push(j) } }
    nodes.push({ px: got, end: got.length === 1 && deg[i]! <= 1 })
  }
  type Raw = { a: number; b: number; p: Array<number> }
  let raw: Array<Raw> = []
  const used = new Uint8Array(w * h)
  const go = (n: number, from: number, first: number): Raw | null => {
    const p = [from]
    let prev = from, c = first
    for (;;) {
      p.push(c)
      if (node[c]) break
      used[c] = 1
      const next = nb(c).filter((j) => j !== prev && !(n > 0 && node[j] === n && p.length < 4))
      const t = next.find((j) => node[j]) ?? next.find((j) => !used[j])
      if (t === undefined) break
      prev = c; c = t
    }
    return node[c] && p.length === 2 && n > node[c]! ? null : { a: n, b: node[c]!, p }
  }
  for (let n = 1; n < nodes.length; n++) for (const q of nodes[n]!.px) for (const j of nb(q)) if (node[j] !== n && !used[j]) { const r = go(n, q, j); if (r) raw.push(r) }
  // closed loops touch no node
  for (const i of px) if (!used[i] && !node[i]) { used[i] = 1; const r = go(-1, i, nb(i)[0] ?? i); if (r && r.p.length > 6 * k) { r.a = r.b = -1; raw.push(r) } }
  const long = (p: ReadonlyArray<number>): number => { let l = 0; for (let i = 1; i < p.length; i++) l += Math.hypot((p[i]! % w) - (p[i - 1]! % w), Math.floor(p[i]! / w) - Math.floor(p[i - 1]! / w)); return l }
  const ends = (n: number): boolean => n === 0 || nodes[n]?.end === true
  raw = raw.filter((q) => { if (q.a < 0 || ends(q.a) === ends(q.b)) return true; const J = ends(q.a) ? q.p.at(-1)! : q.p[0]!; return long(q.p) > 2.3 * din[J]! })
  // good continuation: at a junction, two branches that go straight on are one line, if they also separate the same things
  const tangent = (q: Raw, e: 0 | 1): P2 => {
    const p = e ? [...q.p].reverse() : q.p, n = Math.max(4, Math.round(2 * din[p[0]!]!)), a = p[Math.min(p.length - 1, n)]!, b = p[Math.min(p.length - 1, n * 3)]!
    const dx = (b % w) - (a % w) || (a % w) - (p[0]! % w), dy = Math.floor(b / w) - Math.floor(a / w) || Math.floor(a / w) - Math.floor(p[0]! / w), l = Math.hypot(dx, dy) || 1
    return [dx / l, dy / l]
  }
  const sides = (q: Raw, e: 0 | 1): string => {
    const p = e ? [...q.p].reverse() : q.p, c = p[Math.min(p.length - 1, Math.round(5 * k))]!, t = tangent(q, e), r = din[c]! + 2.5 * k
    const at = (m: number): number => part[Math.min(h - 1, Math.max(0, Math.round(Math.floor(c / w) + t[0] * r * m))) * w + Math.min(w - 1, Math.max(0, Math.round((c % w) - t[1] * r * m)))]!
    return [at(1), at(-1)].sort((x, y) => x - y).join()
  }
  const link = new Map<string, readonly [number, 0 | 1]>(), here = new Map<number, Array<readonly [number, 0 | 1]>>()
  raw.forEach((q, i) => { if (q.a > 0 && !ends(q.a)) here.set(q.a, [...(here.get(q.a) ?? []), [i, 0]]); if (q.b > 0 && !ends(q.b)) here.set(q.b, [...(here.get(q.b) ?? []), [i, 1]]) })
  for (const es of here.values()) {
    const c: Array<readonly [number, readonly [number, 0 | 1], readonly [number, 0 | 1]]> = []
    es.forEach((a, i) => es.slice(i + 1).forEach((b) => { const u = tangent(raw[a[0]]!, a[1]), v = tangent(raw[b[0]]!, b[1]); if (sides(raw[a[0]]!, a[1]) === sides(raw[b[0]]!, b[1])) c.push([u[0] * v[0] + u[1] * v[1], a, b]) }))
    for (const [d, a, b] of c.sort((x, y) => x[0] - y[0])) { if (d > -0.88) break; if (link.has(a.join()) || link.has(b.join())) continue; link.set(a.join(), b); link.set(b.join(), a) }
  }
  const seen = new Set<number>(), out: Array<Stroke> = []
  raw.forEach((q0, i0) => {
    if (seen.has(i0)) return
    let c = i0, e: 0 | 1 = 0
    for (let n = 0; n < 400; n++) { const l = link.get([c, e].join()); if (!l || l[0] === i0) break; c = l[0]; e = (1 - l[1]) as 0 | 1 }
    let p: Array<number> = []
    for (let n = 0; n < 400 && !seen.has(c); n++) { seen.add(c); p = p.concat(e ? [...raw[c]!.p].reverse() : raw[c]!.p); const l = link.get([c, (1 - e) as 0 | 1].join()); if (!l) break; c = l[0]; e = l[1] }
    const loop = q0.a < 0
    let pts = p.map((j): P2 => [(j % w) + 0.5, Math.floor(j / w) + 0.5]), half = p.map((j) => din[j]!)
    // the last stretch before a junction is bent by the thinning: drop it and go straight to the node
    const trim = (): void => { const n = Math.min(Math.floor(pts.length / 3), Math.round(half[0]! * 1.4)); if (n > 1) { pts = [pts[0]!, ...pts.slice(n)]; half = [half[0]!, ...half.slice(n)] } }
    const free = [p[0]!, p.at(-1)!].map((j) => node[j]! > 0 && nodes[node[j]!]!.end)
    if (!loop) { if (!free[0]) trim(); pts.reverse(); half.reverse(); if (!free[1]) trim(); pts.reverse(); half.reverse() }
    pts = tidy(pts, Math.round(2.5 * k), loop)
    // a taper's true tip lies further on than the thinning reaches
    const tip = (): P2 | null => {
      const a = pts[0]!, b = pts[Math.min(pts.length - 1, 5 * k)]!, l = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, d: P2 = [(a[0] - b[0]) / l, (a[1] - b[1]) / l]
      let t = 0
      for (let r = 1; r < 14 * k; r++) { const v = ink[Math.round(a[1] + d[1] * r) * w + Math.round(a[0] + d[0] * r)] ?? 0; if (v < 0.14) break; t = r }
      return t > 1 ? [a[0] + d[0] * t, a[1] + d[1] * t] : null
    }
    if (!loop && pts.length > 4) { if (free[0]) { const t = tip(); if (t) { pts.unshift(t); half.unshift(0.4) } } pts.reverse(); half.reverse(); if (free[1]) { const t = tip(); if (t) { pts.unshift(t); half.unshift(0.4) } } pts.reverse(); half.reverse() }
    // always read from the top down
    if (!loop && (pts[0]![1] > pts.at(-1)![1] + 2 || (Math.abs(pts[0]![1] - pts.at(-1)![1]) <= 2 && pts[0]![0] > pts.at(-1)![0]))) { pts.reverse(); half.reverse() }
    // even spacing, one point per line-art px or so
    const P: Array<P2> = [], H: Array<number> = []
    let acc = 1e9, len = 0
    pts.forEach((q, i) => { if (i) { const d = Math.hypot(q[0] - pts[i - 1]![0], q[1] - pts[i - 1]![1]); acc += d; len += d } if (acc >= 1.5 * k || i === pts.length - 1) { P.push([q[0] / k, q[1] / k]); H.push(half[i]! / k); acc = 0 } })
    if (loop) { P.push(P[0]!); H.push(H[0]!) }
    if (len / k >= 4) out.push({ id: 0, p: P, half: H, len: len / k, loop })
  })
  out.sort((a, b) => a.p[0]![1] - b.p[0]![1] || a.p[0]![0] - b.p[0]![0])
  return out.map((q, i) => ({ ...q, id: i + 1 }))
}

const middle = (s: Stroke): P2 => s.p[Math.floor(s.p.length / 2)]!
/** Numbers are frozen per drawing as the middle point of every line, so a better tracer never renumbers the drawing. */
export const freeze = (l: ReadonlyArray<Stroke>): string => l.map((s) => middle(s).map((v) => Math.round(v)).join(",")).join(" ")
export const thaw = (l: ReadonlyArray<Stroke>, frozen: string): Array<Stroke> => {
  const want = frozen.trim().split(/\s+/).map((t) => t.split(",").map(Number) as unknown as P2), free = new Set(l), out: Array<Stroke> = []
  want.forEach((m, n) => {
    let best: Stroke | null = null, bd = 12
    for (const s of free) for (const p of s.p) { const d = Math.hypot(p[0] - m[0], p[1] - m[1]) + 0.2 * Math.hypot(middle(s)[0] - m[0], middle(s)[1] - m[1]); if (d < bd) { bd = d; best = s } }
    if (best) { free.delete(best); out[n] = { ...best, id: n + 1 } } else out[n] = { id: n + 1, p: [m, m], half: [0, 0], len: 0, loop: false }
  })
  for (const s of free) out.push({ ...s, id: out.length + 1 })
  return out
}
