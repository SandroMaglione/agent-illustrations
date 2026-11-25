/** Patch numbers to clicks. Reads src/splash/<name>-names.txt, writes <name>-clicks.ts, prints what is still unnamed. */
import { readFileSync, writeFileSync } from "node:fs"
import { base, open } from "./page.ts"

const name = process.argv[2]!, text = readFileSync(`src/splash/${name}-names.txt`, "utf8")
const lines = text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")), walls = lines.filter((l) => l.startsWith("wall ")).map((l) => l.slice(5)), parts = lines.filter((l) => !/^(wall |@)/.test(l)).map((l) => { const i = l.indexOf(":"); return [l.slice(0, i).trim(), l.slice(i + 1).trim().split(/[\s,]+/).filter(Boolean).map(Number)] as const })
const { b, p } = await open()
await p.goto(`${base}favicon.ico`)
const r = await p.evaluate(async ([name, walls]) => {
  const { artOf } = await import(/* @vite-ignore */ "/src/splash/index.ts" as string), { loadInk } = await import(/* @vite-ignore */ "/src/lineart/main.ts" as string), { paper } = await import(/* @vite-ignore */ "/src/bucket/fill.ts" as string)
  const art = await artOf(name), k = 2, { ink, w, h } = await loadInk(art.src, k)
  // numbers come from the drawing without walls, so adding a wall never renumbers; a wall only splits a patch
  const free = paper(ink, w, h, [], k), cut = paper(ink, w, h, walls, k)
  const at = (q: { deep: Int32Array }, i: number): [number, number] => [Math.round(((q.deep[i]! % w) / k) * 2) / 2, Math.round((((q.deep[i]! / w) | 0) / k) * 2) / 2]
  const list: Record<number, [number, number]> = {}
  for (let i = 1; i <= free.P.n; i++) list[i] = at(free, i)
  const split: Array<string> = []
  if ((walls as Array<string>).length) { const of = new Map<number, Set<number>>(); for (let i = 0; i < w * h; i++) if (free.P.seg[i] && cut.P.seg[i]) { const s = of.get(free.P.seg[i]!) ?? new Set(); s.add(cut.P.seg[i]!); of.set(free.P.seg[i]!, s) } for (const [i, s] of of) if (s.size > 1) for (const c of s) if (cut.size[c]! > 20 * k * k) split.push(`patch ${i} now holds one at ${at(cut, c).join(",")} (${Math.round(cut.size[c]! / k / k)} px)`) }
  return { list, split }
}, [name, walls] as const)
let out = `import type { Clicks } from "../bucket/fill.ts"\n\n/** Lines the artist left open. */\nexport const WALLS: ReadonlyArray<string> = ${JSON.stringify(walls)}\n/** One click per patch, written by scripts/name.ts from ${name}-names.txt. */\nexport const CLICKS: Clicks = {\n`
const seen = new Map<number, string>()
for (const [part, ids] of parts) { for (const i of ids) { if (!r.list[i]) console.log(`${part}: no patch ${i}`); if (seen.has(i)) console.log(`patch ${i} is both ${seen.get(i)} and ${part}`); seen.set(i, part) } out += `  ${part}: "${ids.filter((i) => r.list[i]).map((i) => r.list[i]!.join(",")).join(" ")}",\n` }
// a point instead of a number: "part @x,y x,y"
for (const l of lines) { const m = l.match(/^@(\w+) (.+)$/); if (m) out = out.replace(new RegExp(`(  ${m[1]}: ")`), `$1${m[2]} `) }
writeFileSync(`src/splash/${name}-clicks.ts`, `${out}}\n`)
for (const s of r.split) console.log(s)
console.log(`${seen.size} patches in ${parts.length} parts. See ?v=sheet&who=${name}&show=pools&named=1 : red "?" is unnamed`)
await b.close()
