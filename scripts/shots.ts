/**
 * pnpm dev &   node scripts/shots.ts [--reel]
 * Stills of every sheet and scene, and (with --reel) output/reel.mp4 rendered frame by frame.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { chromium } from "playwright"

const base = process.env.PROBE_URL ?? "http://localhost:5440/"
mkdirSync("output", { recursive: true })
const b = await chromium.launch()
const errors: Array<string> = []
const open = async (query: string, width: number, height: number): Promise<import("playwright").Page> => {
  const p = await b.newPage({ viewport: { width, height } })
  p.on("pageerror", (e) => errors.push(`${query}: ${String(e)}`))
  await p.goto(`${base}?${query}`)
  await p.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, null, { timeout: 120000 })
  return p
}
const still = async (name: string, query: string, w: number, h: number): Promise<void> => {
  const p = await open(query, w, h)
  await p.screenshot({ path: `output/${name}.png` })
  await p.close()
}
await still("pencil", "v=one&who=kettle&pose=hello", 1280, 1080)
await still("cast", "v=cast&poses=hello,groove,bored", 2100, 820)
await still("poses", "v=poses&who=all", 2000, 1500)
await still("styles", "v=styles&who=all&pose=hello", 2000, 1500)
for (const s of ["pencil", "ballpoint", "felt", "bleed", "chalk", "riso", "manga", "gig", "punch", "lino", "neon", "hologram"]) await still(`scene-${s}`, `v=scene&skin=${s}`, 1920, 1080)

await still("cel-courier", "v=cel", 1400, 1560)
await still("cel-head", "v=cel&zoom=2.4&x=380&y=40", 1400, 1560)
await still("cel-steps", "v=celsteps", 2100, 2000)
await still("cel-styles", "v=celsheet", 2100, 1560)
await still("cel-scene", "v=celscene", 1920, 1080)

if (process.argv.includes("--reel")) {
  rmSync("output/frames", { recursive: true, force: true })
  mkdirSync("output/frames", { recursive: true })
  const p = await open("v=reel", 1280, 720)
  const n = await p.evaluate(() => (window as unknown as { __frames: number }).__frames)
  for (let i = 0; i < n; i++) {
    const url = await p.evaluate((k) => (window as unknown as { __reel: (n: number) => string }).__reel(k), i)
    writeFileSync(`output/frames/${String(i).padStart(4, "0")}.png`, Buffer.from(url.split(",")[1]!, "base64"))
  }
  await p.close()
  execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", "8", "-i", "output/frames/%04d.png", "-r", "24", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "output/reel.mp4"])
  rmSync("output/frames", { recursive: true, force: true })
  console.log(`reel: ${n} drawings`)
}
await b.close()
console.log(errors.length ? errors.join("\n") : "no page errors")
