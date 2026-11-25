/**
 * Inks a sketch: every stroke and every outline in src/splash/<name>-ink.ts is laid on the artist's pencil, and written to <name>-lines.ts.
 *   node scripts/pencil.ts sketch.png output/pencil 4 && node scripts/ink.ts name output/pencil/pencil.bin 2        2: drawing units per sketch px
 * In an outline "@id" is a stroke already named, "-@id" the same backwards, "@id[.2..1]" a stretch of it: a region ends exactly where its line runs.
 */
import { writeFileSync } from "node:fs"
import { lasso, loadPencil } from "../src/draw/lasso.ts"
import type { Path } from "../src/draw/lasso.ts"

const [name, file, unit] = process.argv.slice(2), q = loadPencil(file!, Number(unit ?? 2))
type Stroke = readonly [string, string, { w?: number; ends?: "both" | "start" | "end" | "none"; smooth?: number; on?: string; hide?: boolean }?]
const M = (await import(`../src/splash/${name}-ink.ts`)) as { STROKES: ReadonlyArray<Stroke>; PIECES: ReadonlyArray<{ part: string; id?: string; d: string; on?: ReadonlyArray<string> }>; BLACKS: ReadonlyArray<string>; OPTIONS: Record<string, unknown> }
const of = new Map<string, Path>(), r1 = (v: number): number => Math.round(v * 10) / 10
for (const [id, d, o] of M.STROKES) { if (of.has(id)) throw new Error(`two strokes ${id}`); of.set(id, lasso(q, d, o?.smooth)) }
const marks = M.STROKES.filter(([, , o]) => !o?.hide).map(([id, , o]) => { const { p, press } = of.get(id)!, keep = p.map((_, i) => i).filter((i) => i % 2 === 0 || i === p.length - 1); return { id, path: keep.flatMap((i) => [r1(p[i]![0]), r1(p[i]![1]), Math.round(press[i]! * 100) / 100]), ...(o?.w ? { w: o.w } : {}), ...(o?.ends ? { ends: o.ends } : {}), ...(o?.on ? { on: o.on.split(" ") } : {}) } })
/** An outline: stretches of strokes and lassoed points, as one dense polygon. */
const outline = (d: string): string => {
  const out: Array<readonly [number, number]> = []
  let run: Array<string> = []
  const flush = (): void => { if (run.length > 1) out.push(...lasso(q, run.join(" ")).p); else if (run.length) { const [x, y] = run[0]!.replace(/[!=\-]+$/, "").split(",").map(Number); out.push([x!, y!]) } run = [] }
  for (const t of d.trim().split(/\s+/)) {
    const m = t.match(/^(-?)@([\w.]+?)(?:\[([\d.]+)\.\.([\d.]+)\])?$/)
    if (!m) { run.push(t); continue }
    flush()
    const s = of.get(m[2]!)
    if (!s) throw new Error(`no stroke ${m[2]}`)
    const a = Math.round(Number(m[3] ?? 0) * (s.p.length - 1)), b = Math.round(Number(m[4] ?? 1) * (s.p.length - 1)), p = s.p.slice(Math.min(a, b), Math.max(a, b) + 1)
    out.push(...(m[1] ? [...p].reverse() : p))
  }
  flush()
  return out.filter((_, i) => i % 2 === 0).map(([x, y]) => `${r1(x)},${r1(y)}!`).join(" ")
}
const pieces = M.PIECES.map((p) => ({ ...p, d: outline(p.d) })), blacks = M.BLACKS.map(outline)
writeFileSync(`src/splash/${name}-lines.ts`, `/** Written by scripts/ink.ts from ${name}-ink.ts and the artist's pencil: do not edit. */\nimport type { Drawn } from "../draw/draw.ts"\n\nexport const DRAWN: Drawn = ${JSON.stringify({ ...M.OPTIONS, edges: false, pieces, marks, blacks })}\n`)
console.log(`${marks.length} strokes, ${pieces.length} pieces`)
