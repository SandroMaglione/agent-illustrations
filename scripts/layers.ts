/**
 * The render as layers for a drawing program, kept as an illustrator keeps them: a folder per part, the same layers in each,
 * clipped to the part's base (src/layers/arrange.ts). With --steps, one layer per paint step instead, over the whole figure.
 *   node scripts/layers.ts rig output/layers/rig            PSD, layer PNGs, stack.json, and a check that the stack gives the render back
 *   node scripts/layers.ts rig output/layers/rig --clip     also a .clip for CLIP STUDIO PAINT (src/layers/clip.ts), from the bundled template
 *   node scripts/layers.ts rig out --clip --template my.clip --k 2
 * The check composites the stack with CSP's blend formulas and compares it with the render, pixel by pixel.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { inflateSync } from "node:zlib"
import { base, bytes, open } from "./page.ts"
import { decodePng, encodePng } from "../src/layers/png.ts"
import { arrange, checkStack, couldBeOne } from "../src/layers/arrange.ts"
import { compare, composite } from "../src/layers/stack.ts"
import type { Layer, Mode, Stack } from "../src/layers/stack.ts"
import { psd } from "../src/layers/psd.ts"

const args = process.argv.slice(2), flag = (f: string): string | undefined => { const i = args.indexOf(f); return i < 0 ? undefined : args[i + 1] }
const [name, dir] = args
if (!name || !dir) { console.log("node scripts/layers.ts <drawing> <out dir> [--clip] [--template file.clip] [--k 2] [--steps]"); process.exit(1) }
const k = Number(flag("--k") ?? 2)
rmSync(join(dir, "png"), { recursive: true, force: true })
mkdirSync(join(dir, "png"), { recursive: true })

const t0 = Date.now(), { b, p } = await open()
p.setDefaultTimeout(1800000) // recording runs the long loops once per step
await p.goto(`${base}?v=${name}&k=${k}&raw=1&layers=1`)
await p.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
const render = decodePng(bytes(await p.evaluate(() => document.querySelector("canvas")!.toDataURL("image/png"))))
type Meta = { key: string; clip?: boolean; name: string; group: string; mode: Mode; x: number; y: number; w: number; h: number; pixels: number }
const { metas, notes, plan } = await p.evaluate(() => { const r = (window as unknown as { __layers: { out: Array<Meta & { data: Uint8Array }>; notes: Array<string>; folders: Array<[string, string, "fine"?]> | null } }).__layers; return { plan: r.folders, metas: r.out.map(({ data: _, ...m }) => m), notes: r.notes } })
const layers: Array<Layer & { key: string }> = []
for (let i = 0; i < metas.length; i++) {
  const b64 = await p.evaluate((i) => { const d = (window as unknown as { __layers: { out: Array<{ data: Uint8Array }> } }).__layers.out[i]!.data; let s = ""; for (let j = 0; j < d.length; j += 0x8000) s += String.fromCharCode(...d.subarray(j, j + 0x8000)); return btoa(s) }, i)
  const m = metas[i]!
  layers.push({ ...m, opacity: 1, visible: true, rgba: new Uint8Array(inflateSync(Buffer.from(b64, "base64"))) })
}
await b.close()
const { w, h } = render
if (!plan && !args.includes("--steps")) console.log("  this drawing has no `folders`: one layer per paint step")
const made = plan && !args.includes("--steps") ? arrange(layers, plan, w, h) : null
// paper at the bottom, as in a new canvas
const stack: Stack = made ? made.stack : { w, h, layers: [{ name: "Paper", group: "", mode: "normal", opacity: 1, visible: true, x: 0, y: 0, w, h, rgba: new Uint8Array(w * h * 4).fill(255) }, ...layers.filter((L) => !/^(mask|line):/.test(L.key))] }
console.log(`${name}: ${w}x${h}, ${stack.layers.length} layers, in ${Math.round((Date.now() - t0) / 1000)} s`)
for (const n of [...notes.filter((q) => !q.endsWith("empty, dropped")), ...(made?.notes ?? [])]) console.log(`  note: ${n}`)
if (made) { const bad = [...made.problems, ...checkStack(stack, plan!)]; console.log(bad.length ? `  NOT CLEAN, ${bad.length}:` : `  clean: ${new Set(stack.layers.filter((L) => L.group).map((L) => L.group)).size} folders, every part in one, same names and order, all clipped inside their base`); for (const b of bad) console.log(`    ${b}`); for (const c of couldBeOne(stack)) console.log(`  look: ${c}`) }

// the check: does the stack give the render back?
const rgb = new Uint8Array(w * h * 3)
for (let i = 0; i < w * h; i++) for (let c = 0; c < 3; c++) rgb[i * 3 + c] = render.rgba[i * 4 + c]!
const flat8 = composite(stack, true), flatF = composite(stack, false)
const report = (label: string, f: Uint8ClampedArray): string => { const r = compare(f, rgb); return `${label}: max ${r.max}, mean ${r.mean.toFixed(3)}, ${(100 * r.over2 / r.n).toFixed(3)}% of pixels off by more than 2, ${(100 * r.over8 / r.n).toFixed(4)}% by more than 8` }
const check = [report("composited in 8 bit", flat8), report("composited in float", flatF)]
// the outer contour differs by design (the line art lies over the background): inside the figure, 3 px from its edge, it must not
{
  let on = new Uint8Array(w * h)
  for (const L of stack.layers) if (L.group === "Flats" || L.name === "Base") for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (L.rgba[(y * L.w + x) * 4 + 3]) on[(y + L.y) * w + x + L.x] = 1
  for (let r = 0; r < 3; r++) { const n = on.slice(); for (let i = 0; i < w * h; i++) { const x = i % w; if (!on[i] || (x > 0 && !on[i - 1]) || (x < w - 1 && !on[i + 1]) || (i >= w && !on[i - w]) || (i < w * (h - 1) && !on[i + w])) n[i] = 0 } on = n }
  let max = 0, n = 0, over = 0
  for (let i = 0; i < w * h; i++) if (on[i]) { n++; let m = 0; for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(flat8[i * 3 + c]! - rgb[i * 3 + c]!)); if (m > max) max = m; if (m > 2) over++ }
  check.push(`inside the figure, 3 px from its edge: max ${max}, ${((100 * over) / Math.max(1, n)).toFixed(3)}% of pixels off by more than 2`)
}
for (const c of check) console.log(`  ${c}`)
// where they differ, as a picture: grey render, red where off by more than 2
const diff = new Uint8Array(w * h * 4)
for (let i = 0; i < w * h; i++) { let m = 0; for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(flat8[i * 3 + c]! - rgb[i * 3 + c]!)); const l = (rgb[i * 3]! * 0.3 + rgb[i * 3 + 1]! * 0.59 + rgb[i * 3 + 2]! * 0.11) * 0.5 + 120; diff.set(m > 2 ? [255, Math.max(0, 120 - m * 4), 0, 255] : [l, l, l, 255], i * 4) }
writeFileSync(join(dir, "diff.png"), encodePng(diff, w, h))
writeFileSync(join(dir, "render.png"), encodePng(render.rgba, w, h))
const flatRgba = new Uint8Array(w * h * 4)
for (let i = 0; i < w * h; i++) flatRgba.set([flat8[i * 3]!, flat8[i * 3 + 1]!, flat8[i * 3 + 2]!, 255], i * 4)
writeFileSync(join(dir, "flattened.png"), encodePng(flatRgba, w, h))

const safe = (s: string): string => s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()
stack.layers.forEach((L, i) => writeFileSync(join(dir, "png", `${String(i).padStart(3, "0")}-${safe(L.group)}${L.group ? "-" : ""}${safe(L.name)}.png`), encodePng(L.rgba, L.w, L.h)))
writeFileSync(join(dir, "stack.json"), JSON.stringify({ drawing: name, k, w, h, check, notes, layers: stack.layers.map(({ rgba: _, ...m }, i) => ({ index: i, ...m })) }, null, 1))
writeFileSync(join(dir, `${name}.psd`), psd(stack, flat8))
console.log(`  wrote ${join(dir, `${name}.psd`)}`)
if (args.includes("--clip")) {
  const { clip } = await import("../src/layers/clip.ts")
  const template = flag("--template") ?? new URL("../src/layers/template/emptyimage.clip", import.meta.url).pathname
  const out = clip(readFileSync(template), stack, flatRgba)
  writeFileSync(join(dir, `${name}.clip`), out)
  console.log(`  wrote ${join(dir, `${name}.clip`)} (template ${template})`)
}
