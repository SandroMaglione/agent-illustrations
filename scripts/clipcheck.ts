/**
 * Reads .clip files the way CSP would need them: every rule a writer must keep, the layer tree, and a composite of the
 * layers compared with the preview stored in the file (for CSP's own files, the picture CSP itself composited).
 *   node scripts/clipcheck.ts file.clip [more.clip ...] [--render render.png] [--tree] [--out composite.png]
 * Exit 1 when a rule is broken.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { compositeClip, readClip } from "../src/layers/clipread.ts"
import type { ClipLayer } from "../src/layers/clipread.ts"
import { decodePng, encodePng } from "../src/layers/png.ts"

const args = process.argv.slice(2), opt = (f: string): string | undefined => { const i = args.indexOf(f); return i < 0 ? undefined : args[i + 1] }
const files = args.filter((a, i) => !a.startsWith("--") && !["--render", "--out"].includes(args[i - 1] ?? ""))
let failed = 0
const NAMES: Record<number, string> = { 0: "normal", 2: "multiply", 8: "screen", 11: "add", 14: "overlay", 18: "linear light", 30: "pass-through" }
for (const f of files) {
  const c = readClip(readFileSync(f)), skip = new Set<string>()
  const flat = compositeClip(c, skip)
  console.log(`${f}: ${c.w}x${c.h}, ${c.layers.length - 1} layers, ${c.problems.length} problems`)
  for (const p of c.problems.slice(0, 20)) console.log(`  PROBLEM ${p}`)
  if (c.problems.length) failed++
  for (const n of [...skip, ...new Set(c.layers.flatMap((l) => (l.note ? [`${l.note}: ${l.name}`] : [])))].slice(0, 8)) console.log(`  not composited: ${n}`)
  if (args.includes("--tree")) { const show = (L: ClipLayer): void => { for (const k of [...L.kids].reverse()) { console.log(`  ${"  ".repeat(k.depth - 1)}${k.folder ? "[" + k.name + "]" : k.name}  ${NAMES[k.composite] ?? `mode ${k.composite}`}${k.opacity < 1 ? ` ${Math.round(k.opacity * 100)}%` : ""}${k.visible ? "" : " hidden"}`); show(k) } }; show(c.root) }
  // against a picture: same size, or the preview's smaller size by box filter
  const against = (label: string, img: { w: number; h: number; rgba: Uint8Array }): void => {
    const sx = c.w / img.w, sy = c.h / img.h
    let max = 0, sum = 0, over8 = 0
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const v = [0, 0, 0]; let n = 0
      for (let Y = Math.floor(y * sy); Y < Math.floor((y + 1) * sy); Y++) for (let X = Math.floor(x * sx); X < Math.floor((x + 1) * sx); X++) { const i = (Y * c.w + X) * 4, a = flat[i + 3]! / 255; for (let k = 0; k < 3; k++) v[k] = v[k]! + flat[i + k]! * a + 255 * (1 - a); n++ }
      const o = (y * img.w + x) * 4, pa = img.rgba[o + 3]! / 255
      let m = 0
      for (let k = 0; k < 3; k++) { const d = Math.abs(v[k]! / n - (img.rgba[o + k]! * pa + 255 * (1 - pa))); sum += d; if (d > m) m = d }
      if (m > max) max = m
      if (m > 8) over8++
    }
    console.log(`  layers composited vs ${label} (${img.w}x${img.h}): max ${Math.round(max)}, mean ${(sum / (img.w * img.h * 3)).toFixed(3)}, ${(100 * over8 / (img.w * img.h)).toFixed(3)}% off by more than 8`)
  }
  if (c.preview) { let drawn = 0; for (let i = 0; i < c.preview.w * c.preview.h; i++) { const a = c.preview.rgba[i * 4 + 3]!; if (a > 8 && (c.preview.rgba[i * 4]! < 247 || c.preview.rgba[i * 4 + 1]! < 247 || c.preview.rgba[i * 4 + 2]! < 247)) drawn++ } console.log(`  preview: ${(100 * drawn / (c.preview.w * c.preview.h)).toFixed(1)}% of it drawn on`); against("CanvasPreview", c.preview) }
  const r = opt("--render"); if (r) against(r, decodePng(readFileSync(r)))
  const out = opt("--out")
  if (out) { const o = new Uint8Array(c.w * c.h * 4); for (let i = 0; i < c.w * c.h; i++) { const a = flat[i * 4 + 3]! / 255; for (let k = 0; k < 3; k++) o[i * 4 + k] = Math.round(flat[i * 4 + k]! * a + 255 * (1 - a)); o[i * 4 + 3] = 255 } writeFileSync(out, encodePng(o, c.w, c.h)) }
}
process.exit(failed ? 1 : 0)
