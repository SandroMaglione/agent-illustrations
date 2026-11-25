/**
 * Fine rendering. The lines inside a piece, even the faintest, already cut it into facets: every facet gets a number, and an agent
 * gives each a tone. What is shaded this way follows the artist's lines by construction.
 */
import { paper } from "../bucket/fill.ts"
import { fixedOf, FIXED } from "../splash/engine.ts"
import type { Art } from "../splash/engine.ts"

/** Lit, half, shade, deep, darkest; T: round, it turns by itself, U: the same inside a shade; B: lit by the second light. A facet with none is the plain colour. */
export const TONES = ["L", "H", "S", "D", "K", "T", "U", "B"] as const
export type ToneName = (typeof TONES)[number]
/** Part name to tones: "S 12 14 | D 3", numbers from ?v=sheet&show=facets&part=…, or points "@x,y". */
export type Facets = { id: Int32Array; n: number; at: ReadonlyArray<readonly [number, number]>; size: ReadonlyArray<number>; part: ReadonlyArray<number> }

const made = new Map<string, Promise<Facets>>()
export const facetsOf = (art: Art): Promise<Facets> => {
  const key = art.src + JSON.stringify(art.clicks)
  const got = made.get(key) ?? build(art)
  made.set(key, got)
  return got
}
const build = async (art: Art): Promise<Facets> => {
  const { ink, map, w, h, names } = await fixedOf(art), k = FIXED, N = w * h, bg = names.indexOf("bg")
  // faint lines count as lines here
  const P = paper(Float32Array.from(ink, (v) => Math.min(1, v * 2.1)), w, h, art.clicks?.walls ?? [], k, 0.82).P
  // one facet per patch and part, grown over the ink to the middle of every line
  const id = new Int32Array(N), key = new Map<number, number>()
  let n = 0
  const queue: Array<number> = []
  for (let i = 0; i < N; i++) { if (!P.seg[i] || !map[i] || map[i] === bg) continue; const q = P.seg[i]! * 256 + map[i]!; let f = key.get(q); if (!f) { f = ++n; key.set(q, f) } id[i] = f; queue.push(i) }
  const grow = (): void => { for (let t = 0; t < queue.length; t++) { const i = queue[t]!, x = i % w; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < N && !id[j] && map[j] === map[i]) { id[j] = id[i]!; queue.push(j) } } }
  grow()
  // crumbs join the neighbour they touch most
  for (let pass = 0; pass < 3; pass++) {
    const size = new Int32Array(n + 1), touch = new Map<number, number>()
    for (let i = 0; i < N; i++) size[id[i]!] = size[id[i]!]! + 1
    for (let i = 0; i < N - w; i++) for (const j of [i + 1, i + w]) if (id[i] && id[j] && id[i] !== id[j] && map[i] === map[j]) { const a = id[i]! * 65536 + id[j]!, b = id[j]! * 65536 + id[i]!; touch.set(a, (touch.get(a) ?? 0) + 1); touch.set(b, (touch.get(b) ?? 0) + 1) }
    const into = new Int32Array(n + 1), best = new Int32Array(n + 1)
    for (const [q, c] of touch) { const a = Math.floor(q / 65536), b = q % 65536; if (size[a]! < 14 * k * k && size[b]! >= size[a]! && c > best[a]!) { best[a] = c; into[a] = b } }
    for (let i = 0; i < N; i++) if (into[id[i]!]) id[i] = into[id[i]!]!
  }
  // where two facets meet on bare paper the seam is a staircase: cut straight from line to line
  const seams = new Map<number, Array<number>>()
  for (let i = 0; i < N - w; i++) for (const j of [i + 1, i + w]) { const p = id[i]!, q = id[j]!; if (p && q && p !== q && map[i] === map[j] && ink[i]! < 0.2 && ink[j]! < 0.2) { const key2 = Math.min(p, q) * 65536 + Math.max(p, q); const l = seams.get(key2); if (l) l.push(i); else seams.set(key2, [i]) } }
  for (const [key2, l] of seams) {
    if (l.length < 4) continue
    const p = Math.floor(key2 / 65536), q = key2 % 65536, far = (from: number): number => { let m = from, md = -1; for (const i of l) { const d = ((i % w) - (from % w)) ** 2 + (((i / w) | 0) - ((from / w) | 0)) ** 2; if (d > md) { md = d; m = i } } return m }
    const A = far(l[0]!), B = far(A), ax = A % w, ay = (A / w) | 0, bx = B % w, by = (B / w) | 0, side = (i: number): number => Math.sign((bx - ax) * (((i / w) | 0) - ay) - (by - ay) * ((i % w) - ax))
    let x0 = w, y0 = h, x1 = 0, y1 = 0, vote = 0
    for (const i of l) { const x = i % w, y = (i / w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
    const m = 2 * k
    for (let y = Math.max(0, y0 - m * 3); y <= Math.min(h - 1, y1 + m * 3); y++) for (let x = Math.max(0, x0 - m * 3); x <= Math.min(w - 1, x1 + m * 3); x++) { const i = y * w + x; if (id[i] === p) vote += side(i); else if (id[i] === q) vote -= side(i) }
    const sp = vote >= 0 ? 1 : -1
    for (let y = y0; y <= y1 + 1; y++) for (let x = x0; x <= x1 + 1; x++) { const i = y * w + x; if (id[i] === p || id[i] === q) { const t = side(i); if (t) id[i] = t === sp ? p : q } }
  }
  const box = new Map<number, [number, number, number, number]>()
  for (let i = 0; i < N; i++) { const f = id[i]!; if (!f) continue; const x = i % w, y = (i / w) | 0, b = box.get(f); if (!b) box.set(f, [x, y, x, y]); else { if (x < b[0]) b[0] = x; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y } }
  // number from top to bottom
  const order = [...box].sort((a, b) => a[1][1] - b[1][1] || a[1][0] - b[1][0]).map(([f]) => f), num = new Int32Array(n + 1), at: Array<[number, number]> = [[0, 0]], size: Array<number> = [0], parts: Array<number> = [0]
  const count = new Int32Array(n + 1), deep = new Int32Array(n + 1), dd = new Float32Array(n + 1)
  for (let i = 0; i < N; i++) { const f = id[i]!; if (!f) continue; count[f] = count[f]! + 1; let r = 0; const x = i % w, y = (i / w) | 0; if (count[f]! % 5 === 0) { while (r < 40 * k && x - r >= 0 && y - r >= 0 && x + r < w && y + r < h && id[i - r] === f && id[i + r] === f && id[i - r * w] === f && id[i + r * w] === f) r++; if (r > dd[f]!) { dd[f] = r; deep[f] = i } } }
  order.filter((f) => count[f]! > 8 * k * k).forEach((f, i) => { num[f] = i + 1; at.push([Math.round(((deep[f]! % w) / k) * 2) / 2, Math.round((((deep[f]! / w) | 0) / k) * 2) / 2]); size.push(Math.round(count[f]! / k / k)); parts.push(map[deep[f]!]!) })
  for (let i = 0; i < N; i++) id[i] = num[id[i]!]!
  return { id, n: at.length - 1, at, size, part: parts }
}
/** Level of every pixel (0 none, 1 to 8 as TONES), at the fixed scale. Points, not numbers: a number is only a way to find the point. */
export const levelsOf = async (art: Art, tones: Readonly<Record<string, string>>): Promise<Uint8Array> => {
  const F = await facetsOf(art), { w, h } = await fixedOf(art), lv = new Uint8Array(F.n + 1)
  for (const text of Object.values(tones)) for (const run of text.split("|")) {
    const [name, ...pts] = run.trim().split(/\s+/), l = TONES.indexOf(name as ToneName) + 1
    for (const q of pts) { const [x, y] = q.replace("@", "").split(",").map(Number), f = F.id[Math.min(h - 1, Math.round(y! * FIXED)) * w + Math.min(w - 1, Math.round(x! * FIXED))]!; if (!f) console.error(`no facet at ${q}`); else lv[f] = l }
  }
  // a crumb nobody named goes with the neighbour it touches most
  const small = (art.head * 0.055) ** 2, { map } = await fixedOf(art), said = lv.slice()
  for (let pass = 0; pass < 2; pass++) {
    const touch = new Map<number, number>(), best = new Map<number, readonly [number, number]>()
    for (let i = 0; i < F.id.length - w; i++) for (const j of [i + 1, i + w]) { const a = F.id[i]!, b = F.id[j]!; if (!a || !b || a === b || map[i] !== map[j]) continue; for (const [p, q] of [[a, b], [b, a]] as const) if (!said[p] && F.size[p]! < small && said[q]) { const k = p * 65536 + q; touch.set(k, (touch.get(k) ?? 0) + 1) } }
    for (const [k, c] of touch) { const p = Math.floor(k / 65536), b = best.get(p); if (!b || c > b[1]) best.set(p, [k % 65536, c]) }
    for (const [p, [q]] of best) { const t = said[q]!; lv[p] = t > 5 ? 3 : t === 1 ? 0 : t; said[p] = lv[p] || 8 }
  }
  return Uint8Array.from(F.id, (f) => lv[f]!)
}
