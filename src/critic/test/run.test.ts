import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, test } from "node:test"
import Anthropic from "@anthropic-ai/sdk"
import { decodeAnyPng, toPng } from "../image.ts"
import { analyze } from "../run.ts"
import { buildRequest, critique, type Critique } from "../vlm.ts"
import { watchFolder } from "../watch.ts"
import { figure } from "./util.ts"

const dir = mkdtempSync(join(tmpdir(), "critic-test-"))
after(() => rmSync(dir, { recursive: true, force: true }))

const canned: Critique = {
  overall: "Readable figure; the lean is the main problem.",
  stage_readiness: "needs_work",
  strengths: ["clean outline"],
  issues: [
    { title: "Torso leans off balance", category: "gesture", severity: "major", region: { x: 0.3, y: 0.1, w: 0.4, h: 0.5 }, seen_in: "full", observation: "The torso tips right.", why_it_matters: "It reads as falling.", fix_in_csp: "Rotate the upper body with Mesh transformation.", relates_to_measurement: "principal axis 15°", confidence: 0.9 },
    { title: "Maybe the hands", category: "hands", severity: "major", region: { x: 0.9, y: 0.9, w: 0.5, h: 0.5 }, seen_in: "crop:face", observation: "Hard to tell.", why_it_matters: "", fix_in_csp: "Check hands.", relates_to_measurement: null, confidence: 0.2 },
  ],
  measurement_disagreements: [],
}

/** A real SDK client whose transport is a stub: checks the request the SDK actually serialises, returns a canned answer. */
const fakeClient = (seen: Array<{ url: string; headers: Headers; body: Record<string, unknown> }>, answer: object = { stop_reason: "end_turn", text: JSON.stringify(canned) }): Anthropic =>
  new Anthropic({
    apiKey: "test-key", baseURL: "http://critic.test", maxRetries: 0,
    fetch: (async (url: string, init: RequestInit) => {
      seen.push({ url: String(url), headers: new Headers(init.headers), body: JSON.parse(String(init.body)) })
      const a = answer as { stop_reason: string; text: string }
      return new Response(JSON.stringify({ id: "msg_test", type: "message", role: "assistant", model: "claude-opus-5-5", content: [{ type: "text", text: a.text }], stop_reason: a.stop_reason, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } }), { status: 200, headers: { "content-type": "application/json" } })
    }) as unknown as typeof fetch,
  })

