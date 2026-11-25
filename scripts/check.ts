/**
 * pnpm dev &   pnpm check [name ...]
 * Alarms, not targets: LOOK means look there. Numbers measured on the target references (e, f, g).
 */
import { chromium } from "playwright"

const port = process.env.PORT ?? "5440"
const names = process.argv.slice(2).length ? process.argv.slice(2) : ["tape", "bell", "rig"]
type Rule = readonly [label: string, ok: (s: Record<string, number>) => boolean, show: (s: Record<string, number>) => string]
const rules: ReadonlyArray<Rule> = [
  ["colour: 30 to 65% of the figure under HSV S 0.3", (s) => (s._lowSat ?? 0) >= 30 && (s._lowSat ?? 0) <= 65, (s) => `${s._lowSat}% (references e f g 35 to 58)`],
  ["blacks: 4 to 15% of the figure under luma 30", (s) => (s._dark ?? 0) >= 4 && (s._dark ?? 99) <= 15, (s) => `${s._dark}% (references e f g 6 to 14)`],
  ["face mostly lit: 8 to 24% in shade", (s) => (s.face ?? 0) >= 8 && (s.face ?? 0) <= 24, (s) => `${s.face}%`],
]
// measured on the first tape with coordinates: 150 gaps, 1,725 px of edge beside a line
const placed: ReadonlyArray<readonly [label: string, ok: (f: Faults) => boolean, show: (f: Faults) => string]> = [
  ["no lit sliver between a shadow and a line", (f) => f.gaps === 0, (f) => `${f.gaps} (${f.gapPx} px)`],
  ["no shadow edge running beside a line: at most 1%", (f) => f.alongPct <= 1, (f) => `${f.alongPct}% (${f.along} px)`],
]
type Faults = { gaps: number; gapPx: number; along: number; alongPct: number; at: ReadonlyArray<string> }
// only drawings that declare a focus: references 1.17 to 1.24, and the head never darker than the rest
const values: ReadonlyArray<Rule> = [
  ["the head pulls: local contrast at least 1.17 times the rest", (s) => (s._pull ?? 0) >= 1.17, (s) => `${s._pull} (references 1.17 to 1.24 on the retired set)`],
  ["the head is a lighter mass than the rest", (s) => (s._head ?? 0) > (s._rest ?? 0), (s) => `median luma ${s._head} against ${s._rest}`],
]
const browser = await chromium.launch()
for (const name of names) {
  const page = await browser.newPage({ viewport: { width: 256, height: 384 } })
  const stats = new Promise<Record<string, number>>((resolve) => page.on("console", (m) => { if (m.text().startsWith("{")) resolve(JSON.parse(m.text())) }))
  await page.goto(`http://localhost:${port}/?v=${name}&k=2&stats=1`)
  const s = await stats
  console.log(`\n${name}  (typical contour ${s._line} px)`)
  for (const [label, ok, show] of rules) { const good = ok(s); console.log(`  ${good ? "ok  " : "LOOK"} ${label}: ${show(s)}`) }
  if (s._pull !== undefined) for (const [label, ok, show] of values) { const good = ok(s); console.log(`  ${good ? "ok  " : "LOOK"} ${label}: ${show(s)}`) }
  // only drawings whose shapes are said in terms of lines are held to this
  await page.goto(`http://localhost:${port}/favicon.ico`)
  const f = await page.evaluate(async (n) => { const { artOf } = await import(/* @vite-ignore */ "/src/splash/index.ts" as string), art = await artOf(n) as { lines?: string }, L = await import(/* @vite-ignore */ "/src/tools/lint.ts" as string); if (!art.lines) return null; const { picture: _, ...q } = await L.lint(art); return q }, name) as Faults | null
  if (f) { for (const [label, ok, show] of placed) { const good = ok(f); console.log(`  ${good ? "ok  " : "LOOK"} ${label}: ${show(f)}`) } if (f.at.length) console.log(`       ${f.at.join(" | ")}`) }
  else console.log("  --   placement not checked: shapes are typed coordinates")
  await page.close()
}
await browser.close()
