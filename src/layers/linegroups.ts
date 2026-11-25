/**
 * Whose line a pixel of ink is. Every stroke has a number and a middle; a label walks from the middles through the ink, so a
 * fat lash stays one thing and two lines that touch part where they meet. Strokes that a drawing does not name are told
 * apart by what lies on their two sides.
 */
import type { P2 } from "../geo.ts"
import type { Stroke } from "../tools/strokes.ts"

/** One group as it goes into the file: its own ink, and a little of the full ink it runs into, so its ends are whole. Twice the same ink is still that ink. */
export const inkOf = (m: LineMap, t: number, alpha: (i: number) => number, w: number, reach: number): Uint8Array => {
  const N = m.label.length, on = new Uint8Array(N)
  let edge: Array<number> = []
  for (let i = 0; i < N; i++) if (m.label[i] === t) { on[i] = 1; const x = i % w; if ((x > 0 && m.label[i - 1] !== t) || (x < w - 1 && m.label[i + 1] !== t) || (i >= w && m.label[i - w] !== t) || (i + w < N && m.label[i + w] !== t)) edge.push(i) }
  for (let r = 0; r < reach; r++) { const next: Array<number> = []; for (const i of edge) { const x = i % w; for (const j of r % 2 ? [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w] : [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w, x > 0 ? i - w - 1 : -1, x < w - 1 ? i - w + 1 : -1, x > 0 ? i + w - 1 : -1, x < w - 1 ? i + w + 1 : -1]) if (j >= 0 && j < N && !on[j] && alpha(j) > 252) { on[j] = 1; next.push(j) } } edge = next }
  return on
}
/** `half`: how heavy a group's lines are, in line-art px. */
export type LineMap = { names: Array<string>; label: Uint8Array; half: Array<number> }
export const lineGroups = (q: {
  strokes: ReadonlyArray<Stroke>; alpha: (i: number) => number; map: Uint8Array; w: number; h: number; k: number
  hair: (n: number) => boolean; face: (n: number) => boolean
}, said: ReadonlyArray<readonly [string, string]>): LineMap => {
  const { w, h, k, map } = q, N = w * h, names = ["Body", "Face", "Hair outline", "Hair strands"], place = (i: number): number => (q.hair(map[i]!) ? 3 : q.face(map[i]!) ? 1 : 0), of = new Uint8Array(q.strokes.length + 1), marks: Array<{ x: number; y: number; r: number; id: number }> = []
  q.strokes.forEach((s, i) => {
    // what lies on the two sides, stroke by stroke
    let both = 0, hair = 0, face = 0, n = 0
    for (let t = 2; t < s.p.length - 2; t++) {
      const a = s.p[t - 2]!, b = s.p[t + 2]!, c = s.p[t]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, o = s.half[t]! + 3, at = (g: number): number => { const x = Math.round((c[0] - ((b[1] - a[1]) / l) * o * g) * k), y = Math.round((c[1] + ((b[0] - a[0]) / l) * o * g) * k); return x < 0 || y < 0 || x >= w || y >= h ? 0 : map[y * w + x]! }
      const u = at(1), v = at(-1)
      n++
      if (q.hair(u) && q.hair(v)) both++; else if (q.hair(u) || q.hair(v)) hair++
      if (q.face(u) || q.face(v)) face++
    }
    const mid = s.p[s.p.length >> 1]!
    of[i + 1] = n < 3 ? place(Math.min(N - 1, Math.round(mid[1] * k) * w + Math.round(mid[0] * k))) : both > n * 0.5 ? 3 : both + hair > n * 0.5 ? 2 : face > n * 0.5 ? 1 : 0
  })
  for (const [name, list] of said) {
    const id = names.includes(name) ? names.indexOf(name) : names.push(name) - 1
    for (const t of list.split(" ")) { if (t.startsWith("@")) { const [x, y, r] = t.slice(1).split(",").map(Number); marks.push({ x: x! * k, y: y! * k, r: r! * k, id }) } else of[Number(t.slice(1))] = id }
  }
  // shortest way through the ink, in half pixels; a heavy line starts ahead by its own half width
  const label = new Uint8Array(N).fill(255), cost = new Int32Array(N).fill(1 << 29), buckets: Array<Array<number>> = [], push = (i: number, c: number, l: number): void => { if (c >= cost[i]!) return; cost[i] = c; label[i] = l; (buckets[c] ??= []).push(i) }
  const head = 80 * k
  q.strokes.forEach((s, n) => { for (let t = 0; t + 1 < s.p.length; t++) { const a = s.p[t]!, b = s.p[t + 1]!, steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * k)); for (let u = 0; u <= steps; u++) { const x = Math.round((a[0] + ((b[0] - a[0]) * u) / steps) * k), y = Math.round((a[1] + ((b[1] - a[1]) * u) / steps) * k), half = s.half[t]! + ((s.half[t + 1]! - s.half[t]!) * u) / steps; if (x >= 0 && y >= 0 && x < w && y < h) push(y * w + x, Math.max(0, Math.round((head - half * k) * 2)), of[n + 1]!) } } })
  for (let c = 0; c < buckets.length; c++) for (const i of buckets[c] ?? []) {
    if (cost[i] !== c) continue
    const x = i % w, l = label[i]!
    for (const [j, d] of [[x > 0 ? i - 1 : -1, 2], [x < w - 1 ? i + 1 : -1, 2], [i - w, 2], [i + w, 2], [x > 0 ? i - w - 1 : -1, 3], [x < w - 1 ? i - w + 1 : -1, 3], [x > 0 ? i + w - 1 : -1, 3], [x < w - 1 ? i + w + 1 : -1, 3]] as const) if (j >= 0 && j < N && q.alpha(j) > 0) push(j, c + d, l)
  }
  for (let i = 0; i < N; i++) { if (q.alpha(i) <= 0) { label[i] = 255; continue } if (label[i] === 255) label[i] = place(i); const x = i % w, y = (i / w) | 0; for (const m of marks) if ((x - m.x) ** 2 + (y - m.y) ** 2 < m.r * m.r) label[i] = m.id }
  // a crumb that touches another line belongs to it
  for (let pass = 0; pass < 2; pass++) {
    const seen = new Uint8Array(N), least = (3 * k) ** 2
    for (let s = 0; s < N; s++) {
      if (label[s] === 255 || seen[s]) continue
      const c = [s], l = label[s]!, touch = new Map<number, number>()
      seen[s] = 1
      for (let t = 0; t < c.length; t++) { const i = c[t]!, x = i % w; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < N && label[j] !== 255) { if (label[j] === l) { if (!seen[j]) { seen[j] = 1; c.push(j) } } else touch.set(label[j]!, (touch.get(label[j]!) ?? 0) + 1) } }
      if (c.length < least && touch.size) { const to = [...touch].sort((a, b) => b[1] - a[1])[0]![0]; for (const i of c) label[i] = to }
    }
  }
  const half = names.map((_, t) => { let sum = 0, n = 0; q.strokes.forEach((s, i) => { if (of[i + 1] === t) for (const v of s.half) { sum += v * v; n += v } }); return n ? sum / n : 0 })
  return { names, label, half }
}
