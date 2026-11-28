import assert from "node:assert/strict"
import { test } from "node:test"
import Anthropic from "@anthropic-ai/sdk"
import { critique, extractJson, normalizeBox, resolveProvider, validateCritique, type Critique, type CritiqueInput } from "../vlm.ts"
import { figure } from "./util.ts"

const SHOWN = { w: 1000, h: 2000 }
const good: Critique = {
  summary: "The lean is the main problem.",
  issues: [
    { id: 1, category: "Silhouette", box_2d: [0.1, 0.3, 0.6, 0.7], diagnosis: "The torso tips right. It reads as falling.", actionable_fix: "Rotate the upper body with Mesh transformation." },
    { id: 2, category: "Value Hierarchy", box_2d: [0, 0, 0.5, 0.5], diagnosis: "Face and jacket share one value.", actionable_fix: "Darken the jacket with a clipped Multiply layer." },
    { id: 3, category: "Focal Point", box_2d: [0.7, 0.6, 0.9, 0.9], diagnosis: "The bag is the loudest thing.", actionable_fix: "Desaturate the bag." },
  ],
}
const input = (): CritiqueInput => ({ stage: "render", canvas: { w: 1000, h: 2000 }, original: figure({ w: 100, h: 200 }), notan: figure({ w: 100, h: 200 }), saturation: figure({ w: 100, h: 200 }), crops: [{ name: "face", why: "face", box: { x: 300, y: 100, w: 200, h: 200 }, img: figure({ w: 40, h: 40 }) }], measured: [], metrics: { values: { range: 40 } } })

test("schema: a valid answer passes; ids are renumbered by position", () => {
  const v = validateCritique({ ...good, issues: good.issues.map((i, k) => ({ ...i, id: 10 - k })) }, SHOWN)
  assert.ok(v.ok)
  if (v.ok) { assert.deepEqual(v.critique.issues.map((i) => i.id), [1, 2, 3]); assert.ok(v.warnings.some((w) => /renumbered/.test(w))) }
})

test("schema: missing fields, unknown fields and a bad category are rejected", () => {
  const { diagnosis: _d, ...noDiag } = good.issues[0]!
  assert.equal(validateCritique({ ...good, issues: [noDiag] }, SHOWN).ok, false)
  assert.equal(validateCritique({ ...good, extra: 1 }, SHOWN).ok, false)
  assert.equal(validateCritique({ ...good, issues: [{ ...good.issues[0]!, category: "Vibes" }] }, SHOWN).ok, false)
  assert.equal(validateCritique({ summary: "x" }, SHOWN).ok, false)
})

test("schema: more than five issues keep the first five; unusable boxes are dropped with a warning", () => {
  const many = Array.from({ length: 7 }, (_, k) => ({ ...good.issues[0]!, id: k + 1 }))
  const v = validateCritique({ summary: "", issues: [...many, { ...good.issues[0]!, box_2d: [1, 2, 3] }] }, SHOWN)
  assert.ok(v.ok)
  if (v.ok) { assert.equal(v.critique.issues.length, 5); assert.ok(v.warnings.some((w) => /dropped/.test(w))) }
})

test("box_2d: 0..1, 0..1000 and pixel conventions all land in 0..1, corners put right", () => {
  assert.deepEqual(normalizeBox([0.1, 0.2, 0.3, 0.4], SHOWN), [0.1, 0.2, 0.3, 0.4])
  assert.deepEqual(normalizeBox([100, 200, 300, 400], SHOWN), [0.1, 0.2, 0.3, 0.4])
  assert.deepEqual(normalizeBox([400, 100, 1200, 500], SHOWN), [0.2, 0.1, 0.6, 0.5], "a value over 1000: pixels")
  assert.deepEqual(normalizeBox([600, 200, 2000, 400], { w: 1000, h: 4000 }), [0.15, 0.2, 0.5, 0.4], "pixels of the image shown")
  assert.deepEqual(normalizeBox([0.3, 0.4, 0.1, 0.2], SHOWN), [0.1, 0.2, 0.3, 0.4])
  assert.equal(normalizeBox([0.5, 0.5, 0.5, 0.5], SHOWN), null)
})

