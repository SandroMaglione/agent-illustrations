/** pnpm dev &   node scripts/freeze.ts rig : number the lines of a drawing for good, in src/splash/<name>-lines.ts. */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { base, open } from "./page.ts"
const name = process.argv[2]!
const file = `src/splash/${name}-lines.ts`
if (existsSync(file) && /"\d/.test(readFileSync(file, "utf8")) && process.argv[3] !== "--again") throw new Error("already frozen: freezing again renumbers the lines and breaks every shape that names one. --again if no shape does")
const { b, p } = await open()
await p.goto(`${base}favicon.ico`)
const lines = await p.evaluate(async (n) => { const { artOf } = await import(/* @vite-ignore */ "/src/splash/index.ts" as string), E = await import(/* @vite-ignore */ "/src/splash/engine.ts" as string), S = await import(/* @vite-ignore */ "/src/tools/strokes.ts" as string), art = await artOf(n); const R = await E.linesOf({ ...art, lines: "" }); return S.freeze(R.strokes) as string }, name)
writeFileSync(`src/splash/${name}-lines.ts`, `/** Frozen line numbers: the middle of line 1, 2, 3 … (tools/strokes.ts). */\nexport const LINES = "${lines}"\n`)
console.log(lines.split(" ").length, "lines")
await b.close()