test("end to end without AI: files written, report self-contained, redline at canvas size, deterministic", async () => {
  const src = join(dir, "lean.png")
  writeFileSync(src, toPng(figure({ deg: 15 })))
  const a = await analyze(src, { stage: "render", out: join(dir, "a"), ai: false, quiet: true, segmenter: "none" })
  const b = await analyze(src, { stage: "render", out: join(dir, "b"), ai: false, quiet: true, segmenter: "none" })
  for (const f of ["report.html", "redline.png", "findings.json", "metrics.json", "views/grey.png", "views/notan.png", "views/silhouette.png", "views/flip.png", "views/squint.png", "views/saturation.png"]) assert.ok(a.files[f], `missing ${f}`)
  const html = readFileSync(a.files["report.html"]!, "utf8")
  assert.doesNotMatch(html, /(src|href)="(https?:)?\/\//, "the report must not load anything from the network")
  assert.match(html, /leans right/)
  const red = decodeAnyPng(readFileSync(a.files["redline.png"]!))
  assert.deepEqual([red.w, red.h], [300, 420])
  assert.equal(red.rgba[3], 0, "the redline is transparent where nothing is marked")
  assert.equal(readFileSync(a.files["findings.json"]!, "utf8"), readFileSync(b.files["findings.json"]!, "utf8"))
  assert.ok(a.findings.every((f, i) => f.n === i + 1))
})

test("stage changes the weight: the lean is a note on flats, a finding on sketch", async () => {
  const src = join(dir, "lean.png")
  const flats = await analyze(src, { stage: "flats", out: join(dir, "flats"), ai: false, quiet: true, segmenter: "none" })
  const sketch = await analyze(src, { stage: "sketch", out: join(dir, "sketch"), ai: false, quiet: true, segmenter: "none" })
  assert.equal(flats.findings.find((f) => /leans/.test(f.title))!.severity, "note")
  assert.notEqual(sketch.findings.find((f) => /leans/.test(f.title))!.severity, "note")
})

test("AI critique: the SDK request carries images, schema, effort and fallbacks; the answer becomes numbered findings", async () => {
  const seen: Array<{ url: string; headers: Headers; body: Record<string, unknown> }> = []
  const r = await analyze("examples/layers/rig.clip", { stage: "render", out: join(dir, "clip"), ai: true, quiet: true, segmenter: "none", client: fakeClient(seen) })
  assert.equal(seen.length, 1)
  const body = seen[0]!.body as { model: string; fallbacks: string; output_config: { effort: string; format: { type: string; schema: object } }; messages: Array<{ content: Array<{ type: string }> }> }
  assert.equal(body.model, "claude-opus-5-5")
  assert.equal(body.fallbacks, "default")
  assert.match(seen[0]!.headers.get("anthropic-beta") ?? "", /server-side-fallback-2026-07-01/)
  assert.equal(body.output_config.format.type, "json_schema")
  assert.equal(body.output_config.effort, "high")
  assert.ok(body.messages[0]!.content.filter((c) => c.type === "image").length >= 4, "full, grey, notan and at least one crop")
  assert.ok(r.ai?.ok)
  const ai = r.findings.filter((f) => f.source === "ai")
  assert.equal(ai.length, 2)
  const lean = ai.find((f) => /Torso/.test(f.title))!
  assert.deepEqual(lean.region, { x: 0.3 * 1086, y: 0.1 * 1448, w: 0.4 * 1086, h: 0.5 * 1448 })
  const unsure = ai.find((f) => /hands/.test(f.title))!
  assert.equal(unsure.severity, "note", "low confidence is demoted")
  assert.ok(unsure.region!.x + unsure.region!.w <= 1086 + 1e-6, "regions are clamped to the canvas")
  assert.match(readFileSync(r.files["report.html"]!, "utf8"), /lean is the main problem/)
})

test("AI critique: refusals, bad answers and missing credentials degrade to a reason, never a crash", async () => {
  const input = { stage: "render" as const, canvas: { w: 10, h: 10 }, full: figure({ w: 10, h: 10 }), grey: figure({ w: 10, h: 10 }), notan: figure({ w: 10, h: 10 }), crops: [], measured: [], metrics: {} }
  const refused = await critique(input, { client: fakeClient([], { stop_reason: "refusal", text: "" }) })
  assert.equal(refused.ok, false)
  const junk = await critique(input, { client: fakeClient([], { stop_reason: "end_turn", text: "not json" }) })
  assert.equal(junk.ok, false)
  const saved = { k: process.env.ANTHROPIC_API_KEY, t: process.env.ANTHROPIC_AUTH_TOKEN }
  delete process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_AUTH_TOKEN
  try {
    const none = await critique(input, { client: new Anthropic({ baseURL: "http://critic.test", maxRetries: 0, fetch: (async () => new Response("{}", { status: 401 })) as unknown as typeof fetch }) })
    assert.equal(none.ok, false)
  } finally { if (saved.k) process.env.ANTHROPIC_API_KEY = saved.k; if (saved.t) process.env.ANTHROPIC_AUTH_TOKEN = saved.t }
})

test("AI request states crop positions and the measurements", () => {
  const { content } = buildRequest({ stage: "sketch", canvas: { w: 1000, h: 2000 }, full: figure(), grey: figure(), notan: figure(), crops: [{ name: "face", why: "face", box: { x: 100, y: 200, w: 300, h: 400 }, img: figure({ w: 30, h: 40 }) }], measured: [{ source: "measure", check: "flip", severity: "minor", title: "The figure leans right by 9°", detail: "", evidence: "principal axis 9°" }], metrics: { a: 1 } })
  const text = content.filter((c) => c.type === "text").map((c) => (c as { text: string }).text).join("\n")
  assert.match(text, /Stage: SKETCH/)
  assert.match(text, /crop:face.*x 0\.100, y 0\.100, w 0\.300, h 0\.200/)
  assert.match(text, /leans right by 9°/)
})

test("watch: a saved file is reviewed once it settles, an unchanged save is skipped", async () => {
  const wdir = mkdtempSync(join(dir, "watch-"))
  const runs: Array<string> = []
  const w = watchFolder(wdir, async (f) => { runs.push(f) }, { settleMs: 120, pollMs: 100 })
  try {
    const f = join(wdir, "a.png")
    writeFileSync(f, toPng(figure({ w: 40, h: 40 })))
    await new Promise((r) => setTimeout(r, 600)); await w.idle()
    assert.equal(runs.length, 1)
    writeFileSync(f, toPng(figure({ w: 40, h: 40 })))
    await new Promise((r) => setTimeout(r, 600)); await w.idle()
    assert.equal(runs.length, 1, "same bytes: no second review")
    writeFileSync(f, toPng(figure({ w: 40, h: 40, deg: 10 })))
    writeFileSync(join(wdir, "notes.txt"), "ignored")
    await new Promise((r) => setTimeout(r, 600)); await w.idle()
    assert.equal(runs.length, 2)
  } finally { w.close() }
})