test("JSON is found inside code fences and chatter", () => {
  assert.deepEqual(extractJson('```json\n{"a": 1}\n```'), { a: 1 })
  assert.deepEqual(extractJson('Sure! Here it is: {"a": {"b": 2}} Hope it helps.'), { a: { b: 2 } })
  assert.throws(() => extractJson("no json here"))
})

test("provider: API_BASE_URL selects the OpenAI-compatible client; MODEL is required there", () => {
  assert.deepEqual(resolveProvider({}, { API_BASE_URL: "http://localhost:11434/v1/", MODEL: "qwen2.5vl:7b", API_KEY: "k" }), { kind: "openai", baseURL: "http://localhost:11434/v1", apiKey: "k", model: "qwen2.5vl:7b" })
  assert.ok("error" in resolveProvider({}, { API_BASE_URL: "http://x/v1" }))
  assert.deepEqual(resolveProvider({}, {}), { kind: "anthropic", model: "claude-opus-5-5" })
  assert.ok("error" in resolveProvider({ provider: "openai" }, {}))
  assert.equal((resolveProvider({ model: "m", apiBase: "http://y/v1" }, {}) as { model: string }).model, "m")
})

type Call = { url: string; headers: Record<string, string>; body: { model: string; messages: Array<{ role: string; content: unknown }>; response_format?: { type: string; json_schema?: { schema: { properties: Record<string, unknown> } } } } }
/** A stub OpenAI-compatible server: each reply is a status and the assistant's message content. */
const server = (replies: Array<[number, string]>, calls: Array<Call>): typeof fetch => (async (url: string, init: RequestInit) => {
  calls.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) })
  const [status, content] = replies[Math.min(calls.length - 1, replies.length - 1)]!
  return status !== 200 ? new Response(content, { status }) : new Response(JSON.stringify({ model: "stub-vlm", choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }] }), { status: 200, headers: { "content-type": "application/json" } })
}) as unknown as typeof fetch

test("OpenAI-compatible: original, notan, saturation and crops are sent with the schema; a fenced 0..1000 answer becomes findings", async () => {
  const calls: Array<Call> = [], answer = { ...good, issues: good.issues.map((i) => ({ ...i, box_2d: i.box_2d.map((v) => v * 1000) })) }
  const r = await critique(input(), { kind: "openai", baseURL: "http://vlm.test/v1", apiKey: "sk-test", model: "qwen2.5vl:7b", fetch: server([[200, "```json\n" + JSON.stringify(answer) + "\n```"]], calls) })
  assert.ok(r.ok, r.ok ? "" : r.reason)
  const c = calls[0]!
  assert.equal(c.url, "http://vlm.test/v1/chat/completions")
  assert.equal(c.headers.authorization, "Bearer sk-test")
  assert.equal(c.body.model, "qwen2.5vl:7b")
  assert.equal(c.body.response_format!.type, "json_schema")
  assert.ok(c.body.response_format!.json_schema!.schema.properties.issues)
  const content = c.body.messages[1]!.content as Array<{ type: string; text?: string }>
  assert.equal(content.filter((p) => p.type === "image_url").length, 4, "original, notan, saturation, one crop")
  const text = content.filter((p) => p.type === "text").map((p) => p.text).join("\n")
  for (const s of ["'original'", "'notan'", "'saturation'", "'crop:face'", "[0.050, 0.300, 0.150, 0.500]", "Stage: RENDER"]) assert.ok(text.includes(s), s)
  if (r.ok) {
    assert.deepEqual(r.findings.map((f) => f.label), ["1", "2", "3"])
    assert.deepEqual(r.findings[0]!.region, { x: 300, y: 200, w: 400, h: 1000 })
    assert.equal(r.findings[0]!.category, "Silhouette")
    assert.equal(r.findings[0]!.fix, good.issues[0]!.actionable_fix)
  }
})

