import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, test } from "node:test"
import { decodeAnyPng, encodeJpeg, toPng } from "../image.ts"
import { analyze, reviewDir } from "../run.ts"
import type { Critique, ProviderConfig } from "../vlm.ts"
import { watchFolder } from "../watch.ts"
import { figure, makeClip } from "./util.ts"

const dir = mkdtempSync(join(tmpdir(), "critic-test-"))
after(() => rmSync(dir, { recursive: true, force: true }))
const sha = (p: string): string => createHash("sha256").update(readFileSync(p)).digest("hex")
const opts = { ai: false, quiet: true, segmenter: "none" } as const

const answer: Critique = {
  summary: "Readable figure; the lean is the main problem.",
  issues: [
    { id: 1, category: "Silhouette", box_2d: [0.1, 0.3, 0.6, 0.7], diagnosis: "The torso tips right.", actionable_fix: "Rotate the upper body." },
    { id: 2, category: "Value Hierarchy", box_2d: [0.05, 0.05, 0.3, 0.4], diagnosis: "Face and hair share one value.", actionable_fix: "Darken the hair." },
    { id: 3, category: "Tangent", box_2d: [0.8, 0.1, 0.95, 0.4], diagnosis: "The hand touches the frame edge.", actionable_fix: "Crop wider." },
  ],
}
const stubVlm = (): ProviderConfig => ({ kind: "openai", baseURL: "http://vlm.test/v1", model: "stub", fetch: (async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }] }), { status: 200 })) as unknown as typeof fetch })

test("defaults: output goes to _review/<filename>/ next to the input, which is left untouched", async () => {
  const art = join(dir, "art"); mkdirSync(art)
  const src = join(art, "lean.png")
  writeFileSync(src, toPng(figure({ deg: 15 })))
  const before = sha(src)
  const r = await analyze(src, { stage: "render", ...opts })
  assert.equal(r.out, join(art, "_review", "lean.png"))
  assert.equal(reviewDir(src), r.out)
  for (const f of ["review.html", "ai_redline.png", "findings.json", "metrics.json", "views/grey.png", "views/notan.png", "views/saturation.png", "views/silhouette.png", "views/flip.png", "views/squint.png"]) assert.ok(existsSync(join(r.out, f)), `missing ${f}`)
  assert.equal(sha(src), before)
})

test("ai_redline.png matches the input's pixel size exactly, is transparent where nothing is marked, and carries the pins", async () => {
  const src = join(dir, "wide.jpg")
  writeFileSync(src, encodeJpeg(figure({ w: 517, h: 333, rx: 60, ry: 140, deg: 15 })))
  const r = await analyze(src, { stage: "render", ...opts, ai: true, vlm: stubVlm() })
  const red = decodeAnyPng(readFileSync(r.files["ai_redline.png"]!))
  assert.deepEqual([red.w, red.h], [517, 333])
  assert.equal(red.rgba[3], 0)
  // the edge of AI box 1 (x from 0.3 * 517) is drawn opaque
  const x = Math.round(0.3 * 517), y = Math.round(0.35 * 333)
  assert.ok(red.rgba[(y * 517 + x) * 4 + 3]! > 200)
})

test(".clip input: ai_redline.png is at canvas size even when the stored preview is smaller", async () => {
  const src = join(dir, "big.clip")
  writeFileSync(src, makeClip({ w: 600, h: 840 }, toPng(figure())))
  const before = sha(src)
  const r = await analyze(src, { stage: "flats", ...opts, ai: true, vlm: stubVlm() })
  const red = decodeAnyPng(readFileSync(r.files["ai_redline.png"]!))
  assert.deepEqual([red.w, red.h], [600, 840])
  assert.deepEqual(r.findings.find((f) => f.label === "1")!.region, { x: 0.3 * 600, y: 0.1 * 840, w: 0.4 * 600, h: 0.5 * 840 })
  assert.equal(sha(src), before)
})

