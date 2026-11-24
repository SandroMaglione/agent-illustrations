/**
 * pnpm dev &   pnpm check [name ...]
 * Renders each character and holds the figure against numbers measured on the style references.
 */
import { chromium } from "playwright"

const port = process.env.PORT ?? "5440"
const names = process.argv.slice(2).length ? process.argv.slice(2) : ["twin", "tape", "bell"]
type Rule = readonly [label: string, ok: (s: Record<string, number>) => boolean, show: (s: Record<string, number>) => string]
const rules: ReadonlyArray<Rule> = [
  ["greyed: at least 75% of the figure under HSV S 0.3", (s) => (s._lowSat ?? 0) >= 75, (s) => `${s._lowSat}% (references 82 to 99)`],
  ["not too dark: at most 5% of the figure under luma 30", (s) => (s._dark ?? 99) <= 5, (s) => `${s._dark}% (references 0.1 to 3.8)`],
  ["face mostly lit: 8 to 24% in shade", (s) => (s.face ?? 0) >= 8 && (s.face ?? 0) <= 24, (s) => `${s.face}%`],
]
const browser = await chromium.launch()
let failed = false
for (const name of names) {
  const page = await browser.newPage({ viewport: { width: 256, height: 384 } })
  const stats = new Promise<Record<string, number>>((resolve) => page.on("console", (m) => { if (m.text().startsWith("{")) resolve(JSON.parse(m.text())) }))
  await page.goto(`http://localhost:${port}/?v=${name}&k=2&stats=1`)
  const s = await stats
  console.log(`\n${name}  (typical contour ${s._line} px)`)
  for (const [label, ok, show] of rules) { const good = ok(s); failed ||= !good; console.log(`  ${good ? "ok  " : "FAIL"} ${label}: ${show(s)}`) }
  await page.close()
}
await browser.close()
process.exit(failed ? 1 : 0)