test("OpenAI-compatible: a server that rejects json_schema is retried with json_object, then without", async () => {
  const calls: Array<Call> = []
  const r = await critique(input(), { kind: "openai", baseURL: "http://vlm.test/v1", model: "llava", fetch: server([[400, "response_format not supported"], [422, "nope"], [200, JSON.stringify(good)]], calls) })
  assert.ok(r.ok)
  assert.deepEqual(calls.map((c) => c.body.response_format?.type ?? null), ["json_schema", "json_object", null])
  assert.equal(calls[0]!.headers.authorization, undefined, "no API_KEY, no header")
})

test("OpenAI-compatible: an invalid answer gets one repair turn", async () => {
  const calls: Array<Call> = []
  const r = await critique(input(), { kind: "openai", baseURL: "http://vlm.test/v1", model: "m", fetch: server([[200, '{"summary": "x", "issues": [{"id": 1}]}'], [200, JSON.stringify(good)]], calls) })
  assert.ok(r.ok)
  const repair = calls[1]!.body.messages
  assert.equal(repair.length, 4)
  assert.match(String(repair[3]!.content), /failed validation/)
})

test("OpenAI-compatible: failures become reasons, never crashes", async () => {
  const run = (replies: Array<[number, string]>): ReturnType<typeof critique> => critique(input(), { kind: "openai", baseURL: "http://vlm.test/v1", model: "m", fetch: server(replies, []) })
  const twice = await run([[200, "I think the picture is nice."]])
  assert.ok(!twice.ok && /did not match the schema/.test(twice.reason))
  const auth = await run([[401, "bad key"]])
  assert.ok(!auth.ok && /API_KEY/.test(auth.reason))
  const missing = await run([[404, "model not found"]])
  assert.ok(!missing.ok && /API_BASE_URL/.test(missing.reason))
  const down = await critique(input(), { kind: "openai", baseURL: "http://vlm.test/v1", model: "m", fetch: (async () => { throw new TypeError("fetch failed") }) as unknown as typeof fetch })
  assert.ok(!down.ok && /could not reach/.test(down.reason))
})

test("Claude: the SDK request carries the images, the schema, effort and fallbacks; the answer is validated the same way", async () => {
  const seen: Array<{ headers: Headers; body: Record<string, unknown> }> = []
  const reply = (stop: string, text: string): Anthropic => new Anthropic({
    apiKey: "test-key", baseURL: "http://claude.test", maxRetries: 0,
    fetch: (async (_url: string, init: RequestInit) => {
      seen.push({ headers: new Headers(init.headers), body: JSON.parse(String(init.body)) })
      return new Response(JSON.stringify({ id: "msg_test", type: "message", role: "assistant", model: "claude-opus-5-5", content: [{ type: "text", text }], stop_reason: stop, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200, headers: { "content-type": "application/json" } })
    }) as unknown as typeof fetch,
  })
  const r = await critique(input(), { kind: "anthropic", model: "claude-opus-5-5", client: reply("end_turn", JSON.stringify(good)) })
  assert.ok(r.ok)
  const body = seen[0]!.body as { fallbacks: string; output_config: { effort: string; format: { type: string } }; messages: Array<{ content: Array<{ type: string }> }> }
  assert.equal(body.fallbacks, "default")
  assert.match(seen[0]!.headers.get("anthropic-beta") ?? "", /server-side-fallback-2026-07-01/)
  assert.equal(body.output_config.format.type, "json_schema")
  assert.equal(body.output_config.effort, "high")
  assert.equal(body.messages[0]!.content.filter((c) => c.type === "image").length, 4)
  const refused = await critique(input(), { kind: "anthropic", model: "claude-opus-5-5", client: reply("refusal", "") })
  assert.ok(!refused.ok)
  const junk = await critique(input(), { kind: "anthropic", model: "claude-opus-5-5", client: reply("end_turn", "not json") })
  assert.ok(!junk.ok)
})