test("review.html: self-contained, every view in the viewer, pins synced with cards", async () => {
  const src = join(dir, "lean2.png")
  writeFileSync(src, toPng(figure({ deg: 15 })))
  const r = await analyze(src, { stage: "sketch", ...opts, ai: true, vlm: stubVlm() })
  const html = readFileSync(r.files["review.html"]!, "utf8")
  assert.doesNotMatch(html, /(src|href)="(https?:)?\/\//, "nothing loaded from the network")
  assert.doesNotMatch(html, /<link |@import/)
  for (const v of ["original", "grey", "notan", "saturation", "silhouette", "flip", "squint"]) assert.match(html, new RegExp(`data-v="${v}"`), v)
  const data = JSON.parse(html.match(/<script type="application\/json" id="data">(.*?)<\/script>/s)![1]!) as { W: number; H: number; views: Array<{ k: string; src: string | null }>; pins: Array<{ k: string; ai: boolean }> }
  assert.deepEqual([data.W, data.H], [300, 420])
  assert.ok(data.views.filter((v) => v.k !== "original").every((v) => v.src!.startsWith("data:image/")))
  for (const k of ["1", "2", "3"]) { assert.ok(data.pins.some((p) => p.k === k && p.ai)); assert.match(html, new RegExp(`id="c-${k}" data-k="${k}"`)) }
  const m = data.pins.find((p) => !p.ai)
  assert.ok(m && /^M\d+$/.test(m.k), "measured findings are pinned as M1, M2, ...")
  assert.match(html, new RegExp(`id="c-${m!.k}"`))
  assert.match(html, /Readable figure; the lean is the main problem/)
  assert.match(html, /Rotate the upper body/)
})

test("measured findings are deterministic, and the stage changes their weight", async () => {
  const src = join(dir, "lean3.png")
  writeFileSync(src, toPng(figure({ deg: 15 })))
  const a = await analyze(src, { stage: "sketch", ...opts, out: join(dir, "a") }), b = await analyze(src, { stage: "sketch", ...opts, out: join(dir, "b") })
  assert.equal(readFileSync(a.files["findings.json"]!, "utf8"), readFileSync(b.files["findings.json"]!, "utf8"))
  const flats = await analyze(src, { stage: "flats", ...opts, out: join(dir, "c") })
  assert.notEqual(a.findings.find((f) => /leans/.test(f.title))!.severity, "note")
  assert.equal(flats.findings.find((f) => /leans/.test(f.title))!.severity, "note")
})

test("an output path that would land on the input is refused", async () => {
  const d = join(dir, "trap"); mkdirSync(d)
  const src = join(d, "ai_redline.png")
  writeFileSync(src, toPng(figure()))
  const before = sha(src)
  await assert.rejects(analyze(src, { stage: "render", ...opts, out: d }), /refusing to write ai_redline\.png over the input/)
  assert.equal(sha(src), before)
})

test("AI failure keeps the measured review", async () => {
  const src = join(dir, "lean4.png")
  writeFileSync(src, toPng(figure({ deg: 15 })))
  const r = await analyze(src, { stage: "render", ...opts, ai: true, vlm: { kind: "openai", baseURL: "http://vlm.test/v1", model: "m", fetch: (async () => new Response("down", { status: 503 })) as unknown as typeof fetch } })
  assert.equal(r.ai?.ok, false)
  assert.ok(r.findings.some((f) => /leans/.test(f.title)))
  assert.match(readFileSync(r.files["review.html"]!, "utf8"), /AI critique unavailable: HTTP 503/)
})

test("watch: a save is reviewed once it settles; unchanged bytes, other files and _review output are ignored", async () => {
  const wdir = mkdtempSync(join(dir, "watch-"))
  const runs: Array<string> = []
  const w = watchFolder(wdir, async (f) => { runs.push(f) }, { settleMs: 120, pollMs: 100 })
  const settle = async (): Promise<void> => { await new Promise((r) => setTimeout(r, 600)); await w.idle() }
  try {
    const f = join(wdir, "a.png")
    writeFileSync(f, toPng(figure({ w: 40, h: 40 })))
    await settle()
    assert.equal(runs.length, 1)
    writeFileSync(f, toPng(figure({ w: 40, h: 40 })))
    await settle()
    assert.equal(runs.length, 1, "same bytes: no second review")
    mkdirSync(join(wdir, "_review", "a.png"), { recursive: true })
    writeFileSync(join(wdir, "_review", "a.png", "ai_redline.png"), toPng(figure({ w: 40, h: 40, deg: 20 })))
    writeFileSync(join(wdir, "notes.txt"), "ignored")
    await settle()
    assert.equal(runs.length, 1, "our own output never triggers a review")
    writeFileSync(f, toPng(figure({ w: 40, h: 40, deg: 10 })))
    await settle()
    assert.equal(runs.length, 2)
  } finally { w.close() }
})
