/** Facet numbers to points. Reads src/splash/<name>-tones.txt ("part: S 12 14 | D 3"), writes <name>-tones.ts. Numbers may change when regions change; points do not. */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { base, open } from "./page.ts"

const name = process.argv[2]!, lines = readFileSync(`src/splash/${name}-tones.txt`, "utf8").split("\n").map((l) => l.replace(/#.*/, "").trim()).filter(Boolean)
const { b, p } = await open()
await p.goto(`${base}favicon.ico`)
const at = await p.evaluate(async (n) => { const { artOf } = await import(/* @vite-ignore */ "/src/splash/index.ts" as string), { facetsOf } = await import(/* @vite-ignore */ "/src/tools/facets.ts" as string); const art = await artOf(n), F = await facetsOf(art), E = await import(/* @vite-ignore */ "/src/splash/engine.ts" as string), { names } = await E.fixedOf(art); return { size: F.size as Array<number>, at: F.at as Array<[number, number]>, part: (F.part as Array<number>).map((q) => names[q] as string) } }, name)
const out: Array<string> = []
const used = new Map<number, string>()
for (const l of lines) {
  const i = l.indexOf(":"), part = l.slice(0, i).trim(), body = l.slice(i + 1).split("|").map((r) => { const [t, ...n] = r.trim().split(/\s+/); return `${t} ${n.map((q) => { if (q.startsWith("@")) return q.slice(1); const f = Number(q); if (!at.at[f]) { console.log(`${part}: no facet ${q}`); return "" } if (at.part[f] !== part) console.log(`${part}: facet ${q} belongs to ${at.part[f]}`); if (used.has(f)) console.log(`facet ${q} twice`); used.set(f, part); return at.at[f]!.join(",") }).filter(Boolean).join(" ")}` }).join(" | ")
  out.push(`  ${part}: "${body}",`)
}
writeFileSync(`src/splash/${name}-tones.ts`, `/** Fine rendering, facet by facet. Written by scripts/tone.ts from ${name}-tones.txt. */\nexport const TONES: Readonly<Record<string, string>> = {\n${out.join("\n")}\n}\n`)
for (const l of lines) { const part = l.slice(0, l.indexOf(":")).trim(), left = at.part.map((q, i) => [q, i] as const).filter(([q, i]) => q === part && i && !used.has(i) && at.size[i]! > 25).map(([, i]) => `${i} (${at.size[i]} px)`); if (left.length) console.log(`${part}, plain: ${left.join(" ")}`) }
console.log(`${used.size} facets in ${lines.length} pieces${existsSync(`src/splash/${name}-tones.ts`) ? "" : ""}`)
await b.close()
