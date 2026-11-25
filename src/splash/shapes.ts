import { rng } from "../geo.ts"
import type { Level, Shape } from "./engine.ts"
/** A named shape, said in terms of the numbered lines. */
export const say = (lv: Level, on: string, id: string, text: string, inside?: string, a = 1): Shape => ({ lv, on: on.split(" "), id, say: text, a, d: "", ...(inside ? { in: inside } : {}) })

/**
 * The set a lock of hair carries on the style references, drawn between its two lines, root to tip:
 *   root  spikes of shade pointing down from where the hair starts (share of the length)
 *   side  one plane on the dark side, a for the first line, b for the second, x for whichever is away from the light: how much of the width
 *   tip   shade at the end with spikes pointing up (share of the length)
 *   ring  a piece of the highlight band: centre and half thickness (shares of the length)
 *   lit   one lit strand   hairs  single thin strands   deep  second shade in the side plane
 */
export type Lock = { root?: number; side?: readonly ["a" | "b" | "x", number]; tip?: number; ring?: readonly [number, number, number?]; lit?: number; hairs?: number; deep?: boolean; on?: string }
export const lock = (id: string, A: string, B: string, k: Lock): Array<Shape> => {
  const r = rng(id), on = k.on ?? "hairF", out: Array<Shape> = [], n = (v: number): string => String(Math.round(v * 1000) / 1000), j = (v: number, d: number): number => v + (r() - 0.5) * 2 * d
  const pt = (x: number, y: number, c = false): string => `${n(Math.max(0, Math.min(1, x)))},${n(Math.max(0, Math.min(1, y)))}${c ? "!" : ""}`
  const add = (lv: Level, name: string, pts: ReadonlyArray<string>, inside?: string, a = 1): void => { out.push(say(lv, on, `${id}${name}`, `warp${k.side?.[0] === "x" ? "!" : ""} ${A} ${B} | ${pts.join(" ")}`, inside, a)) }
  if (k.root) { const L = k.root; add("s1", "Root", [pt(0, 0, true), pt(0.05, L * 0.5), pt(0.07, j(L, L * 0.06), true), pt(0.15, L * 0.4), pt(j(0.24, 0.03), L * 0.14, true), pt(0.36, L * 0.4), pt(j(0.42, 0.04), j(L * 0.7, L * 0.08), true), pt(0.48, L * 0.36), pt(j(0.62, 0.04), L * 0.1, true), pt(0.84, L * 0.5), pt(0.93, j(L * 0.92, L * 0.06), true), pt(0.97, L * 0.5), pt(1, 0, true)]) }
  if (k.side) {
    // teeth point along the strand, towards the tip; the clean side is the drawn line
    const [s, W] = k.side, x = (d: number): number => (s === "a" ? d : 1 - d), c = j(0.6, 0.05)
    add("s1", "Side", [pt(x(0), 0.04, true), pt(x(W * 0.55), 0.24), pt(x(W), c, true), pt(x(W * 0.72), c - 0.1), pt(x(W * 0.44), c - 0.14, true), pt(x(W * 0.56), c + 0.02), pt(x(W * 0.54), j(0.84, 0.04), true), pt(x(W * 0.34), 0.7), pt(x(W * 0.18), 0.66, true), pt(x(W * 0.14), 0.86), pt(x(0), 1, true)])
    if (k.deep) add("s2", "Deep", [pt(x(0), 0.3, true), pt(x(W * 0.3), 0.5), pt(x(W * 0.3), 0.72, true), pt(x(W * 0.12), 0.8), pt(x(0), 0.98, true)], `${id}Side`)
  }
  if (k.tip) { const t = 1 - k.tip, h = k.tip, P: Array<string> = [pt(0, t + h * 0.34, true)], peaks = [[0.2, 0.06], [0.5, -0.3], [0.84, -0.04]] as const; peaks.forEach(([u, y], i) => { const U = j(u, 0.04), Y = t + h * j(y, 0.08), n = peaks[i + 1]; P.push(pt(U - 0.06, t + h * 0.36), pt(U, Y, true), pt(U + 0.03, t + h * 0.26), pt(n ? (U + n[0]) / 2 : 1, t + h * (n ? 0.5 : 0.3), true)) }); add("s1", "Tip", [...P, pt(1, 1, true), pt(0, 1, true)]) }
  if (k.ring) {
    const [h, d, lean = 0] = k.ring, y = (u: number): number => h + lean * (u - 0.5)
    add("ring", "Ring", [pt(0, y(0) - d * 0.8, true), pt(0.3, y(0.3) - d * 0.55), pt(0.5, y(0.5) - d * 0.75, true), pt(0.76, y(0.76) - d * 0.5), pt(1, y(1) - d * 0.8, true), pt(1, y(1) + d * 0.5, true), pt(0.8, y(0.8) + d * 0.95), pt(j(0.62, 0.05), y(0.62) + d * 0.55, true), pt(0.36, y(0.36) + d * 1.15), pt(0.12, y(0.12) + d * 0.85), pt(0, y(0) + d * 0.4, true)])
    const u = j(0.62, 0.05); add("ring", "Drip", [pt(u - 0.012, y(u) + d * 0.5, true), pt(u + 0.012, y(u) + d * 0.5, true), pt(u + 0.01, y(u) + d * 2.2, true)])
  }
  if (k.lit) { const u = k.lit; add("lt", "Lit", [pt(u, j(0.5, 0.04), true), pt(u + 0.07, 0.64), pt(u + 0.06, 0.76), pt(u + 0.01, j(0.9, 0.03), true), pt(u - 0.03, 0.7)], undefined, 0.6) }
  for (let i = 0; i < (k.hairs ?? 0); i++) { const u = j((i + 0.7) / ((k.hairs ?? 1) + 0.4), 0.05), a = j(0.12, 0.08), b = j(0.7, 0.14); add("s1", `Hair${i}`, [pt(u, a, true), pt(u + 0.012, (a + b) / 2), pt(j(u + 0.01, 0.02), b, true), pt(u - 0.008, (a + b) / 2)]) }
  return out
}

