/** pnpm dev &   node scripts/freeze.ts rig : number the lines of a drawing for good, in src/splash/<name>-lines.ts. */
import { writeFileSync } from "node:fs"
import { chromium } from "playwright"
const name = process.argv[2]!
const b = await chromium.launch(), p = await b.newPage()
await p.goto(`http://localhost:${process.env.PORT ?? "5440"}/${name}.png`)
const lines = await p.evaluate(async (n) => { const M = await import(/* @vite-ignore */ `/src/splash/${n}.ts`), E = await import(/* @vite-ignore */ "/src/splash/engine.ts" as string), S = await import(/* @vite-ignore */ "/src/tools/strokes.ts" as string), art = Object.values(M).find((v) => (v as { defs?: object }).defs) as object; const R = await E.linesOf({ ...art, lines: "", src: `/${n}.png` }); return S.freeze(R.strokes) as string }, name)
writeFileSync(`src/splash/${name}-lines.ts`, `/** Frozen line numbers: the middle of line 1, 2, 3 … (tools/strokes.ts). */\nexport const LINES = "${lines}"\n`)
console.log(lines.split(" ").length, "lines")
await b.close()
