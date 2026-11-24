/** node scripts/snap.ts out.png "v=one&who=kettle" 1200 1000 */
import { chromium } from "playwright"
const [out, query, w, h] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: Number(w ?? 1200), height: Number(h ?? 1000) } })
p.on("console", (m) => { if (m.type() === "error") console.log(m.text()) })
p.on("pageerror", (e) => console.log("page:", e.stack))
await p.goto(`http://localhost:5440/?${query}`)
await p.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, null, { timeout: 180000 }).catch(() => console.log("not ready"))
await p.screenshot({ path: out!, timeout: 180000 })
await b.close()