/* ---------- cloth kit: every side is chosen by the light ---------- */
const at = (line: string, a: number, b: number): string => { const m = line.match(/^(s\d+)(?:\[([\d.]+)\.\.([\d.]+)\])?$/)!, x = Number(m[2] ?? 0), y = Number(m[3] ?? 1), r = (t: number): string => String(Math.round((x + (y - x) * t) * 1000) / 1000); return `${m[1]}[${r(a)}..${r(b)}]` }
/** A fold: shade on the far side, deep where it pinches, a lit ridge on the near side. `w` is the widest shade. */
export const fold = (id: string, on: string, line: string, w: number, lit = 0.7): Array<Shape> => [
  say("s1", on, id, `band ${line} away 0 ${w} ${Math.round(w * 0.75)} 0`),
  say("s2", on, `${id}Deep`, `band ${at(line, 0.08, 0.7)} away 0 ${Math.round(w * 0.42)} ${Math.round(w * 0.3)} 0`, id),
  ...(lit ? [say("lt", on, `${id}Lit`, `band ${at(line, 0.12, 0.72)} near 0 ${Math.round(w * 0.42)} 0`, undefined, lit)] : []),
]
/** A seam or the edge of a padded panel: a thin shade and a thin light along the whole line. */
export const seam = (id: string, on: string, line: string, w: number, lit = 0.6): Array<Shape> => [
  say("s1", on, id, `band ${line} away ${w * 0.6} ${w} ${w} ${w * 0.6}`),
  say("lt", on, `${id}Lit`, `band ${line} near 0 ${w * 0.7} ${w * 0.7} 0`, undefined, lit),
]
