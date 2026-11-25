/** Lit slivers: paper under 4 px wide, caught between a shadow and a drawn line. The line art alone does not make them. */
import { paperDistance } from "../bucket/segment.ts"

const FAR = 2, NEAR = 4.5, LEAST = 15
const to = (m: Uint8Array, w: number, h: number): Float32Array => paperDistance(Float32Array.from(m), w, h, 0.5)
export const open = (m: Uint8Array, w: number, h: number, r: number): Uint8Array => { const d = to(Uint8Array.from(m, (v) => 1 - v), w, h), core = to(Uint8Array.from(d, (v) => (v > r ? 1 : 0)), w, h); return Uint8Array.from(m, (v, i) => (v && core[i]! <= r + 1 ? 1 : 0)) }
export const islands = (m: Uint8Array, w: number): Array<Array<number>> => {
  const seen = new Uint8Array(m.length), out: Array<Array<number>> = []
  for (let s = 0; s < m.length; s++) if (m[s] && !seen[s]) { const q = [s]; seen[s] = 1; for (let n = 0; n < q.length; n++) { const i = q[n]!; for (const j of [i - 1, i + 1, i - w, i + w, i - w - 1, i - w + 1, i + w - 1, i + w + 1]) if (j >= 0 && j < m.length && m[j] && !seen[j]) { seen[j] = 1; q.push(j) } } out.push(q) }
  return out
}
/** `region`: bare paper of the figure, one line pixel between parts. `dark`: its shaded pixels. */
export const slivers = (region: Uint8Array, dark: Uint8Array, dLine: Float32Array, w: number, h: number, k: number): Array<Array<number>> => {
  const lit = Uint8Array.from(region, (v, i) => (v && !dark[i] ? 1 : 0)), R = FAR * k, rO = open(region, w, h, R), lO = open(lit, w, h, R)
  return islands(Uint8Array.from(lit, (v, i) => (v && !lO[i] && rO[i] && dLine[i]! < NEAR * k ? 1 : 0)), w).filter((q) => q.length >= LEAST * k * k)
}
export const linesAnd = (ink: Float32Array, map: Uint8Array, w: number, h: number, bg: number): { region: Uint8Array; ink: Uint8Array; dLine: Float32Array } => {
  const isInk = Uint8Array.from(ink, (v) => (v > 0.42 ? 1 : 0)), line = isInk.slice(), region = new Uint8Array(map.length)
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) { const i = y * w + x; if (map[i] !== map[i + 1] || map[i] !== map[i + w]) line[i] = 1 }
  for (let i = 0; i < map.length; i++) region[i] = map[i] && map[i] !== bg && !line[i] ? 1 : 0
  return { region, ink: isInk, dLine: to(line, w, h) }
}
